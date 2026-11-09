//! Video & Audio Downloader via yt-dlp + ffmpeg.
//! Sourced from proven reference implementation in NotchX (Modules/SearchModule.cs).

use std::io::{BufRead, BufReader};
use std::process::{Command, Stdio};
use tauri::{AppHandle, Emitter};

pub fn looks_like_video_url(url: &str) -> bool {
    let lower = url.trim().to_ascii_lowercase();
    let domains = [
        "youtube.com", "youtu.be", "vimeo.com", "x.com", "twitter.com",
        "instagram.com", "tiktok.com", "reddit.com", "twitch.tv", "dailymotion.com",
    ];
    domains.iter().any(|d| lower.contains(d))
}

#[tauri::command]
pub async fn ytdlp_download(url: String, audio_only: bool, app: AppHandle) -> Result<String, String> {
    if !looks_like_video_url(&url) {
        return Err("Not a supported video link".into());
    }

fn get_download_dir() -> std::path::PathBuf {
    #[cfg(windows)]
    {
        use windows::Win32::UI::Shell::{FOLDERID_Downloads, SHGetKnownFolderPath, KF_FLAG_DEFAULT};
        use windows::Win32::System::Com::CoTaskMemFree;
        unsafe {
            if let Ok(p) = SHGetKnownFolderPath(&FOLDERID_Downloads, KF_FLAG_DEFAULT, None) {
                if let Ok(dir) = p.to_string() {
                    CoTaskMemFree(Some(p.0 as _));
                    return std::path::PathBuf::from(dir);
                }
                CoTaskMemFree(Some(p.0 as _));
            }
        }
    }
    std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .map(|p| std::path::PathBuf::from(p).join("Downloads"))
        .unwrap_or_else(|_| std::env::temp_dir())
}
    let download_dir = get_download_dir();
    let out_template = download_dir.join("%(title)s.%(ext)s").to_string_lossy().to_string();

    let mut args = vec!["--newline".to_string(), "-o".to_string(), out_template];
    if audio_only {
        args.push("-x".into());
        args.push("--audio-format".into());
        args.push("mp3".into());
    }
    args.push(url.clone());

    let task_id = format!("video:{}", &uuid_v4()[..8]);
    let tid = task_id.clone();
    let app_handle = app.clone();

    std::thread::spawn(move || {
        let mut cmd = Command::new("yt-dlp");
        cmd.args(&args)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            cmd.creation_flags(CREATE_NO_WINDOW);
        }

        match cmd.spawn() {
            Ok(mut child) => {
                let _ = app_handle.emit("downloads://ytdlp", serde_json::json!({
                    "id": tid,
                    "url": url,
                    "progress": 0.0,
                    "status": "downloading"
                }));

                let mut dest_path: Option<String> = None;
                if let Some(stdout) = child.stdout.take() {
                    let reader = BufReader::new(stdout);
                    for line in reader.lines().map_while(Result::ok) {
                        if line.contains("Destination: ") {
                            if let Some(p) = line.split("Destination: ").nth(1) {
                                dest_path = Some(p.trim().to_string());
                            }
                        } else if line.contains("Merging formats into ") {
                            if let Some(p) = line.split("Merging formats into ").nth(1) {
                                let clean = p.trim().trim_matches('"');
                                dest_path = Some(clean.to_string());
                            }
                        }
                        if let Some(pct) = parse_percent(&line) {
                            let _ = app_handle.emit("downloads://ytdlp", serde_json::json!({
                                "id": tid,
                                "url": url,
                                "progress": pct,
                                "status": "downloading"
                            }));
                        }
                    }
                }

                let status = child.wait().map(|s| s.success()).unwrap_or(false);
                let _ = app_handle.emit("downloads://ytdlp", serde_json::json!({
                    "id": tid,
                    "url": url,
                    "progress": if status { 100.0 } else { 0.0 },
                    "status": if status { "done" } else { "error" },
                    "path": dest_path
                }));
            }
            Err(e) => {
                let _ = app_handle.emit("downloads://ytdlp", serde_json::json!({
                    "id": tid,
                    "url": url,
                    "progress": 0.0,
                    "status": "error",
                    "error": format!("yt-dlp not found or failed: {e}")
                }));
            }
        }
    });

    Ok(task_id)
}

fn parse_percent(line: &str) -> Option<f64> {
    if let Some(idx) = line.find('%') {
        let before = &line[..idx];
        let token = before.split_whitespace().last()?;
        token.parse::<f64>().ok()
    } else {
        None
    }
}

fn uuid_v4() -> String {
    use std::time::SystemTime;
    let now = SystemTime::now().duration_since(SystemTime::UNIX_EPOCH).unwrap_or_default().as_nanos();
    format!("{:016x}", now)
}
