use crate::models::AppConfig;
use crate::template::{ensure_directories, get_config_path, get_data_root, get_logs_dir};
use std::fs;
use std::path::Path;
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

use super::{migrate_storage_metadata, parse_json_with_optional_utf8_bom};
use super::skill::SkillResult;

fn persist_json_value(path: &Path, value: &serde_json::Value) -> Result<(), String> {
    let _ = ensure_directories();
    let content = serde_json::to_string_pretty(value)
        .map_err(|error| format!("Failed to serialize config: {error}"))?;
    fs::write(path, content).map_err(|error| format!("Failed to write config: {error}"))
}

fn current_log_path() -> std::path::PathBuf {
    get_logs_dir().join("app.log")
}

fn default_log_export_file_name() -> String {
    format!(
        "sop-to-skill-log-{}.log",
        chrono::Local::now().format("%Y-%m-%d-%H%M%S")
    )
}

fn copy_log_file_to_destination(source_path: &Path, destination_path: &Path) -> Result<(), String> {
    if !source_path.is_file() {
        return Err("No current log file is available to export.".to_string());
    }

    fs::copy(source_path, destination_path)
        .map_err(|error| format!("Failed to export log file: {error}"))?;
    Ok(())
}

fn export_current_log_with_dialog(app: &AppHandle) -> Result<String, String> {
    let source_path = current_log_path();
    let Some(destination) = app
        .dialog()
        .file()
        .set_title("Export current log")
        .set_file_name(default_log_export_file_name())
        .add_filter("Log files", &["log"])
        .blocking_save_file()
    else {
        return Err("Log export cancelled.".to_string());
    };

    let destination_path = destination
        .into_path()
        .map_err(|error| format!("Failed to resolve export path: {error}"))?;
    copy_log_file_to_destination(&source_path, &destination_path)?;

    Ok(destination_path.to_string_lossy().to_string())
}

/// Load configuration from disk
pub fn load_config() -> AppConfig {
    let config_path = get_config_path();

    if config_path.exists() {
        if let Ok(content) = fs::read_to_string(&config_path) {
            if let Ok(mut value) = parse_json_with_optional_utf8_bom::<serde_json::Value>(&content) {
                let migrated = migrate_storage_metadata(&mut value);

                if migrated {
                    let _ = persist_json_value(&config_path, &value);
                }

                if let Ok(config) = serde_json::from_value(value) {
                    return config;
                }
            }
        }
    }

    AppConfig::default()
}

/// Save configuration to disk
pub fn save_config(config: &AppConfig) -> Result<(), String> {
    let config_path = get_config_path();
    let mut value =
        serde_json::to_value(config).map_err(|error| format!("Failed to serialize config: {error}"))?;
    migrate_storage_metadata(&mut value);
    persist_json_value(&config_path, &value)?;

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
    get_data_root().to_string_lossy().to_string()
}

/// Open the data directory in file manager
#[tauri::command]
pub fn open_data_directory() -> SkillResult<()> {
    let data_dir = get_data_root();

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

#[tauri::command]
pub async fn export_current_log(app: AppHandle) -> SkillResult<String> {
    match tokio::task::spawn_blocking(move || export_current_log_with_dialog(&app)).await {
        Ok(Ok(path)) => SkillResult::Success { success: path },
        Ok(Err(error)) => SkillResult::Error { error },
        Err(error) => SkillResult::Error {
            error: format!("Failed to export log file: {error}"),
        },
    }
}

#[cfg(test)]
mod tests {
    use super::load_config;
    use std::fs;
    use std::path::PathBuf;
    use std::sync::{Mutex, OnceLock};
    use std::time::{SystemTime, UNIX_EPOCH};

    const DATA_DIR_ENV_VAR: &str = "SKILL_CONFIGURATOR_DATA_DIR";

    fn temp_dir(prefix: &str) -> PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("time went backwards")
            .as_nanos();
        let path = std::env::temp_dir().join(format!("config-command-{prefix}-{unique}"));
        fs::create_dir_all(&path).expect("create temp dir");
        path
    }

    fn env_lock() -> &'static Mutex<()> {
        static LOCK: OnceLock<Mutex<()>> = OnceLock::new();
        LOCK.get_or_init(|| Mutex::new(()))
    }

    fn restore_env_var(key: &str, value: Option<String>) {
        match value {
            Some(value) => std::env::set_var(key, value),
            None => std::env::remove_var(key),
        }
    }

    #[test]
    fn load_config_migrates_legacy_config_file_and_rewrites_metadata() {
        let _guard = env_lock().lock().unwrap();
        let data_dir = temp_dir("legacy-migration");
        let config_path = data_dir.join("config.json");
        let original_data_dir = std::env::var(DATA_DIR_ENV_VAR).ok();

        fs::write(
            &config_path,
            r#"{"preferred_locale":"en-US","update_check_interval_hours":4}"#,
        )
        .expect("write legacy config");

        std::env::set_var(DATA_DIR_ENV_VAR, &data_dir);
        let loaded = load_config();
        restore_env_var(DATA_DIR_ENV_VAR, original_data_dir);

        assert_eq!(loaded.preferred_locale.as_deref(), Some("en-US"));
        assert_eq!(loaded.update_check_interval_hours, 4);

        let persisted = fs::read_to_string(&config_path).expect("read migrated config");
        assert!(persisted.contains("\"storage_version\": 1"));
        assert!(persisted.contains(&format!(
            "\"last_migrated_app_version\": \"{}\"",
            env!("CARGO_PKG_VERSION")
        )));
    }

    #[test]
    fn load_config_refreshes_last_migrated_app_version_for_current_schema() {
        let _guard = env_lock().lock().unwrap();
        let data_dir = temp_dir("version-refresh");
        let config_path = data_dir.join("config.json");
        let original_data_dir = std::env::var(DATA_DIR_ENV_VAR).ok();

        fs::write(
            &config_path,
            r#"{"storage_version":1,"last_migrated_app_version":"0.0.1","preferred_locale":"zh-CN","update_check_interval_hours":1}"#,
        )
        .expect("write stale version config");

        std::env::set_var(DATA_DIR_ENV_VAR, &data_dir);
        let _ = load_config();
        restore_env_var(DATA_DIR_ENV_VAR, original_data_dir);

        let persisted = fs::read_to_string(&config_path).expect("read refreshed config");
        assert!(persisted.contains("\"storage_version\": 1"));
        assert!(persisted.contains(&format!(
            "\"last_migrated_app_version\": \"{}\"",
            env!("CARGO_PKG_VERSION")
        )));
        assert!(!persisted.contains("\"last_migrated_app_version\": \"0.0.1\""));
    }

    #[test]
    fn copy_log_file_to_destination_returns_error_when_log_is_missing() {
        let source_path = temp_dir("missing-log").join("app.log");
        let destination_path = temp_dir("missing-log-export").join("export.log");

        let error = super::copy_log_file_to_destination(&source_path, &destination_path)
            .expect_err("missing source log should fail");

        assert_eq!(error, "No current log file is available to export.".to_string());
    }

    #[test]
    fn copy_log_file_to_destination_copies_log_contents() {
        let source_dir = temp_dir("copy-log-source");
        let destination_dir = temp_dir("copy-log-destination");
        let source_path = source_dir.join("app.log");
        let destination_path = destination_dir.join("export.log");

        fs::write(&source_path, "line one\nline two\n").expect("write source log");
        super::copy_log_file_to_destination(&source_path, &destination_path)
            .expect("copy log file");

        assert_eq!(
            fs::read_to_string(&destination_path).expect("read destination log"),
            "line one\nline two\n"
        );
    }
}
