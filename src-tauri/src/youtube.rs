//! Resolves YouTube video IDs from browser media sessions (YouTube video mirroring).
//! Based on proven reference implementation in Notchly (src-tauri/src/providers/music/youtube.rs).

use std::collections::{HashMap, HashSet};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use serde_json::Value;

const BROWSERS: &[&str] = &[
    "chrome", "edge", "msedge", "brave", "firefox", "opera", "vivaldi", "arc",
];

pub fn is_browser(app_id: &str) -> bool {
    let lower = app_id.to_ascii_lowercase();
    BROWSERS.iter().any(|b| lower.contains(b))
}

#[derive(Default, Clone)]
pub struct YoutubeResolver {
    cache: Arc<Mutex<HashMap<String, Option<String>>>>,
    in_flight: Arc<Mutex<HashSet<String>>>,
    #[allow(dead_code)]
    videos: Arc<Mutex<HashMap<String, bool>>>,
}

impl YoutubeResolver {
    #[allow(dead_code)]
    pub fn is_youtube_video(&self, app_id: &str, title: &str, artist: &str) -> bool {
        if !is_browser(app_id) || title.is_empty() {
            return false;
        }
        let key = format!("{}|{}|{}", app_id, title, artist);
        if let Some(&found) = self.videos.lock().unwrap().get(&key) {
            return found;
        }
        #[cfg(windows)]
        let found = browser_window_shows_youtube_video(title, artist);
        #[cfg(not(windows))]
        let found = false;

        if found {
            let mut videos = self.videos.lock().unwrap();
            if videos.len() > 64 {
                videos.clear();
            }
            videos.insert(key, true);
        }
        found
    }

    pub fn video_id(&self, app_id: &str, title: &str, artist: &str, duration_secs: f64) -> Option<String> {
        if !is_browser(app_id) || title.is_empty() {
            return None;
        }
        let duration_ms = (duration_secs * 1000.0) as u64;
        let key = format!("{}|{}|{}|{}", app_id, title, artist, duration_ms / 1000);
        if let Some(found) = self.cache.lock().unwrap().get(&key) {
            return found.clone();
        }
        if !self.in_flight.lock().unwrap().insert(key.clone()) {
            return None;
        }

        let (t, a) = (title.to_string(), artist.to_string());
        let this = self.clone();
        tauri::async_runtime::spawn(async move {
            #[cfg(windows)]
            let window_says = browser_window_shows_youtube_video(&t, &a);
            #[cfg(not(windows))]
            let window_says = false;

            let found = find_youtube(&t, &a, duration_ms, window_says).await;
            this.cache.lock().unwrap().insert(key.clone(), found);
            this.in_flight.lock().unwrap().remove(&key);
        });
        None
    }
}

async fn find_youtube(title: &str, artist: &str, duration_ms: u64, window_says_youtube: bool) -> Option<String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(8))
        .build()
        .ok()?;

    let query = format!("{title} {artist}");
    let encoded = query.trim().replace(' ', "+");
    let url = format!("https://www.youtube.com/results?search_query={encoded}");
    let res = client
        .get(url)
        .header(
            "User-Agent",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
        )
        .header("Accept-Language", "en-US,en;q=0.9")
        .header("Cookie", "CONSENT=YES+1")
        .send()
        .await
        .ok()?;

    let html = res.text().await.ok()?;
    let wanted = normalize(title);

    for (id, result_title, length) in parse_results(&html) {
        if normalize(&result_title) != wanted {
            continue;
        }
        let duration_matches = duration_ms > 0
            && length.is_some_and(|l| (l as i64 - (duration_ms / 1000) as i64).abs() <= 3);
        if duration_matches || window_says_youtube {
            return Some(id);
        }
    }
    None
}

/// (video id, title, length in seconds) from page ytInitialData
fn parse_results(html: &str) -> Vec<(String, String, Option<u64>)> {
    const MARKER: &str = "var ytInitialData = ";
    let Some(start) = html.find(MARKER).map(|i| i + MARKER.len()) else {
        return vec![];
    };
    let Some(end) = html[start..].find(";</script>").map(|i| start + i) else {
        return vec![];
    };
    let Ok(data) = serde_json::from_str::<Value>(&html[start..end]) else {
        return vec![];
    };
    let mut found = Vec::new();
    collect(&data, &mut found);
    found
}

fn collect(v: &Value, found: &mut Vec<(String, String, Option<u64>)>) {
    if found.len() >= 10 {
        return;
    }
    match v {
        Value::Object(map) => {
            for (key, child) in map {
                if key == "videoRenderer" {
                    if let Some(video) = to_video(child) {
                        found.push(video);
                    }
                } else {
                    collect(child, found);
                }
            }
        }
        Value::Array(items) => items.iter().for_each(|i| collect(i, found)),
        _ => {}
    }
}

fn to_video(r: &Value) -> Option<(String, String, Option<u64>)> {
    let id = r["videoId"]
        .as_str()
        .filter(|id| is_video_id(id))?
        .to_string();
    let title: String = r["title"]["runs"]
        .as_array()?
        .iter()
        .filter_map(|run| run["text"].as_str())
        .collect();
    if title.is_empty() {
        return None;
    }
    let length = r["lengthText"]["simpleText"]
        .as_str()
        .and_then(parse_length);
    Some((id, title, length))
}

pub fn is_video_id(id: &str) -> bool {
    id.len() == 11
        && id
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
}

fn parse_length(text: &str) -> Option<u64> {
    text.split(':').try_fold(0u64, |acc, part| {
        Some(acc * 60 + part.trim().parse::<u64>().ok()?)
    })
}

fn normalize(text: &str) -> String {
    text.trim()
        .to_lowercase()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

#[cfg(windows)]
fn browser_window_shows_youtube_video(media_title: &str, artist: &str) -> bool {
    window_titles()
        .iter()
        .any(|title| window_title_shows_youtube_video(title, media_title, artist))
}

#[cfg(windows)]
fn window_title_shows_youtube_video(window: &str, media_title: &str, artist: &str) -> bool {
    let title = normalize(window);
    let wanted = normalize(media_title);
    let channel = normalize(artist);
    title.contains("youtube")
        && !title.contains("youtube music")
        && (title.contains(&wanted) || (!channel.is_empty() && title.contains(&channel)))
}

#[cfg(windows)]
fn window_titles() -> Vec<String> {
    use windows::core::BOOL;
    use windows::Win32::Foundation::{HWND, LPARAM};
    use windows::Win32::UI::WindowsAndMessaging::{EnumWindows, GetWindowTextW, IsWindowVisible};

    unsafe extern "system" fn each(hwnd: HWND, lparam: LPARAM) -> BOOL {
        unsafe {
            let titles = &mut *(lparam.0 as *mut Vec<String>);
            if IsWindowVisible(hwnd).as_bool() {
                let mut buf = [0u16; 512];
                let len = GetWindowTextW(hwnd, &mut buf) as usize;
                if len > 0 {
                    titles.push(String::from_utf16_lossy(&buf[..len.min(buf.len())]));
                }
            }
        }
        BOOL(1)
    }
    let mut titles: Vec<String> = Vec::new();
    unsafe {
        let _ = EnumWindows(Some(each), LPARAM(&mut titles as *mut Vec<String> as isize));
    }
    titles
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn lengths() {
        assert_eq!(parse_length("4:05"), Some(245));
        assert_eq!(parse_length("1:02:03"), Some(3723));
        assert_eq!(parse_length("live"), None);
    }

    #[test]
    fn ids() {
        assert!(is_video_id("dQw4w9WgXcQ"));
        assert!(!is_video_id("dQw4w9WgXc"));
        assert!(!is_video_id("dQw4w9WgX'Q"));
    }

    #[test]
    #[cfg(windows)]
    fn youtube_video_windows() {
        assert!(window_title_shows_youtube_video(
            "(174) WHAT IS GOING ON IN RADIANT SMP ? | RAWKNEE - YouTube - Google Chrome",
            "WHAT IS GOING ON IN RADIANT SMP ? | RAWKNEE",
            "The RawKnee Live"
        ));
        assert!(window_title_shows_youtube_video(
            "Some Video - YouTube - Microsoft Edge",
            "Some Video",
            ""
        ));
        assert!(!window_title_shows_youtube_video(
            "Song - YouTube Music - Google Chrome",
            "Song",
            "Artist"
        ));
    }

    #[test]
    fn parses_results() {
        let html = r#"<script>var ytInitialData = {"contents":[{"videoRenderer":{"videoId":"dQw4w9WgXcQ","title":{"runs":[{"text":"Never Gonna"},{"text":" Give You Up"}]},"lengthText":{"simpleText":"3:33"}}}]};</script>"#;
        assert_eq!(
            parse_results(html),
            vec![(
                "dQw4w9WgXcQ".to_string(),
                "Never Gonna Give You Up".to_string(),
                Some(213)
            )]
        );
    }
}
