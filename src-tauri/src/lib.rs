use tauri::{AppHandle, Emitter, LogicalPosition, LogicalSize, Manager, WebviewWindow};
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
    let shortcut = toggle_shortcut();
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
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
            if !cfg!(debug_assertions) {
                let handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    // No network or no release yet: just keep the current version.
                    let _ = update(handle).await;
                });
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![hide_overlay, fit_window])
        .run(tauri::generate_context!())
        .expect("error while running the overlay");
}
