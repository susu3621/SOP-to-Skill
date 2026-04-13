use serde::de::DeserializeOwned;
use serde_json::Value;

pub mod config;
pub mod onboarding;
pub mod skill;

pub(crate) const CURRENT_STORAGE_VERSION: u64 = 1;
pub(crate) const CURRENT_APP_VERSION: &str = env!("CARGO_PKG_VERSION");

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
