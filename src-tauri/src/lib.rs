mod hud;

use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, LogicalPosition, LogicalSize, Manager, WebviewWindow};

/// While you play (following a build order) the overlay never takes the focus:
/// showing it doesn't, and clicking it doesn't either (the window can't become
/// focused: WS_EX_NOACTIVATE on Windows, never the key window on macOS), so the
/// game keeps the keyboard and the mouse. Off when there's something to type in.
static PLAYING: AtomicBool = AtomicBool::new(false);
use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut, ShortcutState};

/// Ctrl+Alt on Windows/Linux, Cmd+Alt on macOS, plus a key.
fn shortcut(key: Code) -> Shortcut {
    let primary = if cfg!(target_os = "macos") {
        Modifiers::SUPER
    } else {
        Modifiers::CONTROL
    };
    Shortcut::new(Some(primary | Modifiers::ALT), key)
}

/// ` shows or hides the overlay.
fn toggle_shortcut() -> Shortcut {
    shortcut(Code::Backquote)
}

/// The build order's keys (next step, previous step, timer), which work while
/// the game has the focus. The page picks them (they can be changed in its
/// settings) and gets them back as the "build-order" event; they never show the
/// overlay or take the focus.
static BUILD_ORDER_KEYS: Mutex<Vec<(Shortcut, String)>> = Mutex::new(Vec::new());

/// Registers the build order's keys, replacing the previous ones: `keys` maps
/// an action ("next", "previous", "timer") to a shortcut such as "F7" or
/// "CmdOrCtrl+Alt+BracketRight"; an empty one means no key. Returns the actions
/// whose key couldn't be used (not a key, or taken by another app).
#[tauri::command]
fn set_build_order_keys(app: AppHandle, keys: HashMap<String, String>) -> Vec<String> {
    use tauri_plugin_global_shortcut::GlobalShortcutExt;
    let shortcuts = app.global_shortcut();
    let mut current = BUILD_ORDER_KEYS.lock().unwrap();
    for (s, _) in current.drain(..) {
        let _ = shortcuts.unregister(s);
    }
    let mut failed = Vec::new();
    for (action, key) in keys {
        if key.is_empty() {
            continue;
        }
        match key.parse::<Shortcut>() {
            Ok(s) if s != toggle_shortcut() && !current.iter().any(|(c, _)| *c == s) && shortcuts.register(s).is_ok() => {
                current.push((s, action))
            }
            _ => failed.push(action),
        }
    }
    failed
}

fn main_window(app: &AppHandle) -> Option<WebviewWindow> {
    app.get_webview_window("main")
}

fn toggle_overlay(app: &AppHandle) {
    let Some(window) = main_window(app) else { return };
    if window.is_visible().unwrap_or(false) {
        let _ = window.hide();
    } else {
        let _ = window.show();
        if !PLAYING.load(Ordering::Relaxed) {
            let _ = window.set_focus();
        }
        let _ = window.emit("overlay-shown", ());
    }
}

/// Reads the game's resource bar off the screen (see hud.rs). `image`: also return
/// what the reader looked at, with its boxes drawn.
#[tauri::command]
async fn hud_read(image: bool) -> serde_json::Value {
    tauri::async_runtime::spawn_blocking(move || hud::read_screen(image)).await.unwrap_or_default()
}

/// Sends the screen and the reading to the Mac that installed the mod.
#[tauri::command]
async fn hud_send_snapshot() -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(hud::send_snapshot).await.map_err(|e| e.to_string())?
}

#[tauri::command]
fn hide_overlay(window: WebviewWindow) {
    let _ = window.hide();
}

/// The page says when you're playing (no focus ever) and when it needs the
/// keyboard (focusable again, and focused so you can type right away).
/// On macOS a window that can't be focused still brings its app to the front
/// when clicked (taking the game out of focus). Non-activating panels avoid it
/// with this AppKit flag, which works on any window.
#[cfg(target_os = "macos")]
fn prevent_activation(window: &WebviewWindow, prevent: bool) {
    use objc2::runtime::{AnyObject, Bool, Sel};
    use objc2::{msg_send, sel};
    let Ok(ptr) = window.ns_window() else { return };
    let ns_window = ptr as *mut AnyObject;
    if ns_window.is_null() {
        return;
    }
    let selector: Sel = sel!(_setPreventsActivation:);
    unsafe {
        let responds: Bool = msg_send![ns_window, respondsToSelector: selector];
        if responds.as_bool() {
            let _: () = msg_send![ns_window, _setPreventsActivation: Bool::new(prevent)];
        }
        // Done typing (a key was picked, a build pasted): give the focus back to
        // the app that had it, the game, instead of waiting for a click on it.
        if prevent {
            let app: *mut AnyObject = msg_send![objc2::class!(NSApplication), sharedApplication];
            let active: Bool = msg_send![app, isActive];
            if active.as_bool() {
                let _: () = msg_send![app, deactivate];
            }
        }
    }
}

#[tauri::command]
fn set_playing(window: WebviewWindow, playing: bool) {
    PLAYING.store(playing, Ordering::Relaxed);
    let _ = window.set_focusable(!playing);
    #[cfg(target_os = "macos")]
    {
        let w = window.clone();
        let _ = window.run_on_main_thread(move || prevent_activation(&w, playing));
    }
    if !playing && window.is_visible().unwrap_or(false) {
        let _ = window.set_focus();
    }
}

/// Resizes the window to the content the page measured, capped to the screen.
/// The top-left corner stays where it was (macOS would keep the bottom edge and
/// grow the window upwards) and the window is kept inside its monitor.
#[tauri::command]
fn fit_window(window: WebviewWindow, width: f64, height: f64) {
    let Some(monitor) = window.current_monitor().ok().flatten() else {
        let _ = window.set_size(LogicalSize::new(width, height));
        return;
    };
    let scale = monitor.scale_factor();
    let area = monitor.size().to_logical::<f64>(scale);
    let origin = monitor.position().to_logical::<f64>(scale);
    let (w, h) = (width.min(area.width * 0.95), height.min(area.height * 0.9));
    let before = window.outer_position().ok().map(|p| p.to_logical::<f64>(scale));
    let _ = window.set_size(LogicalSize::new(w, h));
    if let Some(p) = before {
        let x = p.x.clamp(origin.x, origin.x + area.width - w);
        let y = p.y.clamp(origin.y, origin.y + area.height - h);
        let _ = window.set_position(LogicalPosition::new(x, y));
    }
}

/// At startup (before you're in a game), installs a newer release if there is
/// one and restarts. Releases are signed with the key in tauri.conf.json, so
/// only builds from this project are accepted.
async fn update(app: AppHandle) -> tauri_plugin_updater::Result<()> {
    use tauri_plugin_updater::UpdaterExt;
    if let Some(update) = app.updater()?.check().await? {
        update.download_and_install(|_, _| {}, || {}).await?;
        app.restart();
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let toggle = toggle_shortcut();
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, pressed, event| {
                    if event.state() != ShortcutState::Pressed {
                        return;
                    }
                    if pressed == &toggle {
                        toggle_overlay(app);
                    } else {
                        let action = BUILD_ORDER_KEYS
                            .lock()
                            .unwrap()
                            .iter()
                            .find(|(s, _)| s == pressed)
                            .map(|(_, a)| a.clone());
                        if let Some(action) = action {
                            let _ = app.emit("build-order", action);
                        }
                    }
                })
                .build(),
        )
        .setup(move |app| {
            use tauri_plugin_global_shortcut::GlobalShortcutExt;
            // No Dock icon and no app switching: it is an overlay, not an app.
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            app.global_shortcut().register(toggle)?;
            if !cfg!(debug_assertions) {
                let handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    // No network or no release yet: just keep the current version.
                    let _ = update(handle).await;
                });
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![hide_overlay, fit_window, set_playing, set_build_order_keys, hud_read, hud_send_snapshot])
        .run(tauri::generate_context!())
        .expect("error while running the overlay");
}
