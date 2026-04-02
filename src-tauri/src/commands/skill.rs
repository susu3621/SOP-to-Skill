use crate::models::{InstallStrategy, InstalledSkill, SkillError, SkillTemplate, TargetAppId};
use crate::template::{
    copy_directory, delete_skill_path, ensure_directories, get_default_variables,
    get_installed_dir, get_output_dir, get_output_path, get_skills_dir, load_all_templates,
    load_skill_template, load_template_file, render_template, validate_variables,
    write_skill_file,
};
use serde::Serialize;
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

/// Application state for skill management
pub struct SkillState;

impl Default for SkillState {
    fn default() -> Self {
        Self
    }
}

/// Result wrapper for skill operations
#[derive(Debug, Serialize)]
#[serde(untagged)]
pub enum SkillResult<T> {
    Success { success: T },
    Error { error: String },
}

impl<T: Serialize> From<Result<T, SkillError>> for SkillResult<T> {
    fn from(result: Result<T, SkillError>) -> Self {
        match result {
            Ok(value) => SkillResult::Success { success: value },
            Err(e) => SkillResult::Error {
                error: e.to_string(),
            },
        }
    }
}

/// Skill info for frontend display
#[derive(Debug, Serialize)]
pub struct SkillInfo {
    pub id: String,
    pub name: HashMap<String, String>,
    pub description: Option<HashMap<String, String>>,
    pub version: String,
    pub author: Option<String>,
    pub targets: Vec<String>,
    pub variables: Vec<VariableInfo>,
    pub is_installed: bool,
    pub installed_version: Option<String>,
    pub update_status: String,
}

/// Variable info for frontend
#[derive(Debug, Serialize)]
pub struct VariableInfo {
    pub id: String,
    pub label: HashMap<String, String>,
    pub var_type: String,
    pub required: bool,
    pub default: Option<String>,
    pub placeholder: Option<HashMap<String, String>>,
    pub options: Vec<OptionInfo>,
}

/// Option info for select variables
#[derive(Debug, Serialize)]
pub struct OptionInfo {
    pub value: String,
    pub label: HashMap<String, String>,
}

/// Installed skill info for frontend
#[derive(Debug, Serialize)]
pub struct InstalledSkillInfo {
    pub skill_id: String,
    pub app_id: String,
    pub app_name: String,
    pub installed_version: String,
    pub installed_at: String,
    pub output_path: String,
}

/// Convert template to frontend info
fn template_to_info(template: SkillTemplate, installed: Option<&InstalledSkill>) -> SkillInfo {
    let targets: Vec<String> = template
        .targets
        .iter()
        .map(|t| t.app_id.as_str().to_string())
        .collect();

    let variables: Vec<VariableInfo> = template
        .variables
        .iter()
        .map(|v| VariableInfo {
            id: v.id.clone(),
            label: v.label.clone(),
            var_type: match v.var_type {
                crate::models::VariableType::Text => "text",
                crate::models::VariableType::Path => "path",
                crate::models::VariableType::Select => "select",
                crate::models::VariableType::Number => "number",
            }
            .to_string(),
            required: v.required,
            default: v.default.clone(),
            placeholder: v.placeholder.clone(),
            options: v
                .options
                .iter()
                .map(|o| OptionInfo {
                    value: o.value.clone(),
                    label: o.label.clone(),
                })
                .collect(),
        })
        .collect();

    SkillInfo {
        id: template.id.clone(),
        name: template.name.clone(),
        description: template.description.clone(),
        version: template.version.clone(),
        author: template.author.clone(),
        targets,
        variables,
        is_installed: installed.is_some(),
        installed_version: installed.as_ref().map(|i| i.installed_version.clone()),
        update_status: match installed {
            Some(i) => {
                if i.installed_version == template.version {
                    "up-to-date".to_string()
                } else {
                    "update-available".to_string()
                }
            }
            None => "not-installed".to_string(),
        },
    }
}

/// Get app display name
pub(crate) fn get_app_name(app_id: &TargetAppId) -> String {
    match app_id {
        TargetAppId::ClaudeCode => "Claude Code".to_string(),
        TargetAppId::Codex => "Codex".to_string(),
        TargetAppId::WorkBuddy => "WorkBuddy".to_string(),
    }
}

pub(crate) fn parse_target_app_id(app_id: &str) -> Result<TargetAppId, SkillError> {
    match app_id {
        "claude-code" => Ok(TargetAppId::ClaudeCode),
        "codex" => Ok(TargetAppId::Codex),
        "workbuddy" => Ok(TargetAppId::WorkBuddy),
        _ => Err(SkillError::TemplateNotFound(format!("Unknown app: {}", app_id))),
    }
}

fn path_for_template(path: &Path) -> String {
    path.to_string_lossy().replace('\\', "/")
}

pub(crate) fn install_directory_package_at_path(
    skill_id: &str,
    app_id: &TargetAppId,
    source_dir: &Path,
    output_dir: &Path,
    version: &str,
    variables: &HashMap<String, String>,
    render_skill_markdown: bool,
    data_root: Option<&Path>,
) -> Result<InstalledSkillInfo, SkillError> {
    if output_dir.exists() {
        delete_skill_path(output_dir)?;
    }

    copy_directory(source_dir, output_dir)?;

    let mut final_vars = variables.clone();
    if render_skill_markdown {
        let skill_markdown = output_dir.join("SKILL.md");
        let content = fs::read_to_string(&skill_markdown)?;

        final_vars.insert("skill_dir".to_string(), path_for_template(output_dir));
        final_vars.insert(
            "script_dir".to_string(),
            path_for_template(&output_dir.join("scripts")),
        );

        let rendered = render_template(&content, &final_vars)?;
        write_skill_file(&skill_markdown, &rendered)?;
    }

    let installed = InstalledSkill {
        skill_id: skill_id.to_string(),
        app_id: app_id.clone(),
        installed_version: version.to_string(),
        installed_at: chrono::Utc::now(),
        output_path: output_dir.to_string_lossy().to_string(),
        variables: final_vars,
    };

    save_installed_skill(&installed, data_root)?;

    Ok(InstalledSkillInfo {
        skill_id: installed.skill_id,
        app_id: app_id.as_str().to_string(),
        app_name: get_app_name(app_id),
        installed_version: installed.installed_version,
        installed_at: installed.installed_at.to_rfc3339(),
        output_path: installed.output_path,
    })
}

/// Load installed skill metadata
fn load_installed_skill(skill_id: &str, app_id: &TargetAppId) -> Option<InstalledSkill> {
    let installed_dir = get_installed_dir().join(app_id.as_str());
    let meta_path = installed_dir.join(format!("{}.json", skill_id));

    if meta_path.exists() {
        let content = fs::read_to_string(&meta_path).ok()?;
        serde_json::from_str(&content).ok()
    } else {
        None
    }
}

/// Save installed skill metadata
fn installed_dir_for_data_root(data_root: Option<&Path>) -> PathBuf {
    match data_root {
        Some(root) => root.join("installed"),
        None => get_installed_dir(),
    }
}

pub(crate) fn save_installed_skill(
    skill: &InstalledSkill,
    data_root: Option<&Path>,
) -> Result<(), SkillError> {
    let installed_dir = installed_dir_for_data_root(data_root).join(skill.app_id.as_str());

    if !installed_dir.exists() {
        fs::create_dir_all(&installed_dir).map_err(|e| {
            SkillError::WriteError(format!("Failed to create directory: {}", e))
        })?;
    }

    let meta_path = installed_dir.join(format!("{}.json", skill.skill_id));
    let content = serde_json::to_string_pretty(skill)
        .map_err(|e| SkillError::WriteError(format!("Failed to serialize: {}", e)))?;

    fs::write(&meta_path, content)
        .map_err(|e| SkillError::WriteError(format!("Failed to write file: {}", e)))?;

    Ok(())
}

/// Delete installed skill metadata
pub(crate) fn delete_installed_skill(skill_id: &str, app_id: &TargetAppId) -> Result<(), SkillError> {
    let installed_dir = get_installed_dir().join(app_id.as_str());
    let meta_path = installed_dir.join(format!("{}.json", skill_id));

    if meta_path.exists() {
        fs::remove_file(&meta_path)
            .map_err(|e| SkillError::WriteError(format!("Failed to delete file: {}", e)))?;
    }

    Ok(())
}

pub(crate) fn uninstall_skill_at_path(
    skill_id: &str,
    app_id: &TargetAppId,
    output_path: &Path,
) -> Result<(), SkillError> {
    delete_skill_path(output_path)?;
    delete_installed_skill(skill_id, app_id)
}

/// List all available skills
#[tauri::command]
pub async fn list_skills() -> SkillResult<Vec<SkillInfo>> {
    let result = || -> Result<Vec<SkillInfo>, SkillError> {
        ensure_directories()?;
        let templates = load_all_templates()?;

        let mut skills = Vec::new();
        for template in templates {
            // Check if installed for any target
            let installed = template
                .targets
                .iter()
                .find_map(|t| load_installed_skill(&template.id, &t.app_id));

            skills.push(template_to_info(template, installed.as_ref()));
        }

        Ok(skills)
    };

    result().into()
}

/// Get skill details by ID
#[tauri::command]
pub async fn get_skill(skill_id: String) -> SkillResult<SkillInfo> {
    let result = || -> Result<SkillInfo, SkillError> {
        ensure_directories()?;
        let template = load_skill_template(&skill_id)?;

        // Check if installed for any target
        let installed = template
            .targets
            .iter()
            .find_map(|t| load_installed_skill(&template.id, &t.app_id));

        Ok(template_to_info(template, installed.as_ref()))
    };

    result().into()
}

/// Install a skill to a target application
#[tauri::command]
pub async fn install_skill(
    skill_id: String,
    app_id: String,
    variables: HashMap<String, String>,
) -> SkillResult<InstalledSkillInfo> {
    let result = || -> Result<InstalledSkillInfo, SkillError> {
        ensure_directories()?;

        // Parse app ID
        let target_app_id = parse_target_app_id(&app_id)?;

        // Load template
        let template = load_skill_template(&skill_id)?;

        // Find target config
        let target = template
            .targets
            .iter()
            .find(|t| t.app_id == target_app_id)
            .ok_or_else(|| {
                SkillError::TemplateNotFound(format!(
                    "Skill {} does not support target {}",
                    skill_id, app_id
                ))
            })?;

        // Merge with defaults and validate
        let mut final_vars = get_default_variables(&template);
        final_vars.extend(variables);
        validate_variables(&template, &final_vars)?;

        // Add skill metadata to variables
        final_vars.insert("skillId".to_string(), skill_id.clone());
        final_vars.insert("skillVersion".to_string(), template.version.clone());

        let installed_info = match template.install_strategy {
            InstallStrategy::TemplateFile => {
                let template_content = load_template_file(&skill_id, &target.template_file)?;
                let rendered = render_template(&template_content, &final_vars)?;
                let output_path = get_output_path(&target_app_id, &skill_id);
                write_skill_file(&output_path, &rendered)?;
                let installed = InstalledSkill {
                    skill_id: skill_id.clone(),
                    app_id: target_app_id.clone(),
                    installed_version: template.version.clone(),
                    installed_at: chrono::Utc::now(),
                    output_path: output_path.to_string_lossy().to_string(),
                    variables: final_vars.clone(),
                };
                save_installed_skill(&installed, None)?;
                InstalledSkillInfo {
                    skill_id: installed.skill_id,
                    app_id: target_app_id.as_str().to_string(),
                    app_name: get_app_name(&target_app_id),
                    installed_version: template.version.clone(),
                    installed_at: installed.installed_at.to_rfc3339(),
                    output_path: installed.output_path,
                }
            }
            InstallStrategy::DirectoryPackage => {
                let source_dir = get_skills_dir().join(&skill_id);
                let output_dir = get_output_dir(&target_app_id, &skill_id);
                install_directory_package_at_path(
                    &skill_id,
                    &target_app_id,
                    &source_dir,
                    &output_dir,
                    &template.version,
                    &final_vars,
                    true,
                    None,
                )?
            }
        };
        Ok(installed_info)
    };

    result().into()
}

/// Uninstall a skill from a target application
#[tauri::command]
pub async fn uninstall_skill(skill_id: String, app_id: String) -> SkillResult<()> {
    let result = || -> Result<(), SkillError> {
        ensure_directories()?;

        // Parse app ID
        let target_app_id = parse_target_app_id(&app_id)?;

        // Check if installed
        let installed = load_installed_skill(&skill_id, &target_app_id)
            .ok_or_else(|| SkillError::NotInstalled(skill_id.clone()))?;

        let output_path = PathBuf::from(&installed.output_path);
        uninstall_skill_at_path(&skill_id, &target_app_id, &output_path)?;

        Ok(())
    };

    result().into()
}

/// List all installed skills
#[tauri::command]
pub async fn list_installed() -> SkillResult<Vec<InstalledSkillInfo>> {
    let result = || -> Result<Vec<InstalledSkillInfo>, SkillError> {
        ensure_directories()?;

        let installed_dir = get_installed_dir();
        let mut installed_skills = Vec::new();

        if !installed_dir.exists() {
            return Ok(installed_skills);
        }

        for app_entry in fs::read_dir(&installed_dir)? {
            let app_entry = app_entry?;
            let app_path = app_entry.path();

            if app_path.is_dir() {
                if let Some(app_id_str) = app_path.file_name().and_then(|n| n.to_str()) {
                    let target_app_id = match app_id_str {
                        "claude-code" => TargetAppId::ClaudeCode,
                        "codex" => TargetAppId::Codex,
                        "workbuddy" => TargetAppId::WorkBuddy,
                        _ => continue,
                    };

                    for skill_entry in fs::read_dir(&app_path)? {
                        let skill_entry = skill_entry?;
                        let skill_path = skill_entry.path();

                        if skill_path.extension().map(|e| e == "json").unwrap_or(false) {
                            if let Ok(content) = fs::read_to_string(&skill_path) {
                                if let Ok(installed) = serde_json::from_str::<InstalledSkill>(&content)
                                {
                                    installed_skills.push(InstalledSkillInfo {
                                        skill_id: installed.skill_id,
                                        app_id: installed.app_id.as_str().to_string(),
                                        app_name: get_app_name(&target_app_id),
                                        installed_version: installed.installed_version,
                                        installed_at: installed.installed_at.to_rfc3339(),
                                        output_path: installed.output_path,
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }

        Ok(installed_skills)
    };

    result().into()
}

/// Get available target applications
#[tauri::command]
pub async fn get_target_apps() -> Vec<TargetAppInfo> {
    vec![
        TargetAppInfo {
            id: "claude-code".to_string(),
            name: "Claude Code".to_string(),
            description: "Anthropic's official CLI for Claude".to_string(),
            status: "available".to_string(),
        },
        TargetAppInfo {
            id: "codex".to_string(),
            name: "Codex".to_string(),
            description: "OpenAI's terminal coding agent".to_string(),
            status: "available".to_string(),
        },
        TargetAppInfo {
            id: "workbuddy".to_string(),
            name: "WorkBuddy".to_string(),
            description: "Desktop AI assistant".to_string(),
            status: "available".to_string(),
        },
    ]
}

#[derive(Debug, Serialize)]
pub struct TargetAppInfo {
    pub id: String,
    pub name: String,
    pub description: String,
    pub status: String,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::SkillManifestEntry;
    use crate::template::load_skill_template_from_dir_with_manifest;
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

    #[test]
    fn install_directory_package_copies_scripts_and_renders_paths() {
        let source_dir = temp_dir("install-package-source");
        let output_dir = temp_dir("install-package-output");
        let data_dir = temp_dir("install-package-data");

        fs::create_dir_all(source_dir.join("scripts")).unwrap();
        fs::write(
            source_dir.join("SKILL.md"),
            "Search: {{script_dir}}/search_jira.py\nRoot: {{skill_dir}}\n",
        )
        .unwrap();
        fs::write(source_dir.join("scripts/search_jira.py"), "print('ok')").unwrap();

        let variables = HashMap::new();
        install_directory_package_at_path(
            "install-package",
            &TargetAppId::Codex,
            &source_dir,
            &output_dir,
            "local",
            &variables,
            true,
            Some(&data_dir),
        )
        .unwrap();

        let rendered = fs::read_to_string(output_dir.join("SKILL.md")).unwrap();
        assert!(rendered.contains("scripts/search_jira.py"));
        assert!(rendered.contains(output_dir.to_string_lossy().as_ref()));
        assert!(output_dir.join("scripts/search_jira.py").exists());
    }

    #[test]
    fn install_directory_package_uses_manifest_version_for_directory_packages() {
        let skills_dir = temp_dir("install-skill-manifest-skills");
        let data_dir = temp_dir("install-skill-manifest-data");
        let output_dir = temp_dir("install-skill-manifest-output");
        let jira_dir = skills_dir.join("jira");

        fs::create_dir_all(jira_dir.join("scripts")).unwrap();
        fs::write(jira_dir.join("SKILL.md"), "# Jira\n").unwrap();
        fs::write(jira_dir.join("scripts/search_jira.py"), "print('ok')\n").unwrap();
        let manifest_entry = SkillManifestEntry {
            id: "jira".to_string(),
            path: "skills/jira".to_string(),
            version: "1.2.3".to_string(),
            targets: vec![TargetAppId::Codex],
            content_hash: "sha256:test".to_string(),
        };

        let template = load_skill_template_from_dir_with_manifest(
            "jira",
            &jira_dir,
            Some(&manifest_entry),
        )
        .unwrap();

        let installed = install_directory_package_at_path(
            "jira",
            &TargetAppId::Codex,
            &jira_dir,
            &output_dir,
            &template.version,
            &HashMap::new(),
            true,
            Some(&data_dir),
        )
        .unwrap();

        assert_eq!(installed.installed_version, "1.2.3");
    }
}
