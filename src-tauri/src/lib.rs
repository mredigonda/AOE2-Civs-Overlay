use tauri::{AppHandle, Emitter, LogicalSize, Manager, WebviewWindow};
use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut, ShortcutState};

/// Ctrl+Alt+` on Windows/Linux, Cmd+Alt+` on macOS: shows or hides the overlay.
fn toggle_shortcut() -> Shortcut {
    let primary = if cfg!(target_os = "macos") {
        Modifiers::SUPER
    } else {
        Modifiers::CONTROL
    };
    Shortcut::new(Some(primary | Modifiers::ALT), Code::Backquote)
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
        let _ = window.set_focus();
        let _ = window.emit("overlay-shown", ());
    }
}

#[tauri::command]
fn hide_overlay(window: WebviewWindow) {
    let _ = window.hide();
}

/// Resizes the window to the content the page measured, capped to the screen.
#[tauri::command]
fn fit_window(window: WebviewWindow, width: f64, height: f64) {
    let (max_w, max_h) = window
        .current_monitor()
        .ok()
        .flatten()
        .map(|m| {
            let size = m.size().to_logical::<f64>(m.scale_factor());
            (size.width * 0.95, size.height * 0.9)
        })
        .unwrap_or((f64::MAX, f64::MAX));
    let _ = window.set_size(LogicalSize::new(width.min(max_w), height.min(max_h)));
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let shortcut = toggle_shortcut();
    tauri::Builder::default()
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, pressed, event| {
                    if pressed == &shortcut && event.state() == ShortcutState::Pressed {
                        toggle_overlay(app);
                    }
                })
                .build(),
        )
        .setup(move |app| {
            use tauri_plugin_global_shortcut::GlobalShortcutExt;
            // No Dock icon and no app switching: it is an overlay, not an app.
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            app.global_shortcut().register(shortcut)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![hide_overlay, fit_window])
        .run(tauri::generate_context!())
        .expect("error while running the overlay");
}
