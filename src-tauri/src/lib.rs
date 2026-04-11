mod commands;
mod onboarding;
mod models;
mod template;
mod tray;
mod update;

use commands::skill::SkillState;
use tauri::Manager;
use update::app::{updater_is_configured, PendingAppUpdate};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let context = tauri::generate_context!();
    let updater_enabled = updater_is_configured(context.config());

    // Initialize logging
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .init();

    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(SkillState::default())
        .manage(PendingAppUpdate::default());

    #[cfg(desktop)]
    if updater_enabled {
        builder = builder.plugin(tauri_plugin_updater::Builder::new().build());
    }

    builder
        .setup(|app| {
            // Setup system tray
            if let Err(e) = tray::setup_tray(app.handle()) {
                tracing::error!("Failed to setup tray: {}", e);
            }

            if let Ok(resource_dir) = app.path().resource_dir() {
                if let Err(e) = template::sync_bundled_skills_from_resource_dir(&resource_dir) {
                    tracing::error!("Failed to sync bundled skills: {}", e);
                }
            }

            // Ensure directories exist
            if let Err(e) = template::ensure_directories() {
                tracing::error!("Failed to create directories: {}", e);
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
            // Onboarding commands
            commands::onboarding::get_onboarding_state,
            commands::onboarding::set_onboarding_state,
            commands::onboarding::sync_onboarding_credentials,
            commands::onboarding::get_onboarding_install_preview,
            commands::onboarding::stage_onboarding_generated_packages,
            commands::onboarding::sync_onboarding_installation,
            // Config commands
            commands::config::get_config,
            commands::config::update_config,
            commands::config::get_data_directory,
            commands::config::open_data_directory,
            // Update commands
            update::app::check_app_update,
            update::app::install_app_update,
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
        .run(context)
        .expect("error while running tauri application");
}
