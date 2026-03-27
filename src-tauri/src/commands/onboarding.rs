use crate::models::{
    GeneratedSkillIds, OnboardingAgentState, OnboardingAgentSyncPreview, OnboardingState,
    OnboardingSyncPlan, OnboardingUseCase,
};
use crate::onboarding::{
    generator::{
        stage_generated_use_case_skill_packages, StageOnboardingPackageInput, StagedOnboardingPackages,
    },
    state::{default_selected_install_skill_ids, generated_skill_ids_for_use_case},
    sync::build_selected_agent_install_sync_plans,
};
use crate::commands::skill::{self, SkillResult};
use crate::template::get_output_dir;
use serde::{Deserialize, Serialize};
use std::fs;
use std::collections::HashMap;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct OnboardingInstallPreview {
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

#[tauri::command]
pub fn get_onboarding_state() -> SkillResult<OnboardingState> {
    SkillResult::Success(load_onboarding_state())
}

#[tauri::command]
pub fn set_onboarding_state(state: OnboardingState) -> SkillResult<OnboardingState> {
    match save_onboarding_state(&state) {
        Ok(()) => SkillResult::Success(state),
        Err(error) => SkillResult::Error { error },
    }
}

#[tauri::command]
pub fn get_onboarding_install_preview(
    state: OnboardingState,
    selected_use_cases: Vec<OnboardingUseCase>,
    agents: Vec<OnboardingAgentState>,
) -> SkillResult<OnboardingInstallPreview> {
    SkillResult::Success(build_onboarding_install_preview(
        &state,
        &selected_use_cases,
        &agents,
    ))
}

#[tauri::command]
pub fn stage_onboarding_generated_packages(
    input: StageOnboardingPackageInput,
) -> SkillResult<StagedOnboardingPackages> {
    match stage_generated_use_case_skill_packages(&input) {
        Ok(result) => SkillResult::Success(result),
        Err(error) => SkillResult::Error {
            error: error.to_string(),
        },
    }
}

#[tauri::command]
pub async fn sync_onboarding_installation(
    input: OnboardingSyncCommandInput,
) -> SkillResult<OnboardingBatchSyncResult> {
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
                SkillResult::Success(_) => {}
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
                        SkillResult::Success(_) => {}
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

    SkillResult::Success(OnboardingBatchSyncResult {
        selected_agent_ids: preview.selected_agent_ids,
        selected_install_skill_ids: preview.selected_install_skill_ids,
        agent_results,
    })
}

pub fn load_onboarding_state() -> OnboardingState {
    let path = get_onboarding_state_path();

    if let Ok(content) = fs::read_to_string(path) {
        if let Ok(state) = serde_json::from_str(&content) {
            return state;
        }
    }

    OnboardingState {
        selected_agent_ids: Vec::new(),
        selected_role_id: String::new(),
        selected_base_skill_ids: Vec::new(),
        role_use_case_contents: Vec::new(),
        selected_install_skill_ids: Vec::new(),
        credential_values: std::collections::HashMap::new(),
    }
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

    let mut selected_install_skill_ids = if state.selected_install_skill_ids.is_empty() {
        default_selected_install_skill_ids(
            &state.selected_base_skill_ids,
            &state.selected_role_id,
            selected_use_cases,
        )
    } else {
        state.selected_install_skill_ids.clone()
    };

    for ids in &generated_skill_ids {
        if !selected_install_skill_ids.contains(&ids.production_skill_id) {
            selected_install_skill_ids.push(ids.production_skill_id.clone());
        }
        if !selected_install_skill_ids.contains(&ids.test_skill_id) {
            selected_install_skill_ids.push(ids.test_skill_id.clone());
        }
    }

    let managed_skill_ids = selected_install_skill_ids.clone();
    let plan: OnboardingSyncPlan = build_selected_agent_install_sync_plans(
        agents,
        &managed_skill_ids,
        &state.selected_agent_ids,
        &selected_install_skill_ids,
    );

    OnboardingInstallPreview {
        generated_skill_ids,
        selected_agent_ids: plan.selected_agent_ids,
        selected_install_skill_ids: plan.selected_install_skill_ids,
        agent_previews: plan.agent_previews,
    }
}

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
