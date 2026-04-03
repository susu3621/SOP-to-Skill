use serde::Serialize;
use std::sync::Mutex;
use tauri::{AppHandle, Config, State};
use tauri_plugin_updater::{Update, UpdaterExt};

#[derive(Default)]
pub struct PendingAppUpdate(pub Mutex<Option<Update>>);

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppUpdateInfo {
    pub current_version: String,
    pub version: String,
    pub body: Option<String>,
    pub date: Option<String>,
}

pub(crate) fn updater_is_configured(config: &Config) -> bool {
    matches!(config.plugins.0.get("updater"), Some(value) if value.is_object())
}

#[tauri::command]
pub async fn check_app_update(
    app: AppHandle,
    pending_update: State<'_, PendingAppUpdate>,
) -> Result<Option<AppUpdateInfo>, String> {
    if !updater_is_configured(app.config()) {
        *pending_update.0.lock().unwrap() = None;
        return Ok(None);
    }

    let updater = app.updater().map_err(|error| error.to_string())?;
    let update = updater.check().await.map_err(|error| error.to_string())?;
    let info = update.as_ref().map(|pending| AppUpdateInfo {
        current_version: pending.current_version.clone(),
        version: pending.version.clone(),
        body: pending.body.clone(),
        date: pending.date.map(|date| date.to_string()),
    });

    *pending_update.0.lock().unwrap() = update;
    Ok(info)
}

#[tauri::command]
pub async fn install_app_update(
    app: AppHandle,
    pending_update: State<'_, PendingAppUpdate>,
) -> Result<bool, String> {
    if !updater_is_configured(app.config()) {
        return Err("Updater is not configured for this build".to_string());
    }

    let update = {
        let mut guard = pending_update.0.lock().unwrap();
        guard.take()
    };

    let Some(update) = update else {
        return Err("No pending update available".to_string());
    };

    match update
        .download_and_install(|_, _| {}, || {})
        .await
    {
        Ok(_) => {
            app.restart();
        }
        Err(error) => Err(error.to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::updater_is_configured;

    #[test]
    fn updater_is_disabled_when_plugin_config_is_missing() {
        let config = tauri::Config::default();

        assert!(!updater_is_configured(&config));
    }

    #[test]
    fn updater_is_disabled_when_plugin_config_is_null() {
        let mut config = tauri::Config::default();
        config
            .plugins
            .0
            .insert("updater".to_string(), serde_json::Value::Null);

        assert!(!updater_is_configured(&config));
    }

    #[test]
    fn updater_is_enabled_when_plugin_config_is_an_object() {
        let mut config = tauri::Config::default();
        config.plugins.0.insert(
            "updater".to_string(),
            serde_json::json!({
                "pubkey": "test-key",
                "endpoints": ["https://example.com/latest.json"]
            }),
        );

        assert!(updater_is_configured(&config));
    }
}
