use crate::models::{OnboardingAgentState, OnboardingAgentSyncPreview, OnboardingSyncPlan};
use std::collections::HashSet;

fn contains_skill(skill_ids: &HashSet<&str>, skill_id: &str) -> bool {
    skill_ids.contains(skill_id)
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
    let desired_skill_ids: HashSet<&str> =
        selected_install_skill_ids.iter().map(|id| id.as_str()).collect();

    let agent_previews = selected_agent_ids
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

            for skill_id in selected_install_skill_ids {
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
        selected_agent_ids: selected_agent_ids.to_vec(),
        selected_install_skill_ids: selected_install_skill_ids.to_vec(),
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
}
