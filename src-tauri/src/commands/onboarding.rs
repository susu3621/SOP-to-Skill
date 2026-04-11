use crate::models::{
    GeneratedSkillIds, OnboardingAgentState, OnboardingAgentSyncPreview, OnboardingState,
    OnboardingSyncPlan, OnboardingUseCase,
};
use crate::onboarding::{
    generator::{
        stage_generated_use_case_skill_packages, StageOnboardingPackageInput, StagedOnboardingPackages,
    },
    state::{
        default_selected_install_skill_ids, generated_skill_ids_for_use_case,
        resolve_selected_install_skill_ids,
    },
    sync::build_selected_agent_install_sync_plans,
};
use crate::commands::skill::{self, SkillResult};
use crate::template::get_output_dir;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};

use super::parse_json_with_optional_utf8_bom;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct OnboardingInstallPreview {
    pub install_candidate_skill_ids: Vec<String>,
    pub generated_skill_ids: Vec<GeneratedSkillIds>,
    pub selected_agent_ids: Vec<String>,
    pub selected_install_skill_ids: Vec<String>,
    pub agent_previews: Vec<OnboardingAgentSyncPreview>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct OnboardingAgentSyncResult {
    pub agent_id: String,
    pub added_skill_ids: Vec<String>,
    pub removed_skill_ids: Vec<String>,
    pub unchanged_skill_ids: Vec<String>,
    pub success: bool,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct OnboardingBatchSyncResult {
    pub selected_agent_ids: Vec<String>,
    pub selected_install_skill_ids: Vec<String>,
    pub agent_results: Vec<OnboardingAgentSyncResult>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct OnboardingSyncCommandInput {
    pub state: OnboardingState,
    pub selected_use_cases: Vec<OnboardingUseCase>,
    pub agents: Vec<OnboardingAgentState>,
    #[serde(default)]
    pub staged_packages: Vec<StagedOnboardingPackages>,
}

const HOME_ENV_FILE_NAME: &str = ".env";
const ONBOARDING_MANAGED_ENV_KEYS: &[&str] = &[
    "CONFLUENCE_URL",
    "CONFLUENCE_USERNAME",
    "CONFLUENCE_PASSWORD",
    "JIRA_URL",
    "JIRA_USERNAME",
    "JIRA_PASSWORD",
    "MAIL_HOST",
    "MAIL_PORT",
    "MAIL_USERNAME",
    "MAIL_PASSWORD",
    "MAIL_FROM",
    "MAIL_USE_SSL",
    "MAIL_USE_STARTTLS",
];

fn get_onboarding_state_path() -> PathBuf {
    crate::template::get_config_path().with_file_name("onboarding-state.json")
}

fn build_staged_package_lookup(
    staged_packages: &[StagedOnboardingPackages],
) -> HashMap<String, PathBuf> {
    let mut lookup = HashMap::new();

    for staged in staged_packages {
        lookup.insert(staged.production.skill_id.clone(), staged.production.source_dir.clone());
        lookup.insert(staged.test.skill_id.clone(), staged.test.source_dir.clone());
    }

    lookup
}

fn validate_selected_agent_ids(
    agents: &[OnboardingAgentState],
    selected_agent_ids: &[String],
) -> Result<(), String> {
    let available_agent_ids: HashSet<&str> = agents.iter().map(|agent| agent.id.as_str()).collect();
    let mut invalid_agent_ids = Vec::new();

    for agent_id in selected_agent_ids {
        let agent_id_str = agent_id.as_str();
        let supported_backend_agent = skill::parse_target_app_id(agent_id_str).is_ok();

        if (!available_agent_ids.contains(agent_id_str) || !supported_backend_agent)
            && !invalid_agent_ids.contains(agent_id)
        {
            invalid_agent_ids.push(agent_id.clone());
        }
    }

    if invalid_agent_ids.is_empty() {
        Ok(())
    } else {
        Err(format!(
            "Unsupported agent ids: {}",
            invalid_agent_ids.join(", ")
        ))
    }
}

fn get_onboarding_home_env_path() -> Result<PathBuf, String> {
    let data_root = crate::template::get_data_root();
    let home_dir = data_root.parent().filter(|path| !path.as_os_str().is_empty());

    home_dir
        .map(|path| path.join(HOME_ENV_FILE_NAME))
        .or_else(|| dirs::home_dir().map(|path| path.join(HOME_ENV_FILE_NAME)))
        .ok_or_else(|| "Failed to resolve home directory for ~/.env".to_string())
}

fn require_non_empty_credential_value(
    credential_values: &HashMap<String, String>,
    field_id: &str,
) -> Result<String, String> {
    credential_values
        .get(field_id)
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
        .map(|value| value.to_string())
        .ok_or_else(|| format!("Missing required credential field: {}", field_id))
}

fn build_onboarding_home_env_entries(
    state: &OnboardingState,
) -> Result<Vec<(String, String)>, String> {
    let mut entries = Vec::new();

    for base_skill_id in &state.selected_base_skill_ids {
        match base_skill_id.as_str() {
            "confluence" => {
                entries.push((
                    "CONFLUENCE_URL".to_string(),
                    require_non_empty_credential_value(&state.credential_values, "confluenceUrl")?,
                ));
                entries.push((
                    "CONFLUENCE_USERNAME".to_string(),
                    require_non_empty_credential_value(
                        &state.credential_values,
                        "confluenceUsername",
                    )?,
                ));
                entries.push((
                    "CONFLUENCE_PASSWORD".to_string(),
                    require_non_empty_credential_value(
                        &state.credential_values,
                        "confluencePassword",
                    )?,
                ));
            }
            "jira" => {
                entries.push((
                    "JIRA_URL".to_string(),
                    require_non_empty_credential_value(&state.credential_values, "jiraUrl")?,
                ));
                entries.push((
                    "JIRA_USERNAME".to_string(),
                    require_non_empty_credential_value(&state.credential_values, "jiraUsername")?,
                ));
                entries.push((
                    "JIRA_PASSWORD".to_string(),
                    require_non_empty_credential_value(&state.credential_values, "jiraPassword")?,
                ));
            }
            "mail" => {
                let username =
                    require_non_empty_credential_value(&state.credential_values, "mailUsername")?;
                let password =
                    require_non_empty_credential_value(&state.credential_values, "mailPassword")?;

                entries.push(("MAIL_HOST".to_string(), "smtp.exmail.qq.com".to_string()));
                entries.push(("MAIL_PORT".to_string(), "465".to_string()));
                entries.push(("MAIL_USERNAME".to_string(), username.clone()));
                entries.push(("MAIL_PASSWORD".to_string(), password));
                entries.push(("MAIL_FROM".to_string(), username));
                entries.push(("MAIL_USE_SSL".to_string(), "true".to_string()));
                entries.push(("MAIL_USE_STARTTLS".to_string(), "false".to_string()));
            }
            _ => {}
        }
    }

    Ok(entries)
}

fn parse_env_assignment_key(line: &str) -> Option<&str> {
    let trimmed = line.trim_start();
    let trimmed = trimmed.strip_prefix("export ").unwrap_or(trimmed);
    let (key, _) = trimmed.split_once('=')?;

    if key.is_empty()
        || !key
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || character == '_')
    {
        return None;
    }

    Some(key)
}

fn escape_env_value(value: &str) -> String {
    value
        .replace('\\', "\\\\")
        .replace('"', "\\\"")
        .replace('\n', "\\n")
}

fn format_env_assignment(key: &str, value: &str) -> String {
    format!(r#"{key}="{}""#, escape_env_value(value))
}

fn write_managed_home_env_entries(
    env_path: &Path,
    managed_entries: &[(String, String)],
) -> Result<(), String> {
    let existing_content = match fs::read_to_string(env_path) {
        Ok(content) => content,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => String::new(),
        Err(error) => return Err(format!("Failed to read {:?}: {}", env_path, error)),
    };

    if managed_entries.is_empty() && existing_content.is_empty() {
        return Ok(());
    }

    let managed_map = managed_entries
        .iter()
        .map(|(key, value)| (key.as_str(), value.as_str()))
        .collect::<HashMap<_, _>>();
    let managed_key_set = ONBOARDING_MANAGED_ENV_KEYS
        .iter()
        .copied()
        .collect::<HashSet<_>>();
    let mut written_keys = HashSet::new();
    let mut output_lines = Vec::new();

    for line in existing_content.lines() {
        if let Some(key) = parse_env_assignment_key(line) {
            if managed_key_set.contains(key) {
                if let Some(value) = managed_map.get(key) {
                    if written_keys.insert(key.to_string()) {
                        output_lines.push(format_env_assignment(key, value));
                    }
                }
                continue;
            }
        }

        output_lines.push(line.to_string());
    }

    for (key, value) in managed_entries {
        if written_keys.insert(key.clone()) {
            output_lines.push(format_env_assignment(key, value));
        }
    }

    let mut rendered = output_lines.join("\n");
    if !rendered.is_empty() {
        rendered.push('\n');
    }

    fs::write(env_path, rendered).map_err(|error| format!("Failed to write {:?}: {}", env_path, error))
}

fn sync_onboarding_credentials_to_env_path(
    state: &OnboardingState,
    env_path: &Path,
) -> Result<(), String> {
    let managed_entries = build_onboarding_home_env_entries(state)?;
    write_managed_home_env_entries(env_path, &managed_entries)
}

fn sync_onboarding_credentials_to_home_env(state: &OnboardingState) -> Result<(), String> {
    let env_path = get_onboarding_home_env_path()?;
    sync_onboarding_credentials_to_env_path(state, &env_path)
}

#[tauri::command]
pub fn get_onboarding_state() -> SkillResult<OnboardingState> {
    SkillResult::Success { success: load_onboarding_state() }
}

#[tauri::command]
pub fn set_onboarding_state(state: OnboardingState) -> SkillResult<OnboardingState> {
    match save_onboarding_state(&state) {
        Ok(()) => SkillResult::Success { success: state },
        Err(error) => SkillResult::Error { error },
    }
}

#[tauri::command]
pub fn sync_onboarding_credentials(state: OnboardingState) -> SkillResult<bool> {
    match sync_onboarding_credentials_to_home_env(&state) {
        Ok(()) => SkillResult::Success { success: true },
        Err(error) => SkillResult::Error { error },
    }
}

#[tauri::command]
pub fn get_onboarding_install_preview(
    state: OnboardingState,
    selected_use_cases: Vec<OnboardingUseCase>,
    agents: Vec<OnboardingAgentState>,
) -> SkillResult<OnboardingInstallPreview> {
    if let Err(error) = validate_selected_agent_ids(&agents, &state.selected_agent_ids) {
        return SkillResult::Error { error };
    }

    SkillResult::Success { success: build_onboarding_install_preview(
        &state,
        &selected_use_cases,
        &agents,
    ) }
}

#[tauri::command]
pub fn stage_onboarding_generated_packages(
    input: StageOnboardingPackageInput,
) -> SkillResult<StagedOnboardingPackages> {
    match stage_generated_use_case_skill_packages(&input) {
        Ok(result) => SkillResult::Success { success: result },
        Err(error) => SkillResult::Error {
            error: error.to_string(),
        },
    }
}

#[tauri::command]
pub async fn sync_onboarding_installation(
    input: OnboardingSyncCommandInput,
) -> SkillResult<OnboardingBatchSyncResult> {
    if let Err(error) = validate_selected_agent_ids(&input.agents, &input.state.selected_agent_ids) {
        return SkillResult::Error { error };
    }

    if let Err(error) = sync_onboarding_credentials_to_home_env(&input.state) {
        return SkillResult::Error { error };
    }

    let preview = build_onboarding_install_preview(
        &input.state,
        &input.selected_use_cases,
        &input.agents,
    );
    let staged_package_lookup = build_staged_package_lookup(&input.staged_packages);
    let mut agent_results = Vec::new();

    for agent_preview in preview.agent_previews {
        let Some(agent_state) = input
            .agents
            .iter()
            .find(|agent| agent.id == agent_preview.agent_id)
        else {
            agent_results.push(OnboardingAgentSyncResult {
                agent_id: agent_preview.agent_id,
                added_skill_ids: agent_preview.added_skill_ids,
                removed_skill_ids: agent_preview.removed_skill_ids,
                unchanged_skill_ids: agent_preview.unchanged_skill_ids,
                success: false,
                error: Some("Missing agent state".to_string()),
            });
            continue;
        };

        let mut result_error: Option<String> = None;

        for skill_id in &agent_preview.removed_skill_ids {
            match skill::uninstall_skill(skill_id.clone(), agent_state.id.clone()).await {
                SkillResult::Success { .. } => {}
                SkillResult::Error { error } => {
                    result_error = Some(error);
                    break;
                }
            }
        }

        if result_error.is_none() {
            for skill_id in &agent_preview.added_skill_ids {
                if let Some(source_dir) = staged_package_lookup.get(skill_id) {
                    let target_app_id = match skill::parse_target_app_id(&agent_state.id) {
                        Ok(app_id) => app_id,
                        Err(error) => {
                            result_error = Some(error.to_string());
                            break;
                        }
                    };

                    let output_dir = get_output_dir(&target_app_id, skill_id);
                    match skill::install_directory_package_at_path(
                        skill_id,
                        &target_app_id,
                        source_dir,
                        &output_dir,
                        "local",
                        &HashMap::new(),
                        true,
                        None,
                    ) {
                        Ok(_) => {}
                        Err(error) => {
                            result_error = Some(error.to_string());
                            break;
                        }
                    }
                } else {
                    match skill::install_skill(
                        skill_id.clone(),
                        agent_state.id.clone(),
                        HashMap::new(),
                    )
                    .await
                    {
                        SkillResult::Success { .. } => {}
                        SkillResult::Error { error } => {
                            result_error = Some(error);
                            break;
                        }
                    }
                }
            }
        }

        agent_results.push(OnboardingAgentSyncResult {
            agent_id: agent_preview.agent_id,
            added_skill_ids: agent_preview.added_skill_ids,
            removed_skill_ids: agent_preview.removed_skill_ids,
            unchanged_skill_ids: agent_preview.unchanged_skill_ids,
            success: result_error.is_none(),
            error: result_error,
        });
    }

    SkillResult::Success {
        success: OnboardingBatchSyncResult {
            selected_agent_ids: preview.selected_agent_ids,
            selected_install_skill_ids: preview.selected_install_skill_ids,
            agent_results,
        },
    }
}

pub fn load_onboarding_state() -> OnboardingState {
    let path = get_onboarding_state_path();

    if let Ok(content) = fs::read_to_string(path) {
        if let Ok(state) = parse_json_with_optional_utf8_bom(&content) {
            return state;
        }
    }

    OnboardingState::default()
}

pub fn save_onboarding_state(state: &OnboardingState) -> Result<(), String> {
    let content = serde_json::to_string_pretty(state)
        .map_err(|error| format!("Failed to serialize onboarding state: {error}"))?;
    fs::write(get_onboarding_state_path(), content)
        .map_err(|error| format!("Failed to write onboarding state: {error}"))
}

pub fn build_onboarding_install_preview(
    state: &OnboardingState,
    selected_use_cases: &[OnboardingUseCase],
    agents: &[OnboardingAgentState],
) -> OnboardingInstallPreview {
    let generated_skill_ids = selected_use_cases
        .iter()
        .filter(|use_case| {
            use_case
                .applicable_role_ids
                .iter()
                .any(|role_id| role_id == &state.selected_role_id)
        })
        .map(|use_case| generated_skill_ids_for_use_case(&state.selected_role_id, &use_case.directory))
        .collect::<Vec<_>>();

    let managed_skill_ids = default_selected_install_skill_ids(
        &state.selected_base_skill_ids,
        &state.selected_role_id,
        selected_use_cases,
    );
    let selected_install_skill_ids = resolve_selected_install_skill_ids(state, &managed_skill_ids);

    let plan: OnboardingSyncPlan = build_selected_agent_install_sync_plans(
        agents,
        &managed_skill_ids,
        &state.selected_agent_ids,
        &selected_install_skill_ids,
    );

    OnboardingInstallPreview {
        install_candidate_skill_ids: managed_skill_ids,
        generated_skill_ids,
        selected_agent_ids: plan.selected_agent_ids,
        selected_install_skill_ids: plan.selected_install_skill_ids,
        agent_previews: plan.agent_previews,
    }
}

#[cfg(test)]
pub fn apply_onboarding_sync_plan<F>(
    plan: OnboardingSyncPlan,
    mut apply_agent: F,
) -> OnboardingBatchSyncResult
where
    F: FnMut(&OnboardingAgentSyncPreview) -> Result<(), String>,
{
    let mut agent_results = Vec::new();

    for agent_preview in plan.agent_previews {
        let result = apply_agent(&agent_preview);
        agent_results.push(OnboardingAgentSyncResult {
            agent_id: agent_preview.agent_id,
            added_skill_ids: agent_preview.added_skill_ids,
            removed_skill_ids: agent_preview.removed_skill_ids,
            unchanged_skill_ids: agent_preview.unchanged_skill_ids,
            success: result.is_ok(),
            error: result.err(),
        });
    }

    OnboardingBatchSyncResult {
        selected_agent_ids: plan.selected_agent_ids,
        selected_install_skill_ids: plan.selected_install_skill_ids,
        agent_results,
    }
}

#[cfg(test)]
mod tests {
    use super::{
        apply_onboarding_sync_plan, build_onboarding_install_preview,
        OnboardingAgentSyncResult,
    };
    use crate::models::{
        OnboardingAgentState, OnboardingRoleUseCaseContent, OnboardingState, OnboardingUseCase,
    };
    use crate::onboarding::state::default_selected_install_skill_ids;
    use super::OnboardingSyncCommandInput;
    use std::collections::HashMap;
    use std::fs;
    use std::path::PathBuf;
    use std::sync::{Mutex, OnceLock};
    use std::time::{SystemTime, UNIX_EPOCH};

    const DATA_DIR_ENV_VAR: &str = "SKILL_CONFIGURATOR_DATA_DIR";

    fn temp_dir(prefix: &str) -> PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("time went backwards")
            .as_nanos();
        let path = std::env::temp_dir().join(format!("onboarding-command-{prefix}-{unique}"));
        fs::create_dir_all(&path).expect("create temp dir");
        path
    }

    fn env_lock() -> &'static Mutex<()> {
        static LOCK: OnceLock<Mutex<()>> = OnceLock::new();
        LOCK.get_or_init(|| Mutex::new(()))
    }

    fn restore_env_var(key: &str, value: Option<String>) {
        match value {
            Some(value) => std::env::set_var(key, value),
            None => std::env::remove_var(key),
        }
    }

    #[test]
    fn onboarding_preview_returns_both_generated_package_ids() {
        let state = OnboardingState {
            selected_agent_ids: vec!["codex".to_string(), "workbuddy".to_string()],
            selected_role_id: "project-manager".to_string(),
            selected_base_skill_ids: vec!["jira".to_string(), "confluence".to_string()],
            role_use_case_contents: vec![OnboardingRoleUseCaseContent {
                role_id: "project-manager".to_string(),
                use_case_id: "weekly-report".to_string(),
                use_case_name: "项目周报".to_string(),
                description: "按周报模板输出项目状态".to_string(),
                info_sources: "Jira 看板、Confluence 模板".to_string(),
                rules: "先风险后里程碑".to_string(),
            }],
            selected_install_skill_ids: default_selected_install_skill_ids(
                &["jira".to_string(), "confluence".to_string()],
                "project-manager",
                &[OnboardingUseCase {
                    id: "weekly-report".to_string(),
                    name: "项目周报".to_string(),
                    directory: "weekly-report".to_string(),
                    applicable_role_ids: vec!["project-manager".to_string()],
                }],
            ),
            selected_install_skill_ids_initialized: false,
            selected_install_candidate_skill_ids: vec![],
            credential_values: std::collections::HashMap::new(),
        };

        let preview = build_onboarding_install_preview(
            &state,
            &[OnboardingUseCase {
                id: "weekly-report".to_string(),
                name: "项目周报".to_string(),
                directory: "weekly-report".to_string(),
                applicable_role_ids: vec!["project-manager".to_string()],
            }],
            &[
                OnboardingAgentState {
                    id: "codex".to_string(),
                    installed_skill_ids: vec![],
                },
                OnboardingAgentState {
                    id: "workbuddy".to_string(),
                    installed_skill_ids: vec![],
                },
            ],
        );

        assert_eq!(
            preview.generated_skill_ids,
            vec![crate::models::GeneratedSkillIds {
                production_skill_id: "project-manager-weekly-report".to_string(),
                test_skill_id: "test-project-manager-weekly-report".to_string(),
            }]
        );
        assert!(preview
            .selected_install_skill_ids
            .contains(&"project-manager-weekly-report".to_string()));
        assert!(preview
            .selected_install_skill_ids
            .contains(&"test-project-manager-weekly-report".to_string()));
    }

    #[test]
    fn onboarding_preview_returns_full_install_candidate_set_and_keeps_explicit_empty_selection_empty() {
        let state = OnboardingState {
            selected_agent_ids: vec!["codex".to_string()],
            selected_role_id: "project-manager".to_string(),
            selected_base_skill_ids: vec!["jira".to_string()],
            role_use_case_contents: vec![OnboardingRoleUseCaseContent {
                role_id: "project-manager".to_string(),
                use_case_id: "weekly-report".to_string(),
                use_case_name: "项目周报".to_string(),
                description: "按周报模板输出项目状态".to_string(),
                info_sources: "Jira 看板".to_string(),
                rules: "先风险后里程碑".to_string(),
            }],
            selected_install_skill_ids: vec![],
            selected_install_skill_ids_initialized: true,
            selected_install_candidate_skill_ids: vec![
                "jira".to_string(),
                "project-manager-weekly-report".to_string(),
                "test-project-manager-weekly-report".to_string(),
            ],
            credential_values: std::collections::HashMap::new(),
        };

        let preview = build_onboarding_install_preview(
            &state,
            &[OnboardingUseCase {
                id: "weekly-report".to_string(),
                name: "项目周报".to_string(),
                directory: "weekly-report".to_string(),
                applicable_role_ids: vec!["project-manager".to_string()],
            }],
            &[OnboardingAgentState {
                id: "codex".to_string(),
                installed_skill_ids: vec![
                    "jira".to_string(),
                    "project-manager-weekly-report".to_string(),
                    "test-project-manager-weekly-report".to_string(),
                    "legacy-package".to_string(),
                ],
            }],
        );

        assert_eq!(
            preview.install_candidate_skill_ids,
            vec![
                "jira".to_string(),
                "project-manager-weekly-report".to_string(),
                "test-project-manager-weekly-report".to_string(),
            ]
        );
        assert!(preview.selected_install_skill_ids.is_empty());
        assert_eq!(
            preview.agent_previews[0].removed_skill_ids,
            vec![
                "jira".to_string(),
                "project-manager-weekly-report".to_string(),
                "test-project-manager-weekly-report".to_string(),
            ]
        );
        assert_eq!(
            preview.agent_previews[0].unchanged_skill_ids,
            vec!["legacy-package".to_string()]
        );
    }

    #[test]
    fn onboarding_preview_defaults_fresh_state_to_all_managed_candidates() {
        let state = OnboardingState {
            selected_agent_ids: vec!["codex".to_string()],
            selected_role_id: "project-manager".to_string(),
            selected_base_skill_ids: vec!["jira".to_string()],
            role_use_case_contents: vec![],
            selected_install_skill_ids: vec![],
            selected_install_skill_ids_initialized: false,
            selected_install_candidate_skill_ids: vec![],
            credential_values: std::collections::HashMap::new(),
        };

        let preview = build_onboarding_install_preview(
            &state,
            &[OnboardingUseCase {
                id: "weekly-report".to_string(),
                name: "项目周报".to_string(),
                directory: "weekly-report".to_string(),
                applicable_role_ids: vec!["project-manager".to_string()],
            }],
            &[OnboardingAgentState {
                id: "codex".to_string(),
                installed_skill_ids: vec![],
            }],
        );

        assert_eq!(
            preview.selected_install_skill_ids,
            vec![
                "jira".to_string(),
                "project-manager-weekly-report".to_string(),
                "test-project-manager-weekly-report".to_string(),
            ]
        );
    }

    #[test]
    fn onboarding_preview_prunes_stale_generated_ids_without_forcing_current_generated_ids_back_in() {
        let state = OnboardingState {
            selected_agent_ids: vec!["codex".to_string()],
            selected_role_id: "sales-manager".to_string(),
            selected_base_skill_ids: vec!["jira".to_string()],
            role_use_case_contents: vec![OnboardingRoleUseCaseContent {
                role_id: "sales-manager".to_string(),
                use_case_id: "daily-log".to_string(),
                use_case_name: "记录日志".to_string(),
                description: "记录销售过程".to_string(),
                info_sources: "CRM".to_string(),
                rules: "按日同步".to_string(),
            }],
            selected_install_skill_ids: vec![
                "jira".to_string(),
                "project-manager-weekly-report".to_string(),
            ],
            selected_install_skill_ids_initialized: false,
            selected_install_candidate_skill_ids: vec![
                "jira".to_string(),
                "project-manager-weekly-report".to_string(),
                "test-project-manager-weekly-report".to_string(),
            ],
            credential_values: std::collections::HashMap::new(),
        };

        let preview = build_onboarding_install_preview(
            &state,
            &[OnboardingUseCase {
                id: "daily-log".to_string(),
                name: "记录日志".to_string(),
                directory: "daily-log".to_string(),
                applicable_role_ids: vec!["sales-manager".to_string()],
            }],
            &[OnboardingAgentState {
                id: "codex".to_string(),
                installed_skill_ids: vec![],
            }],
        );

        assert_eq!(
            preview.generated_skill_ids,
            vec![crate::models::GeneratedSkillIds {
                production_skill_id: "sales-manager-daily-log".to_string(),
                test_skill_id: "test-sales-manager-daily-log".to_string(),
            }]
        );
        assert_eq!(
            preview.selected_install_skill_ids,
            vec![
                "jira".to_string(),
                "sales-manager-daily-log".to_string(),
                "test-sales-manager-daily-log".to_string(),
            ]
        );
    }

    #[test]
    fn onboarding_preview_removes_deselected_managed_skills_from_selected_agents() {
        let state = OnboardingState {
            selected_agent_ids: vec!["codex".to_string()],
            selected_role_id: "project-manager".to_string(),
            selected_base_skill_ids: vec!["jira".to_string()],
            role_use_case_contents: vec![OnboardingRoleUseCaseContent {
                role_id: "project-manager".to_string(),
                use_case_id: "weekly-report".to_string(),
                use_case_name: "项目周报".to_string(),
                description: "按周报模板输出项目状态".to_string(),
                info_sources: "Jira 看板".to_string(),
                rules: "先风险后里程碑".to_string(),
            }],
            selected_install_skill_ids: vec!["jira".to_string()],
            selected_install_skill_ids_initialized: false,
            selected_install_candidate_skill_ids: vec![
                "jira".to_string(),
                "project-manager-weekly-report".to_string(),
                "test-project-manager-weekly-report".to_string(),
            ],
            credential_values: std::collections::HashMap::new(),
        };

        let preview = build_onboarding_install_preview(
            &state,
            &[OnboardingUseCase {
                id: "weekly-report".to_string(),
                name: "项目周报".to_string(),
                directory: "weekly-report".to_string(),
                applicable_role_ids: vec!["project-manager".to_string()],
            }],
            &[OnboardingAgentState {
                id: "codex".to_string(),
                installed_skill_ids: vec![
                    "jira".to_string(),
                    "project-manager-weekly-report".to_string(),
                    "test-project-manager-weekly-report".to_string(),
                    "legacy-package".to_string(),
                ],
            }],
        );

        assert_eq!(preview.selected_install_skill_ids, vec!["jira".to_string()]);
        assert_eq!(preview.agent_previews.len(), 1);
        assert_eq!(
            preview.agent_previews[0].removed_skill_ids,
            vec![
                "project-manager-weekly-report".to_string(),
                "test-project-manager-weekly-report".to_string(),
            ]
        );
        assert_eq!(
            preview.agent_previews[0].unchanged_skill_ids,
            vec!["jira".to_string(), "legacy-package".to_string()]
        );
    }

    #[test]
    fn onboarding_preview_rejects_unsupported_agent_ids_at_the_command_boundary() {
        let state = OnboardingState {
            selected_agent_ids: vec!["missing-agent".to_string()],
            selected_role_id: "project-manager".to_string(),
            selected_base_skill_ids: vec!["jira".to_string()],
            role_use_case_contents: vec![],
            selected_install_skill_ids: vec![],
            selected_install_skill_ids_initialized: false,
            selected_install_candidate_skill_ids: vec![],
            credential_values: std::collections::HashMap::new(),
        };

        let result = super::get_onboarding_install_preview(
            state,
            vec![OnboardingUseCase {
                id: "weekly-report".to_string(),
                name: "项目周报".to_string(),
                directory: "weekly-report".to_string(),
                applicable_role_ids: vec!["project-manager".to_string()],
            }],
            vec![OnboardingAgentState {
                id: "codex".to_string(),
                installed_skill_ids: vec![],
            }],
        );

        assert!(matches!(
            result,
            crate::commands::skill::SkillResult::Error { ref error }
            if error == "Unsupported agent ids: missing-agent"
        ));
    }

    #[test]
    fn onboarding_preview_rejects_selected_agent_ids_even_when_the_payload_includes_unsupported_targets() {
        let state = OnboardingState {
            selected_agent_ids: vec!["staging".to_string()],
            selected_role_id: "project-manager".to_string(),
            selected_base_skill_ids: vec!["jira".to_string()],
            role_use_case_contents: vec![],
            selected_install_skill_ids: vec![],
            selected_install_skill_ids_initialized: false,
            selected_install_candidate_skill_ids: vec![],
            credential_values: std::collections::HashMap::new(),
        };

        let result = super::get_onboarding_install_preview(
            state,
            vec![OnboardingUseCase {
                id: "weekly-report".to_string(),
                name: "项目周报".to_string(),
                directory: "weekly-report".to_string(),
                applicable_role_ids: vec!["project-manager".to_string()],
            }],
            vec![
                OnboardingAgentState {
                    id: "codex".to_string(),
                    installed_skill_ids: vec![],
                },
                OnboardingAgentState {
                    id: "staging".to_string(),
                    installed_skill_ids: vec![],
                },
            ],
        );

        assert!(matches!(
            result,
            crate::commands::skill::SkillResult::Error { ref error }
            if error == "Unsupported agent ids: staging"
        ));
    }

    #[tokio::test]
    async fn onboarding_sync_rejects_unsupported_agent_ids_at_the_command_boundary() {
        let state = OnboardingState {
            selected_agent_ids: vec!["missing-agent".to_string()],
            selected_role_id: "project-manager".to_string(),
            selected_base_skill_ids: vec!["jira".to_string()],
            role_use_case_contents: vec![],
            selected_install_skill_ids: vec![],
            selected_install_skill_ids_initialized: false,
            selected_install_candidate_skill_ids: vec![],
            credential_values: std::collections::HashMap::new(),
        };

        let result = super::sync_onboarding_installation(OnboardingSyncCommandInput {
            state,
            selected_use_cases: vec![OnboardingUseCase {
                id: "weekly-report".to_string(),
                name: "项目周报".to_string(),
                directory: "weekly-report".to_string(),
                applicable_role_ids: vec!["project-manager".to_string()],
            }],
            agents: vec![OnboardingAgentState {
                id: "codex".to_string(),
                installed_skill_ids: vec![],
            }],
            staged_packages: vec![],
        })
        .await;

        assert!(matches!(
            result,
            crate::commands::skill::SkillResult::Error { ref error }
            if error == "Unsupported agent ids: missing-agent"
        ));
    }

    #[tokio::test]
    async fn onboarding_sync_rejects_selected_agent_ids_even_when_the_payload_includes_unsupported_targets() {
        let state = OnboardingState {
            selected_agent_ids: vec!["staging".to_string()],
            selected_role_id: "project-manager".to_string(),
            selected_base_skill_ids: vec!["jira".to_string()],
            role_use_case_contents: vec![],
            selected_install_skill_ids: vec![],
            selected_install_skill_ids_initialized: false,
            selected_install_candidate_skill_ids: vec![],
            credential_values: std::collections::HashMap::new(),
        };

        let result = super::sync_onboarding_installation(OnboardingSyncCommandInput {
            state,
            selected_use_cases: vec![OnboardingUseCase {
                id: "weekly-report".to_string(),
                name: "项目周报".to_string(),
                directory: "weekly-report".to_string(),
                applicable_role_ids: vec!["project-manager".to_string()],
            }],
            agents: vec![
                OnboardingAgentState {
                    id: "codex".to_string(),
                    installed_skill_ids: vec![],
                },
                OnboardingAgentState {
                    id: "staging".to_string(),
                    installed_skill_ids: vec![],
                },
            ],
            staged_packages: vec![],
        })
        .await;

        assert!(matches!(
            result,
            crate::commands::skill::SkillResult::Error { ref error }
            if error == "Unsupported agent ids: staging"
        ));
    }

    #[test]
    fn onboarding_state_load_supports_utf8_bom_prefixed_json() {
        let _guard = env_lock().lock().unwrap();
        let data_dir = temp_dir("onboarding-state-bom");
        let state_path = data_dir.join("onboarding-state.json");
        let original_data_dir = std::env::var(DATA_DIR_ENV_VAR).ok();

        fs::write(
            &state_path,
            concat!(
                "\u{feff}",
                "{",
                "\"selected_agent_ids\":[\"workbuddy\"],",
                "\"selected_role_id\":\"\",",
                "\"selected_base_skill_ids\":[\"jira\"],",
                "\"role_use_case_contents\":[],",
                "\"selected_install_skill_ids\":[\"jira\"],",
                "\"selected_install_skill_ids_initialized\":true,",
                "\"selected_install_candidate_skill_ids\":[\"jira\"],",
                "\"credential_values\":{\"jiraUrl\":\"https://jira.example.com\"}",
                "}"
            ),
        )
        .expect("write onboarding state");

        std::env::set_var(DATA_DIR_ENV_VAR, &data_dir);
        let loaded = super::load_onboarding_state();
        restore_env_var(DATA_DIR_ENV_VAR, original_data_dir);

        assert_eq!(loaded.selected_agent_ids, vec!["workbuddy".to_string()]);
        assert_eq!(loaded.selected_base_skill_ids, vec!["jira".to_string()]);
        assert_eq!(
            loaded.credential_values.get("jiraUrl"),
            Some(&"https://jira.example.com".to_string())
        );
    }

    #[test]
    fn onboarding_sync_writes_home_env_next_to_configured_data_root() {
        let _guard = env_lock().lock().unwrap();
        let actual_home = temp_dir("home-env-data-root-home");
        let data_dir = actual_home.join(".sop-to-skill");
        let unrelated_home = temp_dir("home-env-unrelated-home");
        let original_data_dir = std::env::var(DATA_DIR_ENV_VAR).ok();
        let original_home = std::env::var("HOME").ok();

        fs::create_dir_all(&data_dir).expect("create data dir");
        std::env::set_var(DATA_DIR_ENV_VAR, &data_dir);
        std::env::set_var("HOME", &unrelated_home);

        let state = OnboardingState {
            selected_agent_ids: vec!["workbuddy".to_string()],
            selected_role_id: "".to_string(),
            selected_base_skill_ids: vec![
                "confluence".to_string(),
                "jira".to_string(),
                "mail".to_string(),
            ],
            role_use_case_contents: vec![],
            selected_install_skill_ids: vec![
                "confluence".to_string(),
                "jira".to_string(),
                "mail".to_string(),
            ],
            selected_install_skill_ids_initialized: true,
            selected_install_candidate_skill_ids: vec![
                "confluence".to_string(),
                "jira".to_string(),
                "mail".to_string(),
            ],
            credential_values: HashMap::from([
                ("confluenceUrl".to_string(), "https://wiki.example.com".to_string()),
                ("confluenceUsername".to_string(), "wiki.user".to_string()),
                ("confluencePassword".to_string(), "wiki-secret".to_string()),
                ("jiraUrl".to_string(), "https://jira.example.com".to_string()),
                ("jiraUsername".to_string(), "jira.user".to_string()),
                ("jiraPassword".to_string(), "jira-secret".to_string()),
                ("mailUsername".to_string(), "pm@example.com".to_string()),
                ("mailPassword".to_string(), "mail-secret".to_string()),
            ]),
        };

        super::sync_onboarding_credentials_to_home_env(&state).expect("sync home env");

        restore_env_var("HOME", original_home);
        restore_env_var(DATA_DIR_ENV_VAR, original_data_dir);

        let actual_env_path = actual_home.join(".env");
        let unrelated_env_path = unrelated_home.join(".env");
        let content = fs::read_to_string(&actual_env_path).expect("read actual env");

        assert!(actual_env_path.exists());
        assert!(!unrelated_env_path.exists());
        assert!(content.contains("CONFLUENCE_URL=\"https://wiki.example.com\""));
        assert!(content.contains("JIRA_URL=\"https://jira.example.com\""));
        assert!(content.contains("MAIL_HOST=\"smtp.exmail.qq.com\""));
    }

    #[test]
    fn onboarding_sync_writes_selected_base_skill_credentials_to_home_env_file() {
        let home_dir = temp_dir("home-env");
        let env_path = home_dir.join(".env");
        fs::write(
            &env_path,
            "EXISTING_VAR=keep\nJIRA_URL=\"https://stale.example.com\"\n",
        )
        .expect("write existing env");

        let state = OnboardingState {
            selected_agent_ids: vec!["codex".to_string()],
            selected_role_id: "project-manager".to_string(),
            selected_base_skill_ids: vec![
                "confluence".to_string(),
                "jira".to_string(),
                "mail".to_string(),
            ],
            role_use_case_contents: vec![],
            selected_install_skill_ids: vec![],
            selected_install_skill_ids_initialized: false,
            selected_install_candidate_skill_ids: vec![],
            credential_values: HashMap::from([
                ("confluenceUrl".to_string(), "https://wiki.example.com".to_string()),
                ("confluenceUsername".to_string(), "wiki.user".to_string()),
                ("confluencePassword".to_string(), "wiki-secret".to_string()),
                ("jiraUrl".to_string(), "https://jira.example.com".to_string()),
                ("jiraUsername".to_string(), "jira.user".to_string()),
                ("jiraPassword".to_string(), "jira-secret".to_string()),
                ("mailUsername".to_string(), "pm@example.com".to_string()),
                ("mailPassword".to_string(), "mail-secret".to_string()),
            ]),
        };

        super::sync_onboarding_credentials_to_env_path(&state, &env_path).expect("sync env");

        let content = fs::read_to_string(&env_path).expect("read env");
        assert!(content.contains("EXISTING_VAR=keep"));
        assert!(content.contains("CONFLUENCE_URL=\"https://wiki.example.com\""));
        assert!(content.contains("CONFLUENCE_USERNAME=\"wiki.user\""));
        assert!(content.contains("CONFLUENCE_PASSWORD=\"wiki-secret\""));
        assert!(content.contains("JIRA_URL=\"https://jira.example.com\""));
        assert!(content.contains("JIRA_USERNAME=\"jira.user\""));
        assert!(content.contains("JIRA_PASSWORD=\"jira-secret\""));
        assert!(content.contains("MAIL_HOST=\"smtp.exmail.qq.com\""));
        assert!(content.contains("MAIL_PORT=\"465\""));
        assert!(content.contains("MAIL_USERNAME=\"pm@example.com\""));
        assert!(content.contains("MAIL_PASSWORD=\"mail-secret\""));
        assert!(content.contains("MAIL_FROM=\"pm@example.com\""));
        assert!(content.contains("MAIL_USE_SSL=\"true\""));
        assert!(content.contains("MAIL_USE_STARTTLS=\"false\""));
        assert!(!content.contains("https://stale.example.com"));
    }

    #[test]
    fn onboarding_sync_removes_deselected_base_skill_credentials_from_home_env_file() {
        let home_dir = temp_dir("home-env-prune");
        let env_path = home_dir.join(".env");
        fs::write(
            &env_path,
            concat!(
                "EXISTING_VAR=keep\n",
                "JIRA_URL=\"https://stale-jira.example.com\"\n",
                "JIRA_USERNAME=\"jira.old\"\n",
                "JIRA_PASSWORD=\"jira-old-secret\"\n",
                "MAIL_HOST=\"smtp.exmail.qq.com\"\n",
                "MAIL_PORT=\"465\"\n",
                "MAIL_USERNAME=\"old@example.com\"\n",
                "MAIL_PASSWORD=\"old-mail-secret\"\n",
                "MAIL_FROM=\"old@example.com\"\n",
                "MAIL_USE_SSL=\"true\"\n",
                "MAIL_USE_STARTTLS=\"false\"\n",
            ),
        )
        .expect("write existing env");

        let state = OnboardingState {
            selected_agent_ids: vec!["codex".to_string()],
            selected_role_id: "project-manager".to_string(),
            selected_base_skill_ids: vec!["jira".to_string()],
            role_use_case_contents: vec![],
            selected_install_skill_ids: vec![],
            selected_install_skill_ids_initialized: false,
            selected_install_candidate_skill_ids: vec![],
            credential_values: HashMap::from([
                ("jiraUrl".to_string(), "https://jira.example.com".to_string()),
                ("jiraUsername".to_string(), "jira.user".to_string()),
                ("jiraPassword".to_string(), "jira-secret".to_string()),
            ]),
        };

        super::sync_onboarding_credentials_to_env_path(&state, &env_path).expect("sync env");

        let content = fs::read_to_string(&env_path).expect("read env");
        assert!(content.contains("EXISTING_VAR=keep"));
        assert!(content.contains("JIRA_URL=\"https://jira.example.com\""));
        assert!(!content.contains("MAIL_HOST="));
        assert!(!content.contains("MAIL_PORT="));
        assert!(!content.contains("MAIL_USERNAME="));
        assert!(!content.contains("MAIL_PASSWORD="));
        assert!(!content.contains("MAIL_FROM="));
        assert!(!content.contains("MAIL_USE_SSL="));
        assert!(!content.contains("MAIL_USE_STARTTLS="));
    }

    #[test]
    fn onboarding_credentials_sync_command_writes_selected_base_skill_credentials_to_home_env_file(
    ) {
        let _guard = env_lock().lock().unwrap();
        let actual_home = temp_dir("home-env-command-home");
        let data_dir = actual_home.join(".sop-to-skill");
        let unrelated_home = temp_dir("home-env-command-unrelated-home");
        let original_data_dir = std::env::var(DATA_DIR_ENV_VAR).ok();
        let original_home = std::env::var("HOME").ok();

        fs::create_dir_all(&data_dir).expect("create data dir");
        std::env::set_var(DATA_DIR_ENV_VAR, &data_dir);
        std::env::set_var("HOME", &unrelated_home);

        let state = OnboardingState {
            selected_agent_ids: vec!["codex".to_string()],
            selected_role_id: "project-manager".to_string(),
            selected_base_skill_ids: vec!["jira".to_string(), "mail".to_string()],
            role_use_case_contents: vec![],
            selected_install_skill_ids: vec![],
            selected_install_skill_ids_initialized: false,
            selected_install_candidate_skill_ids: vec![],
            credential_values: HashMap::from([
                ("jiraUrl".to_string(), "https://jira.example.com".to_string()),
                ("jiraUsername".to_string(), "jira.user".to_string()),
                ("jiraPassword".to_string(), "jira-secret".to_string()),
                ("mailUsername".to_string(), "pm@example.com".to_string()),
                ("mailPassword".to_string(), "mail-secret".to_string()),
            ]),
        };

        let result = super::sync_onboarding_credentials(state);

        restore_env_var("HOME", original_home);
        restore_env_var(DATA_DIR_ENV_VAR, original_data_dir);

        assert!(matches!(
            result,
            crate::commands::skill::SkillResult::Success { success: true }
        ));

        let actual_env_path = actual_home.join(".env");
        let content = fs::read_to_string(&actual_env_path).expect("read actual env");

        assert!(actual_env_path.exists());
        assert!(!unrelated_home.join(".env").exists());
        assert!(content.contains("JIRA_URL=\"https://jira.example.com\""));
        assert!(content.contains("JIRA_USERNAME=\"jira.user\""));
        assert!(content.contains("MAIL_HOST=\"smtp.exmail.qq.com\""));
        assert!(content.contains("MAIL_FROM=\"pm@example.com\""));
    }

    #[tokio::test]
    async fn onboarding_sync_requires_required_atlassian_urls_before_installing() {
        let state = OnboardingState {
            selected_agent_ids: vec![],
            selected_role_id: "".to_string(),
            selected_base_skill_ids: vec!["jira".to_string()],
            role_use_case_contents: vec![],
            selected_install_skill_ids: vec![],
            selected_install_skill_ids_initialized: false,
            selected_install_candidate_skill_ids: vec![],
            credential_values: HashMap::from([
                ("jiraUsername".to_string(), "jira.user".to_string()),
                ("jiraPassword".to_string(), "jira-secret".to_string()),
            ]),
        };

        let result = super::sync_onboarding_installation(OnboardingSyncCommandInput {
            state,
            selected_use_cases: vec![],
            agents: vec![],
            staged_packages: vec![],
        })
        .await;

        assert!(matches!(
            result,
            crate::commands::skill::SkillResult::Error { ref error }
            if error.contains("jiraUrl")
        ));
    }

    #[test]
    fn onboarding_sync_preserves_partial_success_information_when_one_agent_sync_fails() {
        let plan = crate::onboarding::sync::build_selected_agent_install_sync_plans(
            &[
                OnboardingAgentState {
                    id: "codex".to_string(),
                    installed_skill_ids: vec!["jira".to_string()],
                },
                OnboardingAgentState {
                    id: "workbuddy".to_string(),
                    installed_skill_ids: vec!["confluence".to_string()],
                },
            ],
            &[
                "jira".to_string(),
                "confluence".to_string(),
                "project-manager-weekly-report".to_string(),
                "test-project-manager-weekly-report".to_string(),
            ],
            &["codex".to_string(), "workbuddy".to_string()],
            &[
                "jira".to_string(),
                "confluence".to_string(),
                "project-manager-weekly-report".to_string(),
                "test-project-manager-weekly-report".to_string(),
            ],
        );

        let result = apply_onboarding_sync_plan(plan, |agent_preview| {
            if agent_preview.agent_id == "workbuddy" {
                Err("simulated sync failure".to_string())
            } else {
                Ok(())
            }
        });

        assert_eq!(result.selected_agent_ids, vec!["codex".to_string(), "workbuddy".to_string()]);
        assert_eq!(result.agent_results.len(), 2);
        assert_eq!(
            result.agent_results,
            vec![
                OnboardingAgentSyncResult {
                    agent_id: "codex".to_string(),
                    added_skill_ids: vec![
                        "confluence".to_string(),
                        "project-manager-weekly-report".to_string(),
                        "test-project-manager-weekly-report".to_string(),
                    ],
                    removed_skill_ids: vec![],
                    unchanged_skill_ids: vec!["jira".to_string()],
                    success: true,
                    error: None,
                },
                OnboardingAgentSyncResult {
                    agent_id: "workbuddy".to_string(),
                    added_skill_ids: vec![
                        "jira".to_string(),
                        "project-manager-weekly-report".to_string(),
                        "test-project-manager-weekly-report".to_string(),
                    ],
                    removed_skill_ids: vec![],
                    unchanged_skill_ids: vec!["confluence".to_string()],
                    success: false,
                    error: Some("simulated sync failure".to_string()),
                },
            ]
        );
    }
}
