use crate::models::{SkillError, SkillTemplate, TargetAppId};
use handlebars::Handlebars;
use serde_json::{json, Value as JsonValue};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

/// Expand path with ~ and environment variables
pub fn expand_path(path: &str) -> String {
    // First expand ~ to home directory
    let expanded = shellexpand::tilde(path);
    // Then expand environment variables
    let expanded_str = expanded.to_string();
    shellexpand::env(&expanded_str)
        .map(|s| s.to_string())
        .unwrap_or(expanded_str)
}

/// Render a skill template with the given variables
pub fn render_template(
    template_content: &str,
    variables: &HashMap<String, String>,
) -> Result<String, SkillError> {
    let mut handlebars = Handlebars::new();
    handlebars.set_strict_mode(true);

    // Register the template
    handlebars
        .register_template_string("skill", template_content)
        .map_err(|e| SkillError::WriteError(format!("Template error: {}", e)))?;

    // Convert variables to JSON value using json! macro
    let data: JsonValue = json!(variables);

    // Render the template
    let rendered = handlebars
        .render("skill", &data)
        .map_err(|e| SkillError::RenderError(e))?;

    Ok(rendered)
}

/// Validate that all required variables are provided
pub fn validate_variables(
    template: &SkillTemplate,
    provided: &HashMap<String, String>,
) -> Result<(), SkillError> {
    for var in &template.variables {
        if var.required {
            let value = provided.get(&var.id);
            if value.is_none() || value.map(|v| v.is_empty()).unwrap_or(true) {
                return Err(SkillError::MissingVariable(var.id.clone()));
            }
        }
    }
    Ok(())
}

/// Get default values for variables
pub fn get_default_variables(template: &SkillTemplate) -> HashMap<String, String> {
    let mut defaults = HashMap::new();

    for var in &template.variables {
        if let Some(ref default) = var.default {
            defaults.insert(var.id.clone(), default.clone());
        }
    }

    defaults
}

/// Get the actual output path for a skill installation
pub fn get_output_path(app_id: &TargetAppId, skill_id: &str) -> PathBuf {
    #[cfg(target_os = "macos")]
    let path_template = app_id.output_path_macos(skill_id);

    #[cfg(target_os = "windows")]
    let path_template = app_id.output_path_windows(skill_id);

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    let path_template = app_id.output_path_macos(skill_id); // Default to macOS path for Linux

    PathBuf::from(expand_path(&path_template))
}

/// Get the output directory for a packaged skill installation
pub fn get_output_dir(app_id: &TargetAppId, skill_id: &str) -> PathBuf {
    let path_template = match app_id {
        TargetAppId::ClaudeCode => format!("~/.claude/skills/{}", skill_id),
        TargetAppId::Codex => format!("~/.codex/skills/{}", skill_id),
        TargetAppId::WorkBuddy => format!("~/.workbuddy/skills/{}", skill_id),
    };

    PathBuf::from(expand_path(&path_template))
}

/// Write rendered content to the target file
pub fn write_skill_file(
    output_path: &PathBuf,
    content: &str,
) -> Result<(), SkillError> {
    // Ensure parent directory exists
    if let Some(parent) = output_path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| {
                SkillError::WriteError(format!(
                    "Failed to create directory {:?}: {}",
                    parent, e
                ))
            })?;
        }
    }

    // Write the file
    fs::write(output_path, content).map_err(|e| {
        SkillError::WriteError(format!("Failed to write file {:?}: {}", output_path, e))
    })?;

    Ok(())
}

/// Delete a skill path, whether it is a file or a directory
pub fn delete_skill_path(output_path: &Path) -> Result<(), SkillError> {
    if output_path.exists() {
        if output_path.is_dir() {
            fs::remove_dir_all(output_path).map_err(|e| {
                SkillError::WriteError(format!(
                    "Failed to delete directory {:?}: {}",
                    output_path, e
                ))
            })?;
        } else {
            fs::remove_file(output_path).map_err(|e| {
                SkillError::WriteError(format!("Failed to delete file {:?}: {}", output_path, e))
            })?;
        }
    }
    Ok(())
}

/// Recursively copy a skill directory into the installation location
pub fn copy_directory(source_dir: &Path, output_dir: &Path) -> Result<(), SkillError> {
    fs::create_dir_all(output_dir).map_err(|e| {
        SkillError::WriteError(format!(
            "Failed to create directory {:?}: {}",
            output_dir, e
        ))
    })?;

    for entry in fs::read_dir(source_dir).map_err(SkillError::LoadError)? {
        let entry = entry.map_err(SkillError::LoadError)?;
        let source_path = entry.path();
        let destination_path = output_dir.join(entry.file_name());

        if source_path.is_dir() {
            copy_directory(&source_path, &destination_path)?;
        } else {
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

#[cfg(test)]
mod tests {
    use super::*;
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
    fn test_expand_path() {
        let home = dirs::home_dir().expect("home dir");
        let path = expand_path("~/test/path");
        assert!(path.starts_with(home.to_str().unwrap()));
    }

    #[test]
    fn test_render_template_simple() {
        let template = "Hello, {{name}}!";
        let mut vars = HashMap::new();
        vars.insert("name".to_string(), "World".to_string());

        let result = render_template(template, &vars).unwrap();
        assert_eq!(result, "Hello, World!");
    }

    #[test]
    fn test_render_template_missing_var() {
        let template = "Hello, {{name}}!";
        let vars = HashMap::new();

        let result = render_template(template, &vars);
        assert!(result.is_err());
    }

    #[test]
    fn test_copy_directory_copies_nested_files() {
        let source_dir = temp_dir("renderer-copy-source");
        let output_dir = temp_dir("renderer-copy-output");

        fs::create_dir_all(source_dir.join("scripts")).unwrap();
        fs::write(source_dir.join("SKILL.md"), "# Jira").unwrap();
        fs::write(source_dir.join("scripts/search_jira.py"), "print('ok')").unwrap();

        copy_directory(&source_dir, &output_dir).unwrap();

        assert!(output_dir.join("SKILL.md").exists());
        assert!(output_dir.join("scripts/search_jira.py").exists());
    }

    #[test]
    fn test_delete_skill_path_removes_directory() {
        let output_dir = temp_dir("renderer-delete-dir");
        fs::write(output_dir.join("SKILL.md"), "# Jira").unwrap();

        delete_skill_path(&output_dir).unwrap();

        assert!(!output_dir.exists());
    }

    #[test]
    fn test_get_output_dir_uses_dot_workbuddy_skills() {
        let home_dir = dirs::home_dir().expect("home dir");
        let output_dir = get_output_dir(&TargetAppId::WorkBuddy, "mail");

        assert_eq!(output_dir, home_dir.join(".workbuddy").join("skills").join("mail"));
    }
}
