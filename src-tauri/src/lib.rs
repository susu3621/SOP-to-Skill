mod commands;
mod models;
mod template;
mod tray;
mod update;

use commands::skill::SkillState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize logging
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(SkillState::default())
        .setup(|app| {
            // Setup system tray
            if let Err(e) = tray::setup_tray(app.handle()) {
                tracing::error!("Failed to setup tray: {}", e);
            }

            // Ensure directories exist
            if let Err(e) = template::ensure_directories() {
                tracing::error!("Failed to create directories: {}", e);
            }

            // Hide window on startup (tray-only mode)
            if let Some(window) = app.get_webview_window("main") {
                window.hide().ok();
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Skill commands
            commands::skill::list_skills,
            commands::skill::get_skill,
            commands::skill::install_skill,
            commands::skill::uninstall_skill,
            commands::skill::list_installed,
            commands::skill::get_target_apps,
            // Config commands
            commands::config::get_config,
            commands::config::update_config,
            commands::config::get_data_directory,
            commands::config::open_data_directory,
            // Update commands
            update::github::check_skill_updates,
            update::github::check_app_updates,
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // Hide window instead of closing (for tray-only mode)
                window.hide().ok();
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
