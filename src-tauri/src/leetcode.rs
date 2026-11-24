//! LeetCode problem stats & submission calendar, read-only.
//!
//! Uses LeetCode's public GraphQL endpoint `https://leetcode.com/graphql`.
//! Cached for an hour per user.
//! Errors: no-user, not-found, rate-limited, offline, parse, failed.

use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};
use tauri::State;

use crate::{net_error, now_ms};

const CACHE: Duration = Duration::from_secs(3500);
const MIN_FORCED: Duration = Duration::from_secs(60);

#[derive(Clone, Serialize, PartialEq, Debug)]
pub struct Day {
    date: String,
    count: u32,
    level: u8,
}

#[derive(Clone, Serialize, Default, Debug, PartialEq)]
pub struct Solved {
    all: u32,
    easy: u32,
    medium: u32,
    hard: u32,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LeetcodeStats {
    user: String,
    ranking: Option<u64>,
    solved: Solved,
    days: Vec<Day>,
    fetched_at: u64,
}

#[derive(Default)]
pub struct LeetcodeState(Mutex<Option<(String, Instant, LeetcodeStats)>>);

/// LeetCode usernames: letters, numbers, hyphens, and underscores, up to 30 characters.
fn valid_user(user: &str) -> bool {
    !user.is_empty()
        && user.len() <= 30
        && user
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_')
}

/// Opens the user's LeetCode profile in the browser.
#[tauri::command]
pub fn leetcode_open_profile(user: String) -> Result<(), String> {
    let user = user.trim();
    if !valid_user(user) {
        return Err("not-found".into());
    }
    crate::open_url(&format!("https://leetcode.com/u/{user}"))
}

#[tauri::command]
pub async fn leetcode_stats(
    user: String,
    force: bool,
    state: State<'_, LeetcodeState>,
) -> Result<LeetcodeStats, String> {
    let user = user.trim().to_string();
    if user.is_empty() {
        return Err("no-user".into());
    }
    if !valid_user(&user) {
        return Err("not-found".into());
    }
    if let Some((cached_user, at, data)) = state.0.lock().unwrap().as_ref() {
        let max_age = if force { MIN_FORCED } else { CACHE };
        if cached_user.eq_ignore_ascii_case(&user) && at.elapsed() < max_age {
            return Ok(data.clone());
        }
    }

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(12))
        .user_agent("Crest")
        .build()
        .map_err(|_| "failed".to_string())?;

    let stats = fetch_api(&client, &user).await?;
    *state.0.lock().unwrap() = Some((user, Instant::now(), stats.clone()));
    Ok(stats)
}

fn date_str(ts_secs: i64) -> String {
    if let Ok(ts) = jiff::Timestamp::from_second(ts_secs) {
        ts.to_zoned(jiff::tz::TimeZone::UTC).strftime("%Y-%m-%d").to_string()
    } else {
        String::new()
    }
}

pub(crate) fn parse_calendar_days(calendar_json: &str, now_ms: u64) -> Result<Vec<Day>, String> {
    let raw: HashMap<String, u32> = serde_json::from_str(calendar_json).map_err(|_| "parse".to_string())?;
    let mut by_date: HashMap<String, u32> = HashMap::new();
    for (sec_str, count) in raw {
        if let Ok(sec) = sec_str.parse::<i64>() {
            let d = date_str(sec);
            if !d.is_empty() {
                *by_date.entry(d).or_insert(0) += count;
            }
        }
    }

    let now_secs = (now_ms / 1000) as i64;
    let today_ts = now_secs - (now_secs.rem_euclid(86400));
    let mut days = Vec::with_capacity(371);

    for i in (0..371).rev() {
        let day_ts = today_ts - i * 86400;
        let date = date_str(day_ts);
        let count = by_date.get(&date).copied().unwrap_or(0);
        let level = if count == 0 {
            0
        } else if count == 1 {
            1
        } else if count <= 3 {
            2
        } else if count <= 6 {
            3
        } else {
            4
        };
        days.push(Day { date, count, level });
    }

    Ok(days)
}

#[derive(Deserialize)]
struct GqlResponse {
    data: Option<GqlData>,
    #[allow(dead_code)]
    errors: Option<Vec<GqlError>>,
}

#[derive(Deserialize)]
struct GqlError {
    #[allow(dead_code)]
    message: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct GqlData {
    matched_user: Option<MatchedUser>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct MatchedUser {
    #[allow(dead_code)]
    username: String,
    profile: Option<UserProfile>,
    submit_stats_global: Option<SubmitStatsGlobal>,
    submission_calendar: Option<String>,
}

#[derive(Deserialize)]
struct UserProfile {
    ranking: Option<u64>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SubmitStatsGlobal {
    ac_submission_num: Option<Vec<DifficultyCount>>,
}

#[derive(Deserialize)]
struct DifficultyCount {
    difficulty: String,
    count: u32,
}

async fn fetch_api(client: &reqwest::Client, user: &str) -> Result<LeetcodeStats, String> {
    let query = r#"query userProfile($username: String!) {
  matchedUser(username: $username) {
    username
    profile { ranking }
    submitStatsGlobal {
      acSubmissionNum { difficulty count }
    }
    submissionCalendar
  }
}"#;

    let body = serde_json::json!({
        "query": query,
        "variables": { "username": user }
    });

    let resp = client
        .post("https://leetcode.com/graphql")
        .json(&body)
        .send()
        .await
        .map_err(net_error)?;

    if resp.status() == reqwest::StatusCode::TOO_MANY_REQUESTS {
        return Err("rate-limited".into());
    }

    if !resp.status().is_success() {
        return Err("failed".into());
    }

    let parsed: GqlResponse = resp.json().await.map_err(|_| "parse".to_string())?;

    if let Some(data) = parsed.data {
        if let Some(matched) = data.matched_user {
            let ranking = matched.profile.and_then(|p| p.ranking);
            let mut solved = Solved::default();

            if let Some(sub) = matched.submit_stats_global {
                if let Some(nums) = sub.ac_submission_num {
                    for item in nums {
                        match item.difficulty.to_ascii_lowercase().as_str() {
                            "all" => solved.all = item.count,
                            "easy" => solved.easy = item.count,
                            "medium" => solved.medium = item.count,
                            "hard" => solved.hard = item.count,
                            _ => {}
                        }
                    }
                }
            }

            let cal_str = matched.submission_calendar.ok_or_else(|| "parse".to_string())?;
            let fetched_at = now_ms();
            let days = parse_calendar_days(&cal_str, fetched_at)?;

            return Ok(LeetcodeStats {
                user: user.to_string(),
                ranking,
                solved,
                days,
                fetched_at,
            });
        }
    }

    Err("not-found".into())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn checks_user_names() {
        assert!(valid_user("octocat"));
        assert!(valid_user("user_123"));
        assert!(valid_user("user-name"));
        assert!(!valid_user(""));
        assert!(!valid_user("user/name"));
        assert!(!valid_user("user name"));
        assert!(!valid_user("../secret"));
        assert!(!valid_user(&"a".repeat(31)));
    }

    #[test]
    fn parses_submission_calendar() {
        // 1700000000 is 2023-11-14 22:13:20 UTC
        let cal = r#"{"1700000000": 3}"#;
        // Mock current time: 1700006400000 (2023-11-15 UTC)
        let days = parse_calendar_days(cal, 1700006400 * 1000).expect("parses calendar");
        assert_eq!(days.len(), 371);
        let active_day = days.iter().find(|d| d.date == "2023-11-14");
        assert!(active_day.is_some());
        let d = active_day.unwrap();
        assert_eq!(d.count, 3);
        assert_eq!(d.level, 2);
    }

    #[test]
    fn rejects_unparsable_calendar() {
        assert_eq!(parse_calendar_days("invalid json", 1000).unwrap_err(), "parse");
    }
}
