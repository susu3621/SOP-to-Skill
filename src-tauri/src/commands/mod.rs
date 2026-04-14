use serde::de::DeserializeOwned;
use serde_json::Value;
use std::process::Command;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

pub mod config;
pub mod onboarding;
pub mod skill;

pub(crate) const CURRENT_STORAGE_VERSION: u64 = 1;
pub(crate) const CURRENT_APP_VERSION: &str = env!("CARGO_PKG_VERSION");

#[cfg(target_os = "windows")]
const WINDOWS_CREATE_NO_WINDOW: u32 = 0x08000000;

#[cfg_attr(not(any(test, target_os = "windows")), allow(dead_code))]
pub(crate) fn background_command_creation_flags() -> u32 {
    #[cfg(target_os = "windows")]
    {
        WINDOWS_CREATE_NO_WINDOW
    }

    #[cfg(not(target_os = "windows"))]
    {
        0
    }
}

pub(crate) fn configure_background_command(_command: &mut Command) {
    #[cfg(target_os = "windows")]
    {
        _command.creation_flags(background_command_creation_flags());
    }
}

fn strip_optional_utf8_bom(content: &str) -> &str {
    content.strip_prefix('\u{feff}').unwrap_or(content)
}

pub(crate) fn parse_json_with_optional_utf8_bom<T: DeserializeOwned>(
    content: &str,
) -> Result<T, serde_json::Error> {
    serde_json::from_str(strip_optional_utf8_bom(content))
}

pub(crate) fn migrate_storage_metadata(value: &mut Value) -> bool {
    let Some(object) = value.as_object_mut() else {
        return false;
    };

    let mut changed = false;
    let storage_version = object
        .get("storage_version")
        .and_then(Value::as_u64)
        .unwrap_or_default();

    if storage_version < CURRENT_STORAGE_VERSION {
        object.insert(
            "storage_version".to_string(),
            Value::from(CURRENT_STORAGE_VERSION),
        );
        changed = true;
    }

    if storage_version <= CURRENT_STORAGE_VERSION {
        let last_migrated_app_version = object
            .get("last_migrated_app_version")
            .and_then(Value::as_str)
            .unwrap_or_default();

        if last_migrated_app_version != CURRENT_APP_VERSION {
            object.insert(
                "last_migrated_app_version".to_string(),
                Value::from(CURRENT_APP_VERSION),
            );
            changed = true;
        }
    }

    changed
}

#[cfg(test)]
mod tests {
    #[cfg(not(target_os = "windows"))]
    #[test]
    fn background_command_creation_flags_are_disabled_on_non_windows() {
        assert_eq!(super::background_command_creation_flags(), 0);
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn background_command_creation_flags_hide_console_windows() {
        assert_eq!(super::background_command_creation_flags(), 0x08000000);
    }
}
