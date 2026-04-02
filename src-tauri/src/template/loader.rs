use crate::models::{
    FileFormat, InstallStrategy, SkillError, SkillManifest, SkillManifestEntry, SkillTemplate,
    TargetAppId, TargetConfig,
};
use serde::Deserialize;
use std::collections::HashMap;
use std::env;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Deserialize, Default)]
struct SkillFrontmatter {
    name: Option<String>,
    description: Option<String>,
}

fn get_data_root() -> PathBuf {
    if let Ok(path) = env::var("SKILL_CONFIGURATOR_DATA_DIR") {
        return PathBuf::from(path);
    }

    dirs::data_dir()
        .expect("Failed to get data directory")
        .join("SkillConfigurator")
}

fn get_workspace_skills_dir() -> Option<PathBuf> {
    let cwd = env::current_dir().ok()?;
    let skills_dir = cwd.join("skills");
    skills_dir.is_dir().then_some(skills_dir)
}

/// Get the skills directory path for the application
pub fn get_skills_dir() -> PathBuf {
    if let Ok(path) = env::var("SKILL_CONFIGURATOR_SKILLS_DIR") {
        return PathBuf::from(path);
    }

    if let Some(path) = get_workspace_skills_dir() {
        return path;
    }

    get_data_root().join("skills")
}

/// Get the installed skills directory path
pub fn get_installed_dir() -> PathBuf {
    get_data_root().join("installed")
}

/// Get the cache directory path
pub fn get_cache_dir() -> PathBuf {
    get_data_root().join("cache")
}

/// Get the config file path
pub fn get_config_path() -> PathBuf {
    get_data_root().join("config.json")
}

/// Ensure the application directories exist
pub fn ensure_directories() -> Result<(), SkillError> {
    let dirs_to_create = [
        get_skills_dir(),
        get_installed_dir(),
        get_cache_dir(),
    ];

    for dir in dirs_to_create {
        if !dir.exists() {
            fs::create_dir_all(&dir)
                .map_err(|e| SkillError::WriteError(format!("Failed to create directory {:?}: {}", dir, e)))?;
        }
    }

    Ok(())
}

fn duplicate_text(value: &str) -> HashMap<String, String> {
    let mut localized = HashMap::new();
    localized.insert("zh-CN".to_string(), value.to_string());
    localized.insert("en-US".to_string(), value.to_string());
    localized
}

fn parse_frontmatter(content: &str) -> Option<SkillFrontmatter> {
    let mut frontmatter = String::new();
    let mut lines = content.lines();
    if lines.next()? != "---" {
        return None;
    }

    for line in lines {
        if line == "---" {
            return serde_yaml::from_str(&frontmatter).ok();
        }
        frontmatter.push_str(line);
        frontmatter.push('\n');
    }

    None
}

fn extract_heading(content: &str) -> Option<String> {
    let mut lines = content.lines();

    if matches!(lines.next(), Some("---")) {
        for line in &mut lines {
            if line == "---" {
                break;
            }
        }
    } else {
        lines = content.lines();
    }

    lines
        .find_map(|line| line.strip_prefix("# ").map(|value| value.trim().to_string()))
}

fn manifest_path(skills_dir: &Path) -> PathBuf {
    skills_dir.join("manifest.json")
}

fn load_skill_manifest_from_skills_dir(
    skills_dir: &Path,
) -> Result<Option<SkillManifest>, SkillError> {
    let path = manifest_path(skills_dir);
    if !path.exists() {
        return Ok(None);
    }

    let content = fs::read_to_string(&path)?;
    let manifest = serde_json::from_str(&content).map_err(|e| {
        SkillError::ManifestError(format!("Failed to parse {:?}: {}", path, e))
    })?;

    Ok(Some(manifest))
}

fn find_manifest_entry(
    manifest: Option<&SkillManifest>,
    skill_id: &str,
) -> Option<SkillManifestEntry> {
    manifest
        .and_then(|m| m.skills.iter().find(|entry| entry.id == skill_id))
        .cloned()
}

fn resolve_manifest_skill_dir(skills_dir: &Path, entry: &SkillManifestEntry) -> PathBuf {
    let relative = entry
        .path
        .strip_prefix("skills/")
        .unwrap_or(&entry.path)
        .trim_matches('/');
    skills_dir.join(relative)
}

fn directory_package_targets(entry: Option<&SkillManifestEntry>) -> Vec<TargetConfig> {
    let target_app_ids = match entry {
        Some(manifest_entry) if !manifest_entry.targets.is_empty() => manifest_entry.targets.clone(),
        _ => vec![TargetAppId::ClaudeCode, TargetAppId::Codex],
    };

    target_app_ids
        .into_iter()
        .map(|app_id| TargetConfig {
            app_id,
            output_path: String::new(),
            file_format: FileFormat::Markdown,
            template_file: "SKILL.md".to_string(),
        })
        .collect()
}

fn load_directory_package_template(
    skill_id: &str,
    skill_dir: &Path,
    manifest_entry: Option<&SkillManifestEntry>,
) -> Result<SkillTemplate, SkillError> {
    let skill_file = skill_dir.join("SKILL.md");
    if !skill_file.exists() {
        return Err(SkillError::TemplateNotFound(skill_id.to_string()));
    }

    let content = fs::read_to_string(&skill_file)?;
    let frontmatter = parse_frontmatter(&content).unwrap_or_default();
    let display_name = extract_heading(&content)
        .or(frontmatter.name.clone())
        .unwrap_or_else(|| skill_id.to_string());

    Ok(SkillTemplate {
        id: skill_id.to_string(),
        name: duplicate_text(&display_name),
        description: frontmatter.description.as_deref().map(duplicate_text),
        version: manifest_entry
            .map(|entry| entry.version.clone())
            .unwrap_or_else(|| "local".to_string()),
        author: None,
        source: None,
        install_strategy: InstallStrategy::DirectoryPackage,
        targets: directory_package_targets(manifest_entry),
        variables: Vec::new(),
    })
}

pub(crate) fn load_skill_template_from_dir_with_manifest(
    skill_id: &str,
    skill_dir: &Path,
    manifest_entry: Option<&SkillManifestEntry>,
) -> Result<SkillTemplate, SkillError> {
    let template_path = skill_dir.join("template.yaml");

    if template_path.exists() {
        let content = fs::read_to_string(&template_path)?;
        let template: SkillTemplate = serde_yaml::from_str(&content)?;
        return Ok(template);
    }

    load_directory_package_template(skill_id, skill_dir, manifest_entry)
}

#[cfg_attr(not(test), allow(dead_code))]
pub(crate) fn load_skill_template_from_dir(
    skill_id: &str,
    skill_dir: &Path,
) -> Result<SkillTemplate, SkillError> {
    load_skill_template_from_dir_with_manifest(skill_id, skill_dir, None)
}

/// Load a skill template from its directory
pub fn load_skill_template(skill_id: &str) -> Result<SkillTemplate, SkillError> {
    let skills_dir = get_skills_dir();
    let manifest = load_skill_manifest_from_skills_dir(&skills_dir)?;
    let manifest_entry = find_manifest_entry(manifest.as_ref(), skill_id);
    let skill_dir = manifest_entry
        .as_ref()
        .map(|entry| resolve_manifest_skill_dir(&skills_dir, entry))
        .unwrap_or_else(|| skills_dir.join(skill_id));

    load_skill_template_from_dir_with_manifest(skill_id, &skill_dir, manifest_entry.as_ref())
}

pub(crate) fn load_all_templates_from_dir(skills_dir: &Path) -> Result<Vec<SkillTemplate>, SkillError> {
    if !skills_dir.exists() {
        return Ok(Vec::new());
    }

    let manifest = load_skill_manifest_from_skills_dir(skills_dir)?;
    let mut templates = Vec::new();
    let entries = fs::read_dir(skills_dir).map_err(SkillError::LoadError)?;

    for entry in entries {
        let entry = entry.map_err(SkillError::LoadError)?;
        let path = entry.path();

        if path.is_dir() {
            if let Some(skill_id) = path.file_name().and_then(|n| n.to_str()) {
                let manifest_entry = find_manifest_entry(manifest.as_ref(), skill_id);
                match load_skill_template_from_dir_with_manifest(
                    skill_id,
                    &path,
                    manifest_entry.as_ref(),
                ) {
                    Ok(template) => templates.push(template),
                    Err(e) => {
                        tracing::warn!("Failed to load template {}: {}", skill_id, e);
                    }
                }
            }
        }
    }

    Ok(templates)
}

/// Load all available skill templates
pub fn load_all_templates() -> Result<Vec<SkillTemplate>, SkillError> {
    let skills_dir = get_skills_dir();
    load_all_templates_from_dir(&skills_dir)
}

/// Load the template file content for a specific target
pub fn load_template_file(skill_id: &str, template_file: &str) -> Result<String, SkillError> {
    let skill_dir = get_skills_dir().join(skill_id);
    let file_path = skill_dir.join(template_file);

    if !file_path.exists() {
        return Err(SkillError::TemplateNotFound(format!(
            "{}/{}",
            skill_id, template_file
        )));
    }

    let content = fs::read_to_string(&file_path)?;
    Ok(content)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::InstallStrategy;
    use std::sync::{Mutex, OnceLock};
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_dir(prefix: &str) -> PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("time went backwards")
            .as_nanos();
        let path = std::env::temp_dir().join(format!("skill-configurator-{prefix}-{unique}"));
        fs::create_dir_all(&path).expect("create temp dir");
        path
    }

    fn env_lock() -> &'static Mutex<()> {
        static LOCK: OnceLock<Mutex<()>> = OnceLock::new();
        LOCK.get_or_init(|| Mutex::new(()))
    }

    #[test]
    fn loads_directory_package_from_skill_markdown() {
        let skills_dir = temp_dir("loader-package");
        let skill_dir = skills_dir.join("jira");
        fs::create_dir_all(skill_dir.join("scripts")).unwrap();
        fs::write(
            skill_dir.join("SKILL.md"),
            r#"---
name: jira
description: Use when reading Jira issue details.
---

# Jira Read-Only Skill
"#,
        )
        .unwrap();

        let template = load_skill_template_from_dir("jira", &skill_dir).unwrap();

        assert_eq!(template.id, "jira");
        assert_eq!(template.install_strategy, InstallStrategy::DirectoryPackage);
        assert_eq!(template.name.get("en-US").unwrap(), "Jira Read-Only Skill");
        assert_eq!(template.targets.len(), 2);
    }

    #[test]
    fn load_all_templates_includes_directory_packages() {
        let skills_dir = temp_dir("loader-all");
        let jira_dir = skills_dir.join("jira");
        fs::create_dir_all(jira_dir.join("scripts")).unwrap();
        fs::write(
            jira_dir.join("SKILL.md"),
            r#"---
name: jira
description: Use when reading Jira issue details.
---

# Jira Read-Only Skill
"#,
        )
        .unwrap();

        let templates = load_all_templates_from_dir(&skills_dir).unwrap();

        assert_eq!(templates.len(), 1);
        assert_eq!(templates[0].id, "jira");
    }

    #[test]
    fn loads_directory_package_version_from_manifest() {
        let _guard = env_lock().lock().unwrap();
        let skills_dir = temp_dir("loader-manifest");
        let jira_dir = skills_dir.join("jira");
        fs::create_dir_all(jira_dir.join("scripts")).unwrap();
        fs::write(
            jira_dir.join("SKILL.md"),
            r#"---
name: jira
description: Use when reading Jira issue details.
---

# Jira Read-Only Skill
"#,
        )
        .unwrap();
        fs::write(
            skills_dir.join("manifest.json"),
            r#"{
  "schemaVersion": 1,
  "skills": [
    {
      "id": "jira",
      "path": "skills/jira",
      "version": "1.2.3",
      "targets": ["claude-code", "codex", "workbuddy"],
      "contentHash": "sha256:test"
    }
  ]
}"#,
        )
        .unwrap();

        std::env::set_var("SKILL_CONFIGURATOR_SKILLS_DIR", &skills_dir);
        let template = load_skill_template("jira").unwrap();
        std::env::remove_var("SKILL_CONFIGURATOR_SKILLS_DIR");

        assert_eq!(template.version, "1.2.3");
        assert_eq!(template.targets.len(), 3);
    }
}
