use crate::models::AppConfig;
use crate::template::{ensure_directories, get_config_path};
use std::fs;

use super::skill::SkillResult;

/// Load configuration from disk
pub fn load_config() -> AppConfig {
    let config_path = get_config_path();

    if config_path.exists() {
        if let Ok(content) = fs::read_to_string(&config_path) {
            if let Ok(config) = serde_json::from_str(&content) {
                return config;
            }
        }
    }

    AppConfig::default()
}

/// Save configuration to disk
pub fn save_config(config: &AppConfig) -> Result<(), String> {
    let _ = ensure_directories();

    let config_path = get_config_path();
    let content = serde_json::to_string_pretty(config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;

    fs::write(&config_path, content)
        .map_err(|e| format!("Failed to write config: {}", e))?;

    Ok(())
}

/// Get current configuration
#[tauri::command]
pub fn get_config() -> SkillResult<AppConfig> {
    let config = load_config();
    SkillResult::Success { success: config }
}

/// Update configuration
#[tauri::command]
pub fn update_config(
    preferred_locale: Option<String>,
    update_check_interval_hours: Option<u64>,
) -> SkillResult<AppConfig> {
    let mut config = load_config();

    if let Some(locale) = preferred_locale {
        config.preferred_locale = Some(locale);
    }

    if let Some(interval) = update_check_interval_hours {
        config.update_check_interval_hours = interval;
    }

    match save_config(&config) {
        Ok(()) => SkillResult::Success { success: config },
        Err(e) => SkillResult::Error { error: e },
    }
}

/// Get the data directory path
#[tauri::command]
pub fn get_data_directory() -> String {
    dirs::data_dir()
        .expect("Failed to get data directory")
        .join("SkillConfigurator")
        .to_string_lossy()
        .to_string()
}

/// Open the data directory in file manager
#[tauri::command]
pub fn open_data_directory() -> SkillResult<()> {
    let data_dir = dirs::data_dir()
        .expect("Failed to get data directory")
        .join("SkillConfigurator");

    let _ = ensure_directories();

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&data_dir)
            .spawn()
            .map_err(|e| format!("Failed to open directory: {}", e))
            .ok();
    }

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&data_dir)
            .spawn()
            .map_err(|e| format!("Failed to open directory: {}", e))
            .ok();
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        std::process::Command::new("xdg-open")
            .arg(&data_dir)
            .spawn()
            .map_err(|e| format!("Failed to open directory: {}", e))
            .ok();
    }

    SkillResult::Success { success: () }
}
