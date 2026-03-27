use crate::models::{OnboardingAgentState, OnboardingAgentSyncPreview, OnboardingSyncPlan};
use std::collections::HashSet;

fn contains_skill(skill_ids: &HashSet<&str>, skill_id: &str) -> bool {
    skill_ids.contains(skill_id)
}

fn normalize_selected_agent_ids(
    agents: &[OnboardingAgentState],
    selected_agent_ids: &[String],
) -> Vec<String> {
    let available_agent_ids: HashSet<&str> = agents.iter().map(|agent| agent.id.as_str()).collect();
    let mut seen_agent_ids: HashSet<&str> = HashSet::new();
    let mut normalized_agent_ids = Vec::new();

    for agent_id in selected_agent_ids {
        let agent_id_str = agent_id.as_str();

        if available_agent_ids.contains(agent_id_str) && seen_agent_ids.insert(agent_id_str) {
            normalized_agent_ids.push(agent_id.clone());
        }
    }

    normalized_agent_ids
}

fn normalize_selected_install_skill_ids(
    managed_skill_ids: &HashSet<&str>,
    selected_install_skill_ids: &[String],
) -> Vec<String> {
    let mut seen_skill_ids: HashSet<&str> = HashSet::new();
    let mut normalized_skill_ids = Vec::new();

    for skill_id in selected_install_skill_ids {
        let skill_id_str = skill_id.as_str();

        if managed_skill_ids.contains(skill_id_str) && seen_skill_ids.insert(skill_id_str) {
            normalized_skill_ids.push(skill_id.clone());
        }
    }

    normalized_skill_ids
}

pub fn build_selected_agent_install_sync_plans(
    agents: &[OnboardingAgentState],
    managed_skill_ids: &[String],
    selected_agent_ids: &[String],
    selected_install_skill_ids: &[String],
) -> OnboardingSyncPlan {
    let agents_by_id = agents
        .iter()
        .map(|agent| (agent.id.as_str(), agent))
        .collect::<std::collections::HashMap<_, _>>();
    let managed_skill_ids: HashSet<&str> = managed_skill_ids.iter().map(|id| id.as_str()).collect();
    let normalized_selected_agent_ids = normalize_selected_agent_ids(agents, selected_agent_ids);
    let normalized_selected_install_skill_ids =
        normalize_selected_install_skill_ids(&managed_skill_ids, selected_install_skill_ids);
    let desired_skill_ids: HashSet<&str> = normalized_selected_install_skill_ids
        .iter()
        .map(|id| id.as_str())
        .collect();

    let agent_previews = normalized_selected_agent_ids
        .iter()
        .filter_map(|agent_id| {
            agents_by_id
                .get(agent_id.as_str())
                .map(|agent| (agent_id.clone(), *agent))
        })
        .map(|(agent_id, agent)| {
            let mut added_skill_ids = Vec::new();
            let mut removed_skill_ids = Vec::new();
            let mut unchanged_skill_ids = Vec::new();

            for skill_id in &agent.installed_skill_ids {
                let skill_id_str = skill_id.as_str();

                if contains_skill(&managed_skill_ids, skill_id_str) && !desired_skill_ids.contains(skill_id_str)
                {
                    removed_skill_ids.push(skill_id.clone());
                } else {
                    unchanged_skill_ids.push(skill_id.clone());
                }
            }

            for skill_id in &normalized_selected_install_skill_ids {
                if !agent.installed_skill_ids.iter().any(|installed| installed == skill_id) {
                    added_skill_ids.push(skill_id.clone());
                }
            }

            OnboardingAgentSyncPreview {
                agent_id: agent_id.to_string(),
                added_skill_ids,
                removed_skill_ids,
                unchanged_skill_ids,
            }
        })
        .collect();

    OnboardingSyncPlan {
        selected_agent_ids: normalized_selected_agent_ids,
        selected_install_skill_ids: normalized_selected_install_skill_ids,
        agent_previews,
    }
}

#[cfg(test)]
mod tests {
    use super::build_selected_agent_install_sync_plans;
    use crate::models::{OnboardingAgentState, OnboardingAgentSyncPreview};

    #[test]
    fn onboarding_builds_per_agent_add_remove_and_unchanged_previews_for_multiple_selected_agents() {
        let preview = build_selected_agent_install_sync_plans(
            &[
                OnboardingAgentState {
                    id: "codex".to_string(),
                    installed_skill_ids: vec![
                        "jira".to_string(),
                        "project-manager-weekly-report".to_string(),
                        "legacy-package".to_string(),
                    ],
                },
                OnboardingAgentState {
                    id: "workbuddy".to_string(),
                    installed_skill_ids: vec![
                        "confluence".to_string(),
                        "project-manager-weekly-report".to_string(),
                        "test-project-manager-weekly-report".to_string(),
                    ],
                },
                OnboardingAgentState {
                    id: "claude-code".to_string(),
                    installed_skill_ids: vec![
                        "jira".to_string(),
                        "test-project-manager-weekly-report".to_string(),
                    ],
                },
            ],
            &[
                "jira".to_string(),
                "project-manager-weekly-report".to_string(),
                "test-project-manager-weekly-report".to_string(),
            ],
            &["codex".to_string(), "workbuddy".to_string()],
            &["jira".to_string(), "test-project-manager-weekly-report".to_string()],
        );

        assert_eq!(preview.selected_agent_ids, vec!["codex".to_string(), "workbuddy".to_string()]);
        assert_eq!(
            preview.selected_install_skill_ids,
            vec!["jira".to_string(), "test-project-manager-weekly-report".to_string()]
        );
        assert_eq!(
            preview.agent_previews,
            vec![
                OnboardingAgentSyncPreview {
                    agent_id: "codex".to_string(),
                    added_skill_ids: vec!["test-project-manager-weekly-report".to_string()],
                    removed_skill_ids: vec!["project-manager-weekly-report".to_string()],
                    unchanged_skill_ids: vec!["jira".to_string(), "legacy-package".to_string()],
                },
                OnboardingAgentSyncPreview {
                    agent_id: "workbuddy".to_string(),
                    added_skill_ids: vec!["jira".to_string()],
                    removed_skill_ids: vec!["project-manager-weekly-report".to_string()],
                    unchanged_skill_ids: vec![
                        "confluence".to_string(),
                        "test-project-manager-weekly-report".to_string(),
                    ],
                },
            ]
        );
    }

    #[test]
    fn onboarding_normalizes_selected_agents_and_selected_install_set_before_building_previews() {
        let preview = build_selected_agent_install_sync_plans(
            &[
                OnboardingAgentState {
                    id: "codex".to_string(),
                    installed_skill_ids: vec![
                        "jira".to_string(),
                        "project-manager-weekly-report".to_string(),
                        "legacy-package".to_string(),
                    ],
                },
                OnboardingAgentState {
                    id: "workbuddy".to_string(),
                    installed_skill_ids: vec![
                        "jira".to_string(),
                        "test-project-manager-weekly-report".to_string(),
                        "unmanaged-legacy".to_string(),
                    ],
                },
            ],
            &[
                "jira".to_string(),
                "project-manager-weekly-report".to_string(),
                "test-project-manager-weekly-report".to_string(),
            ],
            &[
                "codex".to_string(),
                "codex".to_string(),
                "missing-agent".to_string(),
                "workbuddy".to_string(),
            ],
            &[
                "jira".to_string(),
                "legacy-package".to_string(),
                "jira".to_string(),
                "project-manager-weekly-report".to_string(),
                "test-project-manager-weekly-report".to_string(),
                "test-project-manager-weekly-report".to_string(),
            ],
        );

        assert_eq!(
            preview.selected_agent_ids,
            vec!["codex".to_string(), "workbuddy".to_string()]
        );
        assert_eq!(
            preview.selected_install_skill_ids,
            vec![
                "jira".to_string(),
                "project-manager-weekly-report".to_string(),
                "test-project-manager-weekly-report".to_string(),
            ]
        );
        assert_eq!(
            preview.agent_previews,
            vec![
                OnboardingAgentSyncPreview {
                    agent_id: "codex".to_string(),
                    added_skill_ids: vec!["test-project-manager-weekly-report".to_string()],
                    removed_skill_ids: vec![],
                    unchanged_skill_ids: vec![
                        "jira".to_string(),
                        "project-manager-weekly-report".to_string(),
                        "legacy-package".to_string(),
                    ],
                },
                OnboardingAgentSyncPreview {
                    agent_id: "workbuddy".to_string(),
                    added_skill_ids: vec!["project-manager-weekly-report".to_string()],
                    removed_skill_ids: vec![],
                    unchanged_skill_ids: vec![
                        "jira".to_string(),
                        "test-project-manager-weekly-report".to_string(),
                        "unmanaged-legacy".to_string(),
                    ],
                },
            ]
        );
    }
}
