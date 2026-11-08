//! Dots like on iPhone: is anything using the mic or camera, or recording the screen?
//!
//! Windows tracks this itself (Settings → Privacy → "Recent activity") under
//! `HKCU\…\CapabilityAccessManager\ConsentStore\<capability>`: one key per app with
//! `LastUsedTimeStart`/`LastUsedTimeStop`. Stop = 0 means "in use". Desktop apps
//! sit one level deeper under `NonPackaged`.
//!
//! Screen recording: `graphicsCaptureProgrammatic` (Windows.Graphics.Capture: Discord,
//! Teams, Snipping Tool, OBS depending on source). Older capture paths (DXGI
//! duplication) don't show up there.

use serde::Serialize;
use windows::core::{HSTRING, PCWSTR};
use windows::Win32::Foundation::ERROR_SUCCESS;
use windows::Win32::System::Registry::{RegCloseKey, RegEnumKeyExW, RegOpenKeyExW, RegQueryValueExW, HKEY, HKEY_CURRENT_USER, KEY_READ};

const BASE: &str = r"Software\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore";

#[derive(Serialize, Clone, Debug, Default)]
pub struct Privacy {
    pub mic: bool,
    pub camera: bool,
    pub screen: bool,
    pub mic_apps: Vec<String>,
    pub camera_apps: Vec<String>,
    pub screen_apps: Vec<String>,
}

/// Crest's own entries: its exe path as the consent store spells it (`\` as `#`) and, in the Store build, its
/// package family. Never counted, so the Camera tool does not light the camera dot while the user looks at themself.
struct Own {
    exe: Option<String>,
    family: Option<String>,
}

impl Own {
    fn get() -> &'static Own {
        static OWN: std::sync::OnceLock<Own> = std::sync::OnceLock::new();
        OWN.get_or_init(|| Own {
            exe: std::env::current_exe().ok().map(|p| p.to_string_lossy().replace('\\', "#").to_lowercase()),
            // Fails outside a package, which is every build but the Store one.
            family: windows::ApplicationModel::Package::Current().and_then(|p| p.Id()).and_then(|id| id.FamilyName()).ok().map(|f| f.to_string().to_lowercase()),
        })
    }

    /// `name`: a subkey of `NonPackaged` (an exe path) or of the capability itself (a package family).
    fn is(&self, name: &str, non_packaged: bool) -> bool {
        let mine = if non_packaged { &self.exe } else { &self.family };
        mine.as_deref() == Some(name.to_lowercase().as_str())
    }
}

// async: the registry walk runs off the main thread, which animates the notch.
#[tauri::command(async)]
pub fn privacy_state() -> Privacy {
    let own = Own::get();
    let mic_apps = active_apps("microphone", own);
    let camera_apps = active_apps("webcam", own);
    let screen_apps = active_apps("graphicsCaptureProgrammatic", own);
    Privacy {
        mic: !mic_apps.is_empty(),
        camera: !camera_apps.is_empty(),
        screen: !screen_apps.is_empty(),
        mic_apps,
        camera_apps,
        screen_apps,
    }
}

/// Discovers active applications querying sensor/screen access under ConsentStore
fn active_apps(capability: &str, own: &Own) -> Vec<String> {
    let path = format!(r"{BASE}\\{capability}");
    let mut apps = Vec::new();
    let Some(key) = open(HKEY_CURRENT_USER, &path) else { return apps };
    for name in subkeys(key) {
        let Some(sub) = open(key, &name) else { continue };
        if name == "NonPackaged" {
            for n in subkeys(sub) {
                if !own.is(&n, true) {
                    if let Some(k) = open(sub, &n) {
                        if running_close(k) {
                            apps.push(friendly_app_name(&n));
                        }
                    }
                }
            }
        } else if !own.is(&name, false) {
            if running(sub) {
                apps.push(friendly_package_name(&name));
            }
        }
        close(sub);
    }
    close(key);
    apps.sort();
    apps.dedup();
    apps
}

pub fn friendly_app_name(raw: &str) -> String {
    let clean = raw.replace('\\', "#").replace('/', "#");
    let file = clean.rsplit('#').next().unwrap_or(raw);
    let stem = file.strip_suffix(".exe").or_else(|| file.strip_suffix(".EXE")).unwrap_or(file);
    match stem.to_lowercase().as_str() {
        "obs64" | "obs32" | "obs" => "OBS Studio".to_string(),
        "discord" => "Discord".to_string(),
        "teams" | "ms-teams" => "Microsoft Teams".to_string(),
        "chrome" => "Google Chrome".to_string(),
        "firefox" => "Mozilla Firefox".to_string(),
        "msedge" => "Microsoft Edge".to_string(),
        "slack" => "Slack".to_string(),
        "zoom" => "Zoom".to_string(),
        "code" => "Visual Studio Code".to_string(),
        "spotify" => "Spotify".to_string(),
        other => {
            let mut chars = other.chars();
            match chars.next() {
                None => String::new(),
                Some(f) => f.to_uppercase().collect::<String>() + chars.as_str(),
            }
        }
    }
}

pub fn friendly_package_name(raw: &str) -> String {
    let pkg = raw.split('_').next().unwrap_or(raw);
    let name = pkg.split('.').last().unwrap_or(pkg);
    let mut out = String::new();
    for (i, ch) in name.chars().enumerate() {
        if i > 0 && ch.is_uppercase() {
            out.push(' ');
        }
        out.push(ch);
    }
    if out.is_empty() {
        raw.to_string()
    } else {
        out
    }
}

/// Start set and Stop = 0 → in use.
fn running(key: HKEY) -> bool {
    let start = qword(key, "LastUsedTimeStart");
    let stop = qword(key, "LastUsedTimeStop");
    start.is_some_and(|s| s > 0) && stop == Some(0)
}

fn running_close(key: HKEY) -> bool {
    let r = running(key);
    close(key);
    r
}

fn close(key: HKEY) {
    unsafe {
        let _ = RegCloseKey(key);
    }
}

fn open(parent: HKEY, path: &str) -> Option<HKEY> {
    let mut key = HKEY::default();
    let ok = unsafe { RegOpenKeyExW(parent, &HSTRING::from(path), Some(0), KEY_READ, &mut key) } == ERROR_SUCCESS;
    ok.then_some(key)
}

fn subkeys(key: HKEY) -> Vec<String> {
    let mut out = Vec::new();
    for i in 0.. {
        let mut buf = [0u16; 512];
        let mut len = buf.len() as u32;
        let status = unsafe { RegEnumKeyExW(key, i, Some(windows::core::PWSTR(buf.as_mut_ptr())), &mut len, None, None, None, None) };
        if status != ERROR_SUCCESS {
            break;
        }
        out.push(String::from_utf16_lossy(&buf[..len as usize]));
    }
    out
}

fn qword(key: HKEY, name: &str) -> Option<u64> {
    let mut value = 0u64;
    let mut size = 8u32;
    let name = HSTRING::from(name);
    let status = unsafe { RegQueryValueExW(key, PCWSTR(name.as_ptr()), None, None, Some(&mut value as *mut u64 as *mut u8), Some(&mut size)) };
    (status == ERROR_SUCCESS).then_some(value)
}

#[cfg(test)]
mod tests {

    #[test]
    fn parses_friendly_names() {
        assert_eq!(super::friendly_app_name(r"C:#Program Files#Discord#app-1.0#discord.exe"), "Discord");
        assert_eq!(super::friendly_app_name(r"C:\Users\User\bin\obs64.exe"), "OBS Studio");
        assert_eq!(super::friendly_app_name("zoom.exe"), "Zoom");
        assert_eq!(super::friendly_package_name("Microsoft.WindowsCamera_8wekyb3d8bbwe"), "Windows Camera");
    }

    use super::Own;

    #[test]
    fn own_entries_are_skipped() {
        let own = Own { exe: Some(r"c:#program files#crest#crest.exe".into()), family: Some("andrealo20.crest_abc123".into()) };
        assert!(own.is(r"C:#Program Files#Crest#crest.exe", true));
        assert!(own.is("AndreaLo20.Crest_abc123", false));
        // The exe path only counts under NonPackaged, the family only beside it.
        assert!(!own.is(r"C:#Program Files#Crest#crest.exe", false));
        assert!(!own.is("AndreaLo20.Crest_abc123", true));
        assert!(!own.is(r"C:#Program Files#Zoom#bin#Zoom.exe", true));
        assert!(!own.is("Microsoft.WindowsCamera_8wekyb3d8bbwe", false));
        assert!(!Own { exe: None, family: None }.is("", false));
    }
}
