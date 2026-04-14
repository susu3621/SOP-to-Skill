use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct GeneratedSkillIds {
    pub production_skill_id: String,
    pub test_skill_id: String,
}

#[cfg(test)]
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct OnboardingBaseSkill {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub credential_field_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct OnboardingUseCase {
    pub id: String,
    pub name: String,
    pub directory: String,
    #[serde(default)]
    pub applicable_role_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct OnboardingRoleUseCaseContent {
    pub role_id: String,
    pub use_case_id: String,
    pub use_case_name: String,
    pub description: String,
    #[serde(default)]
    pub description_locked: bool,
    pub info_sources: String,
    pub rules: String,
    #[serde(default)]
    pub questions: Vec<OnboardingUseCaseQuestion>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
pub struct OnboardingUseCaseQuestion {
    pub id: String,
    pub label: String,
    #[serde(default)]
    pub placeholder: String,
    #[serde(default)]
    pub required: bool,
    #[serde(default)]
    pub answer: String,
    #[serde(default)]
    pub locked: bool,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
pub struct OnboardingLinuxDevice {
    pub id: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub host: String,
    #[serde(default)]
    pub username: String,
    #[serde(default)]
    pub password: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
pub struct OnboardingSvnRepository {
    pub id: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub url: String,
    #[serde(default)]
    pub username: String,
    #[serde(default)]
    pub password: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
pub struct OnboardingState {
    #[serde(default)]
    pub selected_agent_ids: Vec<String>,
    pub selected_role_id: String,
    #[serde(default)]
    pub selected_base_skill_ids: Vec<String>,
    #[serde(default)]
    pub role_use_case_contents: Vec<OnboardingRoleUseCaseContent>,
    #[serde(default)]
    pub selected_install_skill_ids: Vec<String>,
    #[serde(default)]
    pub selected_install_skill_ids_initialized: bool,
    #[serde(default)]
    pub selected_install_candidate_skill_ids: Vec<String>,
    #[serde(default)]
    pub credential_values: HashMap<String, String>,
    #[serde(default)]
    pub linux_devices: Vec<OnboardingLinuxDevice>,
    #[serde(default)]
    pub svn_repositories: Vec<OnboardingSvnRepository>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct OnboardingAgentState {
    pub id: String,
    #[serde(default)]
    pub installed_skill_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct OnboardingAgentSyncPreview {
    pub agent_id: String,
    #[serde(default)]
    pub added_skill_ids: Vec<String>,
    #[serde(default)]
    pub removed_skill_ids: Vec<String>,
    #[serde(default)]
    pub unchanged_skill_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct OnboardingSyncPlan {
    #[serde(default)]
    pub selected_agent_ids: Vec<String>,
    #[serde(default)]
    pub selected_install_skill_ids: Vec<String>,
    #[serde(default)]
    pub agent_previews: Vec<OnboardingAgentSyncPreview>,
}
