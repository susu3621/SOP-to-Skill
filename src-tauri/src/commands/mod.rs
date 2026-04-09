use serde::de::DeserializeOwned;

pub mod config;
pub mod onboarding;
pub mod skill;

fn strip_optional_utf8_bom(content: &str) -> &str {
    content.strip_prefix('\u{feff}').unwrap_or(content)
}

pub(crate) fn parse_json_with_optional_utf8_bom<T: DeserializeOwned>(
    content: &str,
) -> Result<T, serde_json::Error> {
    serde_json::from_str(strip_optional_utf8_bom(content))
}
