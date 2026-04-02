use serde::Serialize;
use std::sync::Mutex;
use tauri::{AppHandle, State};
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

#[tauri::command]
pub async fn check_app_update(
    app: AppHandle,
    pending_update: State<'_, PendingAppUpdate>,
) -> Result<Option<AppUpdateInfo>, String> {
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
