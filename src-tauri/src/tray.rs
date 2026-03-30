use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Emitter, Manager, Runtime,
};

/// Build the system tray menu
pub fn build_tray<R: Runtime>(app: &AppHandle<R>) -> Result<Menu<R>, Box<dyn std::error::Error>> {
    let open = MenuItem::with_id(app, "open", "打开 Skill 管理器", true, None::<&str>)?;
    let check_updates = MenuItem::with_id(app, "check_updates", "检查更新", true, None::<&str>)?;
    let installed = MenuItem::with_id(app, "installed", "已安装 Skills", true, None::<&str>)?;
    let settings = MenuItem::with_id(app, "settings", "设置...", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&open, &check_updates, &installed, &settings, &quit])?;

    Ok(menu)
}

/// Setup the system tray
pub fn setup_tray<R: Runtime>(app: &AppHandle<R>) -> Result<(), Box<dyn std::error::Error>> {
    let menu = build_tray(app)?;

    let mut tray = TrayIconBuilder::new()
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "open" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "check_updates" => {
                // Emit event to frontend to check updates
                let _ = app.emit("tray-check-updates", ());
            }
            "installed" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                    let _ = app.emit("tray-navigate", "/installed");
                }
            }
            "settings" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                    let _ = app.emit("tray-navigate", "/settings");
                }
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        });

    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    } else {
        tracing::warn!("Default window icon not available; building tray without custom icon");
    }

    let _tray = tray.build(app)?;

    Ok(())
}
