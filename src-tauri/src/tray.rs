use crate::AppLifecycleState;
use std::sync::atomic::Ordering;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{TrayIcon, TrayIconBuilder},
    AppHandle, Manager, Runtime,
};

const DEFAULT_TRAY_ID: &str = "main";
const TRAY_OPEN_ITEM_ID: &str = "open";
const TRAY_QUIT_ITEM_ID: &str = "quit";
const TRAY_MENU_ENTRIES: [(&str, &str); 2] =
    [(TRAY_OPEN_ITEM_ID, "打开"), (TRAY_QUIT_ITEM_ID, "退出")];

fn default_tray_id() -> &'static str {
    DEFAULT_TRAY_ID
}

fn tray_menu_entries() -> &'static [(&'static str, &'static str)] {
    &TRAY_MENU_ENTRIES
}

fn tray_open_item_id() -> &'static str {
    TRAY_OPEN_ITEM_ID
}

fn tray_quit_item_id() -> &'static str {
    TRAY_QUIT_ITEM_ID
}

fn open_main_window<R: Runtime>(app: &AppHandle<R>) {
    if let Some(window) = app.get_webview_window(default_tray_id()) {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

fn mark_app_as_quitting<R: Runtime>(app: &AppHandle<R>) {
    app.state::<AppLifecycleState>()
        .is_quitting
        .store(true, Ordering::SeqCst);
}

/// Build the system tray menu
pub fn build_tray<R: Runtime>(app: &AppHandle<R>) -> Result<Menu<R>, Box<dyn std::error::Error>> {
    let (open_id, open_label) = tray_menu_entries()[0];
    let (quit_id, quit_label) = tray_menu_entries()[1];
    let open = MenuItem::with_id(app, open_id, open_label, true, None::<&str>)?;
    let quit = MenuItem::with_id(app, quit_id, quit_label, true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&open, &quit])?;

    Ok(menu)
}

fn bind_tray_menu<R: Runtime>(
    tray: &TrayIcon<R>,
    menu: Menu<R>,
) -> Result<(), Box<dyn std::error::Error>> {
    tray.set_menu(Some(menu))?;
    tray.set_show_menu_on_left_click(true)?;
    tray.on_menu_event(|app, event| match event.id.as_ref() {
        id if id == tray_open_item_id() => {
            open_main_window(app);
        }
        id if id == tray_quit_item_id() => {
            mark_app_as_quitting(app);
            app.exit(0);
        }
        _ => {}
    });

    Ok(())
}

/// Setup the system tray
pub fn setup_tray<R: Runtime>(app: &AppHandle<R>) -> Result<(), Box<dyn std::error::Error>> {
    let menu = build_tray(app)?;

    if let Some(existing_tray) = app.tray_by_id(default_tray_id()) {
        tracing::info!("Reusing default tray icon and attaching application menu");
        return bind_tray_menu(&existing_tray, menu);
    }

    let mut tray = TrayIconBuilder::with_id(default_tray_id())
        .menu(&menu)
        .show_menu_on_left_click(true);

    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    } else {
        tracing::warn!("Default window icon not available; building tray without custom icon");
    }

    let created_tray = tray.build(app)?;
    bind_tray_menu(&created_tray, menu)?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{default_tray_id, tray_menu_entries, tray_open_item_id, tray_quit_item_id};
    use serde_json::Value;

    #[test]
    fn tray_menu_keeps_open_then_quit_actions() {
        assert_eq!(tray_menu_entries(), &[("open", "打开"), ("quit", "退出")]);
    }

    #[test]
    fn tray_open_item_id_stays_stable() {
        assert_eq!(tray_open_item_id(), "open");
    }

    #[test]
    fn tray_quit_item_id_stays_stable() {
        assert_eq!(tray_quit_item_id(), "quit");
    }

    #[test]
    fn tauri_default_tray_id_matches_runtime_lookup_id() {
        let config: Value =
            serde_json::from_str(include_str!("../tauri.conf.json")).expect("valid tauri config");
        let configured_id = config
            .pointer("/app/trayIcon/id")
            .and_then(Value::as_str)
            .unwrap_or("main");

        assert_eq!(configured_id, default_tray_id());
    }
}
