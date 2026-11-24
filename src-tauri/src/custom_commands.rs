//! Custom modular extension commands for Cupcake.
//! Isolates fork additions so upstream lib.rs stays clean and easily mergeable.

#[path = "pip.rs"]
pub mod pip;

#[path = "lyrics_window.rs"]
pub mod lyrics_window;

#[path = "ytdlp.rs"]
pub mod ytdlp;

#[path = "youtube.rs"]
pub mod youtube;

/// Returns true if the command is allowed for a custom window label.
pub fn is_custom_window_allowed(window: &str, command: &str) -> bool {
    match window {
        "pip" => matches!(command, "close_pip" | "pip_snap" | "pip_resize" | "media_control" | "media_get"),
        "lyrics" => matches!(command, "lyrics_window_close" | "media_control" | "media_get"),
        _ => false,
    }
}
