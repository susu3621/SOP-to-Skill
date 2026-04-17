use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Runtime,
};

const TRAY_QUIT_ITEM_ID: &str = "quit";
const TRAY_MENU_ENTRIES: [(&str, &str); 1] = [(TRAY_QUIT_ITEM_ID, "退出")];

fn tray_menu_entries() -> &'static [(&'static str, &'static str)] {
    &TRAY_MENU_ENTRIES
}

fn tray_quit_item_id() -> &'static str {
    TRAY_QUIT_ITEM_ID
}

/// Build the system tray menu
pub fn build_tray<R: Runtime>(app: &AppHandle<R>) -> Result<Menu<R>, Box<dyn std::error::Error>> {
    let (quit_id, quit_label) = tray_menu_entries()[0];
    let quit = MenuItem::with_id(app, quit_id, quit_label, true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&quit])?;

    Ok(menu)
}

/// Setup the system tray
pub fn setup_tray<R: Runtime>(app: &AppHandle<R>) -> Result<(), Box<dyn std::error::Error>> {
    let menu = build_tray(app)?;

    let mut tray = TrayIconBuilder::new()
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| match event.id.as_ref() {
            id if id == tray_quit_item_id() => {
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

#[cfg(test)]
mod tests {
    use super::{tray_menu_entries, tray_quit_item_id};

    #[test]
    fn tray_menu_only_keeps_quit_action() {
        assert_eq!(tray_menu_entries(), &[("quit", "退出")]);
    }

    #[test]
    fn tray_quit_item_id_stays_stable() {
        assert_eq!(tray_quit_item_id(), "quit");
    }
}
