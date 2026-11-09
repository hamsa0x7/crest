//! Picture-in-picture: always-on-top floating YouTube / browser video window.
//! Snaps to screen edges and corners, resizes with mouse wheel (keeping 16:9), and remembers location.

use tauri::{AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, WebviewWindow, WebviewWindowBuilder, WindowEvent};

pub const PIP_LABEL: &str = "pip";
pub const PIP_EVENT: &str = "pip://open";

const DEFAULT_WIDTH: f64 = 400.0;
const MIN_WIDTH: f64 = 240.0;
const MAX_WIDTH: f64 = 960.0;
const SNAP: f64 = 28.0;
const MARGIN: f64 = 16.0;

#[tauri::command]
pub fn is_pip_open(app: AppHandle) -> bool {
    app.get_webview_window(PIP_LABEL).is_some()
}

#[tauri::command]
pub async fn open_pip(x: Option<i32>, y: Option<i32>, width: Option<f64>, app: AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window(PIP_LABEL) {
        let _ = win.set_focus();
        return Ok(());
    }

    let config = app.config().app.windows.iter().find(|w| w.label == PIP_LABEL).cloned().ok_or("Pip window missing in config")?;
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

    let scale = win.scale_factor().unwrap_or(1.0);
    let w = width.unwrap_or(DEFAULT_WIDTH).clamp(MIN_WIDTH, MAX_WIDTH);
    let h = w * 9.0 / 16.0;
    let _ = win.set_size(PhysicalSize::new((w * scale) as u32, (h * scale) as u32));

    let position = match (x, y) {
        (Some(px), Some(py)) if on_screen(&win, px, py) => PhysicalPosition::new(px, py),
        _ => default_pip_spot(&win).unwrap_or(PhysicalPosition::new(100, 100)),
    };
    let _ = win.set_position(position);
    win.show().map_err(|e| e.to_string())?;

    let handle = app.clone();
    win.on_window_event(move |event| {
        if let WindowEvent::Destroyed = event {
            let _ = handle.emit(PIP_EVENT, false);
        }
    });
    let _ = app.emit(PIP_EVENT, true);
    Ok(())
}

#[tauri::command]
pub fn close_pip(app: AppHandle) {
    if let Some(win) = app.get_webview_window(PIP_LABEL) {
        let _ = win.close();
    }
}

/// After a drag: pull the window to nearby edges.
#[tauri::command]
pub fn pip_snap(app: AppHandle) -> Result<(i32, i32), String> {
    let win = app.get_webview_window(PIP_LABEL).ok_or("no pip window")?;
    let (pos, size, scale) = (
        win.outer_position().map_err(|e| e.to_string())?,
        win.outer_size().map_err(|e| e.to_string())?,
        win.scale_factor().map_err(|e| e.to_string())?,
    );
    let mut x = pos.x;
    let mut y = pos.y;
    if let Ok(Some(monitor)) = win.current_monitor() {
        let area = monitor.work_area();
        let (snap, margin) = ((SNAP * scale) as i32, (MARGIN * scale) as i32);
        let (left, top) = (area.position.x + margin, area.position.y + margin);
        let right = area.position.x + area.size.width as i32 - size.width as i32 - margin;
        let bottom = area.position.y + area.size.height as i32 - size.height as i32 - margin;
        if (x - left).abs() < snap {
            x = left;
        } else if (x - right).abs() < snap {
            x = right;
        }
        if (y - top).abs() < snap {
            y = top;
        } else if (y - bottom).abs() < snap {
            y = bottom;
        }
        x = x.clamp(area.position.x, right.max(area.position.x));
        y = y.clamp(area.position.y, bottom.max(area.position.y));
    }
    if (x, y) != (pos.x, pos.y) {
        win.set_position(PhysicalPosition::new(x, y)).map_err(|e| e.to_string())?;
    }
    Ok((x, y))
}

/// Mouse wheel over the video: grow or shrink around its center, keeping 16:9.
#[tauri::command]
pub fn pip_resize(delta: f64, app: AppHandle) -> Result<f64, String> {
    let win = app.get_webview_window(PIP_LABEL).ok_or("no pip window")?;
    let scale = win.scale_factor().map_err(|e| e.to_string())?;
    let old = win.outer_size().map_err(|e| e.to_string())?;
    let pos = win.outer_position().map_err(|e| e.to_string())?;
    let w = (old.width as f64 / scale + delta).clamp(MIN_WIDTH, MAX_WIDTH);
    let new = PhysicalSize::new((w * scale) as u32, (w * 9.0 / 16.0 * scale) as u32);
    win.set_size(new).map_err(|e| e.to_string())?;
    let dx = (new.width as i32 - old.width as i32) / 2;
    let dy = (new.height as i32 - old.height as i32) / 2;
    let _ = win.set_position(PhysicalPosition::new(pos.x - dx, pos.y - dy));
    Ok(w)
}

fn on_screen(window: &WebviewWindow, x: i32, y: i32) -> bool {
    let grip = 48;
    window.available_monitors().unwrap_or_default().iter().any(|m| {
        let (p, s) = (m.position(), m.size());
        x >= p.x && y >= p.y && x + grip <= p.x + s.width as i32 && y + grip <= p.y + s.height as i32
    })
}

fn default_pip_spot(window: &WebviewWindow) -> Option<PhysicalPosition<i32>> {
    let monitor = window.primary_monitor().ok().flatten()?;
    let size = window.outer_size().ok()?;
    let (p, s, scale) = (monitor.position(), monitor.size(), monitor.scale_factor());
    let margin = (MARGIN * scale) as i32;
    Some(PhysicalPosition::new(
        p.x + s.width as i32 - size.width as i32 - margin,
        p.y + s.height as i32 - size.height as i32 - margin,
    ))
}
