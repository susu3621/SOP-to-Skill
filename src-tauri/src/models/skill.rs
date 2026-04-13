use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Localized text supporting multiple languages
pub type LocalizedText = HashMap<String, String>;

/// Supported target application identifiers
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "kebab-case")]
pub enum TargetAppId {
    ClaudeCode,
    Codex,
    #[serde(rename = "workbuddy")]
    WorkBuddy,
}

impl TargetAppId {
    pub fn as_str(&self) -> &'static str {
        match self {
            TargetAppId::ClaudeCode => "claude-code",
            TargetAppId::Codex => "codex",
            TargetAppId::WorkBuddy => "workbuddy",
        }
    }

    pub fn output_path_macos(&self, skill_id: &str) -> String {
        match self {
            TargetAppId::ClaudeCode => format!("~/.claude/skills/{}.md", skill_id),
            TargetAppId::Codex => format!("~/.codex/instructions/{}.md", skill_id),
            TargetAppId::WorkBuddy => format!("~/.workbuddy/skills/{}.json", skill_id),
        }
    }

    #[cfg(any(target_os = "windows", test))]
    pub fn output_path_windows(&self, skill_id: &str) -> String {
        match self {
            TargetAppId::ClaudeCode => {
                format!(r"%USERPROFILE%\.claude\skills\{}.md", skill_id)
            }
            TargetAppId::Codex => format!(r"%USERPROFILE%\.codex\instructions\{}.md", skill_id),
            TargetAppId::WorkBuddy => format!(r"%USERPROFILE%\.workbuddy\skills\{}.json", skill_id),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::TargetAppId;

    #[test]
    fn workbuddy_output_paths_use_dot_workbuddy_directory() {
        assert_eq!(
            TargetAppId::WorkBuddy.output_path_macos("mail"),
            "~/.workbuddy/skills/mail.json"
        );
        assert_eq!(
            TargetAppId::WorkBuddy.output_path_windows("mail"),
            r"%USERPROFILE%\.workbuddy\skills\mail.json"
        );
    }
}

/// Variable type for template variables
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum VariableType {
    Text,
    Path,
    Select,
    Number,
}

/// Template variable definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateVariable {
    pub id: String,
    pub label: LocalizedText,
    #[serde(default)]
    pub placeholder: Option<LocalizedText>,
    #[serde(rename = "type", default = "default_variable_type")]
    pub var_type: VariableType,
    #[serde(default)]
    pub required: bool,
    #[serde(default)]
    pub default: Option<String>,
    #[serde(default)]
    pub options: Vec<SelectOption>,
}

fn default_variable_type() -> VariableType {
    VariableType::Text
}

/// Select option for variables with type "select"
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SelectOption {
    pub value: String,
    pub label: LocalizedText,
}

/// Target configuration for rendering
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TargetConfig {
    pub app_id: TargetAppId,
    pub output_path: String,
    pub file_format: FileFormat,
    pub template_file: String,
}

/// Output file format
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum FileFormat {
    Markdown,
    Json,
}

/// Installation strategy for a skill
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum InstallStrategy {
    TemplateFile,
    DirectoryPackage,
}

fn default_install_strategy() -> InstallStrategy {
    InstallStrategy::TemplateFile
}

/// Template source type
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "kebab-case")]
pub enum TemplateSource {
    Github { url: String, path: String },
    Local { path: String },
}

/// Skill template metadata (from template.yaml)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillTemplate {
    pub id: String,
    pub name: LocalizedText,
    #[serde(default)]
    pub description: Option<LocalizedText>,
    #[serde(default)]
    pub category: Option<String>,
    pub version: String,
    #[serde(default)]
    pub author: Option<String>,
    #[serde(default)]
    pub source: Option<TemplateSource>,
    #[serde(default = "default_install_strategy")]
    pub install_strategy: InstallStrategy,
    pub targets: Vec<TargetConfig>,
    #[serde(default)]
    pub variables: Vec<TemplateVariable>,
}

/// Repository-managed manifest for directory-packaged skills.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillManifest {
    #[serde(rename = "schemaVersion")]
    pub schema_version: u32,
    pub skills: Vec<SkillManifestEntry>,
}

/// Version metadata for one skill inside the repository manifest.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillManifestEntry {
    pub id: String,
    pub path: String,
    pub version: String,
    #[serde(default)]
    pub targets: Vec<TargetAppId>,
    #[serde(default)]
    pub category: Option<String>,
    #[serde(rename = "contentHash")]
    pub content_hash: String,
}

/// Installed skill state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstalledSkill {
    pub skill_id: String,
    pub app_id: TargetAppId,
    pub installed_version: String,
    pub installed_at: chrono::DateTime<chrono::Utc>,
    pub output_path: String,
    pub variables: HashMap<String, String>,
}

/// Update status for a skill
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum UpdateStatus {
    UpToDate,
    UpdateAvailable { latest_version: String },
    Unknown,
}

/// Global application configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    #[serde(default = "default_check_interval")]
    pub update_check_interval_hours: u64,
    #[serde(default)]
    pub last_update_check: Option<chrono::DateTime<chrono::Utc>>,
    #[serde(default)]
    pub preferred_locale: Option<String>,
}

fn default_check_interval() -> u64 {
    1 // 1 hour default
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            update_check_interval_hours: default_check_interval(),
            last_update_check: None,
            preferred_locale: Some("zh-CN".to_string()),
        }
    }
}

/// Error type for skill operations
#[derive(Debug, thiserror::Error)]
pub enum SkillError {
    #[error("Template not found: {0}")]
    TemplateNotFound(String),

    #[error("Failed to load template: {0}")]
    LoadError(#[from] std::io::Error),

    #[error("Failed to parse template YAML: {0}")]
    ParseError(#[from] serde_yaml::Error),

    #[error("Failed to render template: {0}")]
    RenderError(#[from] handlebars::RenderError),

    #[error("Missing required variable: {0}")]
    MissingVariable(String),

    #[error("Failed to write output file: {0}")]
    WriteError(String),

    #[error("Skill not installed: {0}")]
    NotInstalled(String),

    #[error("GitHub API error: {0}")]
    GitHubError(String),

    #[error("Skill manifest error: {0}")]
    ManifestError(String),
}

impl Serialize for SkillError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
