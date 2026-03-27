use crate::models::{
    GeneratedSkillIds, OnboardingBaseSkill, OnboardingState, OnboardingUseCase,
};
use std::collections::HashSet;

fn push_unique(values: &mut Vec<String>, value: String) {
    if !values.contains(&value) {
        values.push(value);
    }
}

pub fn generated_skill_ids_for_use_case(role_id: &str, use_case_directory: &str) -> GeneratedSkillIds {
    GeneratedSkillIds {
        production_skill_id: format!("{role_id}-{use_case_directory}"),
        test_skill_id: format!("test-{role_id}-{use_case_directory}"),
    }
}

pub fn default_selected_install_skill_ids(
    selected_base_skill_ids: &[String],
    selected_role_id: &str,
    use_cases: &[OnboardingUseCase],
) -> Vec<String> {
    let mut selected_install_skill_ids = Vec::new();

    for base_skill_id in selected_base_skill_ids {
        push_unique(&mut selected_install_skill_ids, base_skill_id.clone());
    }

    for use_case in use_cases.iter().filter(|use_case| {
        use_case
            .applicable_role_ids
            .iter()
            .any(|role_id| role_id == selected_role_id)
    }) {
        let generated_skill_ids =
            generated_skill_ids_for_use_case(selected_role_id, &use_case.directory);

        push_unique(
            &mut selected_install_skill_ids,
            generated_skill_ids.production_skill_id,
        );
        push_unique(&mut selected_install_skill_ids, generated_skill_ids.test_skill_id);
    }

    selected_install_skill_ids
}

pub fn prune_deselected_base_skill_credentials(
    mut state: OnboardingState,
    selected_base_skill_ids: &[String],
    base_skills: &[OnboardingBaseSkill],
) -> OnboardingState {
    state.selected_install_skill_ids_initialized =
        state.selected_install_skill_ids_initialized || !state.selected_install_skill_ids.is_empty();

    let selected_base_skill_ids: HashSet<String> = selected_base_skill_ids.iter().cloned().collect();
    let base_skill_ids: HashSet<String> = base_skills.iter().map(|skill| skill.id.clone()).collect();
    let removed_base_skill_ids: HashSet<String> = base_skill_ids
        .difference(&selected_base_skill_ids)
        .cloned()
        .collect();

    state
        .selected_base_skill_ids
        .retain(|skill_id| selected_base_skill_ids.contains(skill_id));
    state.selected_install_skill_ids.retain(|skill_id| {
        !removed_base_skill_ids.contains(skill_id) || !base_skill_ids.contains(skill_id)
    });

    let allowed_credential_ids: HashSet<String> = base_skills
        .iter()
        .filter(|skill| selected_base_skill_ids.contains(&skill.id))
        .flat_map(|skill| skill.credential_field_ids.iter().cloned())
        .collect();

    state
        .credential_values
        .retain(|credential_id, _| allowed_credential_ids.contains(credential_id));

    state
}

#[cfg(test)]
mod tests {
    use super::{
        default_selected_install_skill_ids, generated_skill_ids_for_use_case,
        prune_deselected_base_skill_credentials,
    };
    use crate::models::{
        OnboardingBaseSkill, OnboardingRoleUseCaseContent, OnboardingState, OnboardingUseCase,
    };
    use std::collections::HashMap;

    #[test]
    fn onboarding_generates_production_and_test_skill_ids_for_a_role_use_case_pair() {
        let generated = generated_skill_ids_for_use_case("project-manager", "weekly-report");

        assert_eq!(generated.production_skill_id, "project-manager-weekly-report");
        assert_eq!(generated.test_skill_id, "test-project-manager-weekly-report");
    }

    #[test]
    fn onboarding_computes_the_default_selected_install_set() {
        let use_cases = vec![
            OnboardingUseCase {
                id: "weekly-report".to_string(),
                name: "项目周报".to_string(),
                directory: "weekly-report".to_string(),
                applicable_role_ids: vec!["project-manager".to_string()],
            },
            OnboardingUseCase {
                id: "planning".to_string(),
                name: "记录计划".to_string(),
                directory: "planning".to_string(),
                applicable_role_ids: vec![
                    "project-manager".to_string(),
                    "qa-manager".to_string(),
                ],
            },
            OnboardingUseCase {
                id: "daily-log".to_string(),
                name: "记录日志".to_string(),
                directory: "daily-log".to_string(),
                applicable_role_ids: vec!["sales-manager".to_string()],
            },
        ];

        let selected_install_skill_ids = default_selected_install_skill_ids(
            &["jira".to_string(), "confluence".to_string()],
            "project-manager",
            &use_cases,
        );

        assert_eq!(
            selected_install_skill_ids,
            vec![
                "jira".to_string(),
                "confluence".to_string(),
                "project-manager-weekly-report".to_string(),
                "test-project-manager-weekly-report".to_string(),
                "project-manager-planning".to_string(),
                "test-project-manager-planning".to_string(),
            ]
        );
    }

    #[test]
    fn onboarding_prunes_deselected_base_skills_from_credential_relevant_selection_state() {
        let state = OnboardingState {
            selected_agent_ids: vec!["codex".to_string(), "workbuddy".to_string()],
            selected_role_id: "project-manager".to_string(),
            selected_base_skill_ids: vec!["jira".to_string(), "confluence".to_string()],
            role_use_case_contents: vec![OnboardingRoleUseCaseContent {
                role_id: "project-manager".to_string(),
                use_case_id: "weekly-report".to_string(),
                use_case_name: "项目周报".to_string(),
                description: "按周报模板输出项目状态".to_string(),
                info_sources: "Jira 看板".to_string(),
                rules: "先风险后里程碑".to_string(),
            }],
            selected_install_skill_ids: vec![
                "jira".to_string(),
                "confluence".to_string(),
                "project-manager-weekly-report".to_string(),
            ],
            selected_install_skill_ids_initialized: false,
            credential_values: HashMap::from([
                ("jiraUsername".to_string(), "pm.jira".to_string()),
                ("jiraPassword".to_string(), "jira-secret".to_string()),
                ("confluenceUsername".to_string(), "pm.wiki".to_string()),
                ("confluencePassword".to_string(), "wiki-secret".to_string()),
                ("sharedNote".to_string(), "keep-me".to_string()),
            ]),
        };

        let pruned = prune_deselected_base_skill_credentials(
            state,
            &["jira".to_string()],
            &[
                OnboardingBaseSkill {
                    id: "jira".to_string(),
                    name: "Jira".to_string(),
                    credential_field_ids: vec![
                        "jiraUsername".to_string(),
                        "jiraPassword".to_string(),
                    ],
                },
                OnboardingBaseSkill {
                    id: "confluence".to_string(),
                    name: "Confluence".to_string(),
                    credential_field_ids: vec![
                        "confluenceUsername".to_string(),
                        "confluencePassword".to_string(),
                    ],
                },
            ],
        );

        assert_eq!(pruned.selected_base_skill_ids, vec!["jira".to_string()]);
        assert_eq!(
            pruned.selected_install_skill_ids,
            vec!["jira".to_string(), "project-manager-weekly-report".to_string()]
        );
        assert!(pruned.selected_install_skill_ids_initialized);
        assert_eq!(
            pruned.credential_values,
            HashMap::from([
                ("jiraUsername".to_string(), "pm.jira".to_string()),
                ("jiraPassword".to_string(), "jira-secret".to_string()),
            ])
        );
        assert_eq!(pruned.role_use_case_contents.len(), 1);
        assert_eq!(
            pruned.role_use_case_contents[0],
            OnboardingRoleUseCaseContent {
                role_id: "project-manager".to_string(),
                use_case_id: "weekly-report".to_string(),
                use_case_name: "项目周报".to_string(),
                description: "按周报模板输出项目状态".to_string(),
                info_sources: "Jira 看板".to_string(),
                rules: "先风险后里程碑".to_string(),
            }
        );
    }
}
