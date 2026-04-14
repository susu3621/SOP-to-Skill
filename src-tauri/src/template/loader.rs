use crate::models::{
    FileFormat, InstallStrategy, SkillError, SkillManifest, SkillManifestEntry, SkillTemplate,
    TargetAppId, TargetConfig,
};
use serde::Deserialize;
use std::collections::HashMap;
use std::env;
use std::fs;
use std::path::{Path, PathBuf};

const DATA_DIR_ENV_VAR: &str = "SKILL_CONFIGURATOR_DATA_DIR";
const DATA_DIR_NAME: &str = ".sop-to-skill";
const PREVIOUS_DATA_DIR_NAME: &str = "sop-to-skill";
const LEGACY_DATA_DIR_NAME: &str = "SkillConfigurator";

#[derive(Debug, Deserialize, Default)]
struct SkillFrontmatter {
    name: Option<String>,
    description: Option<String>,
}

fn copy_directory_contents(source_dir: &Path, destination_dir: &Path) -> Result<(), SkillError> {
    let entries = fs::read_dir(source_dir).map_err(SkillError::LoadError)?;

    for entry in entries {
        let entry = entry.map_err(SkillError::LoadError)?;
        let source_path = entry.path();
        let destination_path = destination_dir.join(entry.file_name());

        if source_path.is_dir() {
            fs::create_dir_all(&destination_path).map_err(|e| {
                SkillError::WriteError(format!(
                    "Failed to create directory {:?}: {}",
                    destination_path, e
                ))
            })?;
            copy_directory_contents(&source_path, &destination_path)?;
        } else if source_path.is_file() {
            fs::copy(&source_path, &destination_path).map_err(|e| {
                SkillError::WriteError(format!(
                    "Failed to copy file {:?} to {:?}: {}",
                    source_path, destination_path, e
                ))
            })?;
        }
    }

    Ok(())
}

fn migrate_legacy_data_root_if_needed(
    new_root: &Path,
    legacy_roots: &[PathBuf],
) -> Result<(), SkillError> {
    if new_root.exists() {
        return Ok(());
    }

    let Some(legacy_root) = legacy_roots.iter().find(|candidate| candidate.exists()) else {
        return Ok(());
    };

    fs::create_dir_all(new_root).map_err(|e| {
        SkillError::WriteError(format!("Failed to create directory {:?}: {}", new_root, e))
    })?;
    copy_directory_contents(legacy_root, new_root)
}

fn resolve_data_root(home_dir: &Path, legacy_roots: &[PathBuf]) -> Result<PathBuf, SkillError> {
    let new_root = home_dir.join(DATA_DIR_NAME);
    migrate_legacy_data_root_if_needed(&new_root, legacy_roots)?;
    Ok(new_root)
}

#[cfg(test)]
fn resolve_data_root_from_base_dir(base_dir: &Path) -> Result<PathBuf, SkillError> {
    let legacy_roots = [
        base_dir.join(PREVIOUS_DATA_DIR_NAME),
        base_dir.join(LEGACY_DATA_DIR_NAME),
    ];
    resolve_data_root(base_dir, &legacy_roots)
}

fn build_legacy_data_roots(home_dir: &Path) -> Vec<PathBuf> {
    let mut roots = Vec::new();

    if let Some(data_dir) = dirs::data_dir() {
        roots.push(data_dir.join(PREVIOUS_DATA_DIR_NAME));
        roots.push(data_dir.join(LEGACY_DATA_DIR_NAME));
    }

    roots.push(home_dir.join(PREVIOUS_DATA_DIR_NAME));
    roots.push(home_dir.join(LEGACY_DATA_DIR_NAME));
    roots
}

pub fn get_data_root() -> PathBuf {
    if let Ok(path) = env::var(DATA_DIR_ENV_VAR) {
        return PathBuf::from(path);
    }

    let home_dir = dirs::home_dir().expect("Failed to get home directory");
    let legacy_roots = build_legacy_data_roots(&home_dir);
    resolve_data_root(&home_dir, &legacy_roots).expect("Failed to resolve app data directory")
}

fn sync_bundled_skills_dir(
    bundled_skills_dir: &Path,
    destination_skills_dir: &Path,
) -> Result<(), SkillError> {
    if !bundled_skills_dir.is_dir() {
        return Ok(());
    }

    fs::create_dir_all(destination_skills_dir).map_err(|e| {
        SkillError::WriteError(format!(
            "Failed to create directory {:?}: {}",
            destination_skills_dir, e
        ))
    })?;
    copy_directory_contents(bundled_skills_dir, destination_skills_dir)
}

fn resolve_bundled_skills_dir(resource_dir: &Path) -> Option<PathBuf> {
    let direct_skills_dir = resource_dir.join("skills");
    if direct_skills_dir.is_dir() {
        return Some(direct_skills_dir);
    }

    let updater_skills_dir = resource_dir.join("_up_").join("skills");
    if updater_skills_dir.is_dir() {
        return Some(updater_skills_dir);
    }

    None
}

fn resolve_resource_dir_from_executable(current_exe: &Path) -> Option<PathBuf> {
    let exe_dir = current_exe.parent()?;

    let looks_like_macos_bundle = exe_dir
        .file_name()
        .and_then(|value| value.to_str())
        .is_some_and(|value| value == "MacOS")
        && exe_dir
            .parent()
            .and_then(|value| value.file_name())
            .and_then(|value| value.to_str())
            .is_some_and(|value| value == "Contents");

    if looks_like_macos_bundle {
        return exe_dir.join("../Resources").canonicalize().ok();
    }

    Some(exe_dir.to_path_buf())
}

fn resolve_bundled_skills_dir_from_executable(current_exe: &Path) -> Option<PathBuf> {
    let resource_dir = resolve_resource_dir_from_executable(current_exe)?;
    resolve_bundled_skills_dir(&resource_dir)
}

fn resolve_skills_dir(
    current_dir: Option<&Path>,
    data_root: &Path,
    current_exe: Option<&Path>,
) -> PathBuf {
    if let Some(cwd) = current_dir {
        let workspace_skills_dir = cwd.join("skills");
        if workspace_skills_dir.is_dir() {
            return workspace_skills_dir;
        }
    }

    let synced_skills_dir = data_root.join("skills");
    if synced_skills_dir.is_dir() {
        return synced_skills_dir;
    }

    if let Some(current_exe) = current_exe {
        if let Some(bundled_skills_dir) = resolve_bundled_skills_dir_from_executable(current_exe) {
            return bundled_skills_dir;
        }
    }

    synced_skills_dir
}

pub fn sync_bundled_skills_from_resource_dir(resource_dir: &Path) -> Result<(), SkillError> {
    let Some(bundled_skills_dir) = resolve_bundled_skills_dir(resource_dir) else {
        return Ok(());
    };
    let destination_skills_dir = get_data_root().join("skills");
    sync_bundled_skills_dir(&bundled_skills_dir, &destination_skills_dir)
}

/// Get the skills directory path for the application
pub fn get_skills_dir() -> PathBuf {
    if let Ok(path) = env::var("SKILL_CONFIGURATOR_SKILLS_DIR") {
        return PathBuf::from(path);
    }

    resolve_skills_dir(
        env::current_dir().ok().as_deref(),
        &get_data_root(),
        env::current_exe().ok().as_deref(),
    )
}

/// Get the installed skills directory path
pub fn get_installed_dir() -> PathBuf {
    get_data_root().join("installed")
}

/// Get the cache directory path
pub fn get_cache_dir() -> PathBuf {
    get_data_root().join("cache")
}

/// Get the logs directory path
pub fn get_logs_dir() -> PathBuf {
    get_data_root().join("logs")
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
        get_logs_dir(),
    ];

    for dir in dirs_to_create {
        if !dir.exists() {
            fs::create_dir_all(&dir).map_err(|e| {
                SkillError::WriteError(format!("Failed to create directory {:?}: {}", dir, e))
            })?;
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

    lines.find_map(|line| {
        line.strip_prefix("# ")
            .map(|value| value.trim().to_string())
    })
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
    let manifest = serde_json::from_str(&content)
        .map_err(|e| SkillError::ManifestError(format!("Failed to parse {:?}: {}", path, e)))?;

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
        Some(manifest_entry) if !manifest_entry.targets.is_empty() => {
            manifest_entry.targets.clone()
        }
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
        category: manifest_entry.and_then(|entry| entry.category.clone()),
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

pub(crate) fn load_all_templates_from_dir(
    skills_dir: &Path,
) -> Result<Vec<SkillTemplate>, SkillError> {
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

    #[test]
    fn migrates_legacy_skill_configurator_data_into_hidden_sop_to_skill_root() {
        let base_dir = temp_dir("loader-data-root-migrate");
        let legacy_root = base_dir.join("SkillConfigurator");
        let expected_root = base_dir.join(".sop-to-skill");

        fs::create_dir_all(legacy_root.join("installed").join("jira")).unwrap();
        fs::create_dir_all(legacy_root.join("cache")).unwrap();
        fs::write(
            legacy_root.join("config.json"),
            r#"{"preferred_locale":"zh-CN"}"#,
        )
        .unwrap();
        fs::write(
            legacy_root.join("installed").join("jira").join("SKILL.md"),
            "# Jira",
        )
        .unwrap();

        let resolved = resolve_data_root_from_base_dir(&base_dir).unwrap();

        assert_eq!(resolved, expected_root);
        assert_eq!(
            fs::read_to_string(expected_root.join("config.json")).unwrap(),
            r#"{"preferred_locale":"zh-CN"}"#
        );
        assert!(expected_root
            .join("installed")
            .join("jira")
            .join("SKILL.md")
            .exists());
        assert!(expected_root.join("cache").exists());
    }

    #[test]
    fn keeps_existing_hidden_sop_to_skill_root_without_overwriting_from_legacy_directory() {
        let base_dir = temp_dir("loader-data-root-prefer-new");
        let legacy_root = base_dir.join("SkillConfigurator");
        let new_root = base_dir.join(".sop-to-skill");

        fs::create_dir_all(legacy_root.join("installed").join("jira")).unwrap();
        fs::create_dir_all(&new_root).unwrap();
        fs::write(legacy_root.join("config.json"), "legacy").unwrap();
        fs::write(
            legacy_root.join("installed").join("jira").join("SKILL.md"),
            "# Jira",
        )
        .unwrap();
        fs::write(new_root.join("config.json"), "new").unwrap();

        let resolved = resolve_data_root_from_base_dir(&base_dir).unwrap();

        assert_eq!(resolved, new_root);
        assert_eq!(
            fs::read_to_string(new_root.join("config.json")).unwrap(),
            "new"
        );
        assert!(!new_root.join("installed").join("jira").exists());
    }

    #[test]
    fn migrates_previous_sop_to_skill_data_root_into_hidden_home_directory() {
        let base_dir = temp_dir("loader-data-root-migrate-previous");
        let previous_root = base_dir.join("sop-to-skill");
        let expected_root = base_dir.join(".sop-to-skill");

        fs::create_dir_all(previous_root.join("installed").join("jira")).unwrap();
        fs::write(
            previous_root.join("config.json"),
            r#"{"preferred_locale":"en-US"}"#,
        )
        .unwrap();
        fs::write(
            previous_root
                .join("installed")
                .join("jira")
                .join("SKILL.md"),
            "# Jira",
        )
        .unwrap();

        let resolved = resolve_data_root_from_base_dir(&base_dir).unwrap();

        assert_eq!(resolved, expected_root);
        assert_eq!(
            fs::read_to_string(expected_root.join("config.json")).unwrap(),
            r#"{"preferred_locale":"en-US"}"#
        );
        assert!(expected_root
            .join("installed")
            .join("jira")
            .join("SKILL.md")
            .exists());
    }

    #[test]
    fn migrates_previous_data_directory_root_into_hidden_home_directory() {
        let home_dir = temp_dir("loader-data-root-home");
        let previous_data_dir = temp_dir("loader-data-root-previous-data-dir");
        let previous_root = previous_data_dir.join("sop-to-skill");
        let expected_root = home_dir.join(".sop-to-skill");

        fs::create_dir_all(previous_root.join("installed").join("jira")).unwrap();
        fs::write(
            previous_root.join("config.json"),
            r#"{"preferred_locale":"en-US"}"#,
        )
        .unwrap();
        fs::write(
            previous_root
                .join("installed")
                .join("jira")
                .join("SKILL.md"),
            "# Jira",
        )
        .unwrap();

        let resolved = resolve_data_root(
            &home_dir,
            &[
                previous_root.clone(),
                previous_data_dir.join("SkillConfigurator"),
            ],
        )
        .unwrap();

        assert_eq!(resolved, expected_root);
        assert_eq!(
            fs::read_to_string(expected_root.join("config.json")).unwrap(),
            r#"{"preferred_locale":"en-US"}"#
        );
        assert!(expected_root
            .join("installed")
            .join("jira")
            .join("SKILL.md")
            .exists());
    }

    #[test]
    fn syncs_bundled_skills_into_data_root_without_removing_existing_custom_skills() {
        let bundled_skills_dir = temp_dir("loader-bundled-skills");
        let destination_skills_dir = temp_dir("loader-data-skills");

        fs::create_dir_all(bundled_skills_dir.join("jira").join("scripts")).unwrap();
        fs::write(bundled_skills_dir.join("jira").join("SKILL.md"), "# Jira\n").unwrap();
        fs::write(
            bundled_skills_dir
                .join("jira")
                .join("scripts")
                .join("search_jira.py"),
            "print('jira')\n",
        )
        .unwrap();
        fs::write(
            bundled_skills_dir.join("manifest.json"),
            r#"{"schemaVersion":1,"skills":[{"id":"jira","path":"skills/jira","version":"1.0.0","targets":["codex"],"contentHash":"sha256:test"}]}"#,
        )
        .unwrap();

        fs::create_dir_all(destination_skills_dir.join("custom-skill")).unwrap();
        fs::write(
            destination_skills_dir.join("custom-skill").join("SKILL.md"),
            "# Custom Skill\n",
        )
        .unwrap();

        sync_bundled_skills_dir(&bundled_skills_dir, &destination_skills_dir).unwrap();

        assert_eq!(
            fs::read_to_string(destination_skills_dir.join("manifest.json")).unwrap(),
            r#"{"schemaVersion":1,"skills":[{"id":"jira","path":"skills/jira","version":"1.0.0","targets":["codex"],"contentHash":"sha256:test"}]}"#
        );
        assert!(destination_skills_dir
            .join("jira")
            .join("SKILL.md")
            .exists());
        assert!(destination_skills_dir
            .join("jira")
            .join("scripts")
            .join("search_jira.py")
            .exists());
        assert!(destination_skills_dir
            .join("custom-skill")
            .join("SKILL.md")
            .exists());
    }

    #[test]
    fn syncs_bundled_skills_from_tauri_updater_resource_directory() {
        let _guard = env_lock().lock().unwrap();
        let resource_dir = temp_dir("loader-resource-root");
        let bundled_skills_dir = resource_dir.join("_up_").join("skills");
        let data_dir = temp_dir("loader-updater-data-root");

        fs::create_dir_all(bundled_skills_dir.join("jira").join("scripts")).unwrap();
        fs::write(bundled_skills_dir.join("jira").join("SKILL.md"), "# Jira\n").unwrap();
        fs::write(
            bundled_skills_dir.join("manifest.json"),
            r#"{"schemaVersion":1,"skills":[{"id":"jira","path":"skills/jira","version":"1.0.0","targets":["codex"],"contentHash":"sha256:test"}]}"#,
        )
        .unwrap();

        std::env::set_var(DATA_DIR_ENV_VAR, &data_dir);
        let result = sync_bundled_skills_from_resource_dir(&resource_dir);
        std::env::remove_var(DATA_DIR_ENV_VAR);

        assert!(result.is_ok());
        assert!(data_dir
            .join("skills")
            .join("jira")
            .join("SKILL.md")
            .exists());
        assert!(data_dir.join("skills").join("manifest.json").exists());
    }

    #[test]
    fn resolves_skills_dir_from_packaged_macos_resources_when_workspace_and_data_are_missing() {
        let bundle_root = temp_dir("loader-release-bundle");
        let app_root = bundle_root.join("SOP-to-Skill.app");
        let exe_path = app_root.join("Contents").join("MacOS").join("sop-to-skill");
        let resource_dir = app_root.join("Contents").join("Resources");
        let bundled_skills_dir = resource_dir.join("_up_").join("skills");
        let current_dir = temp_dir("loader-release-cwd");
        let data_root = temp_dir("loader-release-data");

        fs::create_dir_all(exe_path.parent().unwrap()).unwrap();
        fs::create_dir_all(bundled_skills_dir.join("jira")).unwrap();
        fs::write(&exe_path, "").unwrap();
        fs::write(bundled_skills_dir.join("jira").join("SKILL.md"), "# Jira\n").unwrap();

        let resolved = resolve_skills_dir(Some(&current_dir), &data_root, Some(&exe_path));

        assert_eq!(resolved, bundled_skills_dir.canonicalize().unwrap());
    }
}
