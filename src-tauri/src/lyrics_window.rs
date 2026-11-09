//! Detached floating synced lyrics card (`lyrics` in tauri.conf.json, page lyrics.html)
//! An always-on-top transparent draggable card that displays synced song lyrics with playback seeking.

use tauri::{AppHandle, Emitter, Manager, PhysicalPosition, WebviewWindow, WebviewWindowBuilder, WindowEvent};

pub const LYRICS_LABEL: &str = "lyrics";
pub const LYRICS_EVENT: &str = "lyrics-window://open";

#[tauri::command]
pub fn is_lyrics_window_open(app: AppHandle) -> bool {
    app.get_webview_window(LYRICS_LABEL).is_some()
}

#[tauri::command]
pub async fn lyrics_window_open(x: Option<i32>, y: Option<i32>, app: AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window(LYRICS_LABEL) {
        let _ = win.set_focus();
        return Ok(());
    }

    let config = app.config().app.windows.iter().find(|w| w.label == LYRICS_LABEL).cloned().ok_or("Lyrics window missing in config")?;
    let win = WebviewWindowBuilder::from_config(&app, &config)
        .map(|b| b.on_navigation(crate::own_page))
        .map(|b| match crate::portable::data_dir() {
            Some(dir) => b.data_directory(dir),
            None => b,
        })
        .and_then(|b| b.build())
        .map_err(|e| e.to_string())?;

    #[cfg(windows)]
    crate::capture::exclude_if_capturing(&app);

    let saved = x.zip(y).filter(|&(px, py)| on_screen(&win, px, py));
    if let Some((px, py)) = saved.or_else(|| default_lyrics_spot(&win)) {
        let _ = win.set_position(PhysicalPosition::new(px, py));
    }
    win.show().map_err(|e| e.to_string())?;

    let handle = app.clone();
    win.on_window_event(move |event| {
        if let WindowEvent::Destroyed = event {
            let _ = handle.emit(LYRICS_EVENT, false);
        }
    });
    let _ = app.emit(LYRICS_EVENT, true);
    Ok(())
}

#[tauri::command]
pub async fn lyrics_window_close(app: AppHandle) -> Result<(), String> {
    match app.get_webview_window(LYRICS_LABEL) {
        Some(win) => win.destroy().map_err(|e| e.to_string()),
        None => Ok(()),
    }
}

fn on_screen(window: &WebviewWindow, x: i32, y: i32) -> bool {
    let grip = 48;
    window.available_monitors().unwrap_or_default().iter().any(|m| {
        let (p, s) = (m.position(), m.size());
        x >= p.x && y >= p.y && x + grip <= p.x + s.width as i32 && y + grip <= p.y + s.height as i32
    })
}

fn default_lyrics_spot(window: &WebviewWindow) -> Option<(i32, i32)> {
    let monitor = window.primary_monitor().ok().flatten()?;
    let size = window.outer_size().ok()?;
    let (p, s, scale) = (monitor.position(), monitor.size(), monitor.scale_factor());
    let margin = (32.0 * scale) as i32;
    Some((p.x + s.width as i32 - size.width as i32 - margin, p.y + (120.0 * scale) as i32))
}
