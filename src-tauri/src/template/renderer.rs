use crate::models::{SkillError, SkillTemplate, TargetAppId};
use handlebars::Handlebars;
use serde_json::{json, Value as JsonValue};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

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

/// Delete a skill file
pub fn delete_skill_file(output_path: &PathBuf) -> Result<(), SkillError> {
    if output_path.exists() {
        fs::remove_file(output_path).map_err(|e| {
            SkillError::WriteError(format!("Failed to delete file {:?}: {}", output_path, e))
        })?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

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
}
