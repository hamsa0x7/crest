// No console window in release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Elevated helper call from "Unlock FPS": grant rights and exit. Must run
    // before run(), otherwise single-instance would hand it to the running app.
    let args: Vec<String> = std::env::args().collect();
    // Run by the uninstaller (src-tauri/windows/hooks.nsh).
    #[cfg(windows)]
    if args.get(1).is_some_and(|a| a == "--restore-banners") {
        cupcake_lib::restore_banners();
        std::process::exit(0);
    }
    // Run by the installer and the uninstaller before they close Cupcake (src-tauri/windows/hooks.nsh).
    #[cfg(windows)]
    if args.get(1).is_some_and(|a| a == "--restore-osd") {
        cupcake_lib::restore_osd();
        std::process::exit(0);
    }
    // Run by the uninstaller before it closes Cupcake (src-tauri/windows/hooks.nsh).
    #[cfg(windows)]
    if args.get(1).is_some_and(|a| a == "--restore-taskbar") {
        cupcake_lib::restore_taskbar();
        std::process::exit(0);
    }
    #[cfg(windows)]
    if let [_, flag, value] = args.as_slice() {
        if flag == "--fps-unlock" {
            std::process::exit(cupcake_lib::fps_elevated_unlock(value));
        }
        // Started by Cupcake while it hides the Windows volume indicator: restores it once Cupcake ends (value: its pid).
        if flag == "--osd-guard" {
            std::process::exit(cupcake_lib::osd_guard(value));
        }
        // Started by Cupcake while its bar stands in for Windows' taskbar: gives the taskbar back once Cupcake ends (value: its pid).
        if flag == "--taskbar-guard" {
            std::process::exit(cupcake_lib::taskbar_guard(value));
        }
    }
    // A portable copy that just updated itself waits for the old process to exit first.
    cupcake_lib::portable::after_update(&args);
    cupcake_lib::run()
}
