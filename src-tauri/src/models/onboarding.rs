use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct GeneratedSkillIds {
    pub production_skill_id: String,
    pub test_skill_id: String,
}

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
    pub info_sources: String,
    pub rules: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
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
    pub credential_values: HashMap<String, String>,
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
