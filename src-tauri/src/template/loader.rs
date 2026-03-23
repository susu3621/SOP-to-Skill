use crate::models::{SkillTemplate, SkillError};
use std::fs;
use std::path::{Path, PathBuf};

/// Get the skills directory path for the application
pub fn get_skills_dir() -> PathBuf {
    let data_dir = dirs::data_dir()
        .expect("Failed to get data directory")
        .join("SkillConfigurator");
    data_dir.join("skills")
}

/// Get the installed skills directory path
pub fn get_installed_dir() -> PathBuf {
    let data_dir = dirs::data_dir()
        .expect("Failed to get data directory")
        .join("SkillConfigurator");
    data_dir.join("installed")
}

/// Get the cache directory path
pub fn get_cache_dir() -> PathBuf {
    let data_dir = dirs::data_dir()
        .expect("Failed to get data directory")
        .join("SkillConfigurator");
    data_dir.join("cache")
}

/// Get the config file path
pub fn get_config_path() -> PathBuf {
    let data_dir = dirs::data_dir()
        .expect("Failed to get data directory")
        .join("SkillConfigurator");
    data_dir.join("config.json")
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

/// Load a skill template from its directory
pub fn load_skill_template(skill_id: &str) -> Result<SkillTemplate, SkillError> {
    let skill_dir = get_skills_dir().join(skill_id);
    let template_path = skill_dir.join("template.yaml");

    if !template_path.exists() {
        return Err(SkillError::TemplateNotFound(skill_id.to_string()));
    }

    let content = fs::read_to_string(&template_path)?;
    let template: SkillTemplate = serde_yaml::from_str(&content)?;

    Ok(template)
}

/// Load all available skill templates
pub fn load_all_templates() -> Result<Vec<SkillTemplate>, SkillError> {
    let skills_dir = get_skills_dir();

    if !skills_dir.exists() {
        return Ok(Vec::new());
    }

    let mut templates = Vec::new();

    let entries = fs::read_dir(&skills_dir)
        .map_err(|e| SkillError::LoadError(e))?;

    for entry in entries {
        let entry = entry.map_err(|e| SkillError::LoadError(e))?;
        let path = entry.path();

        if path.is_dir() {
            if let Some(skill_id) = path.file_name().and_then(|n| n.to_str()) {
                match load_skill_template(skill_id) {
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
