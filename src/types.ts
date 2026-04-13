export type Locale = 'zh-CN' | 'en-US'

export type LocalizedText = Record<Locale, string>

export type TargetAppId = 'workbuddy' | 'codex' | 'claude-code'

export type TargetAppStatus = 'available' | 'coming-soon'

export interface TargetApp {
  id: TargetAppId
  name: string
  status: TargetAppStatus
  description: LocalizedText
  highlight: LocalizedText
}

export interface WizardOption {
  value: string
  label: LocalizedText
  hint?: LocalizedText
}

export interface WizardField {
  id: string
  type: 'single-select' | 'multi-select' | 'text' | 'url' | 'textarea' | 'password'
  label: LocalizedText
  placeholder?: LocalizedText
  required: boolean
  options?: WizardOption[]
}

export interface WizardStep {
  id: string
  title: LocalizedText
  description: LocalizedText
  fields: WizardField[]
}

export type WizardAnswers = Record<string, string>

// ===== New types for Skill Template System =====

export interface VariableInfo {
  id: string
  label: Record<string, string>
  var_type: 'text' | 'path' | 'select' | 'number'
  required: boolean
  default?: string
  placeholder?: Record<string, string>
  options: Array<{
    value: string
    label: Record<string, string>
  }>
}

export interface SkillInfo {
  id: string
  name: Record<string, string>
  description?: Record<string, string>
  version: string
  category?: string
  author?: string
  targets: string[]
  variables: VariableInfo[]
  is_installed: boolean
  installed_version?: string
  update_status: 'up-to-date' | 'update-available' | 'not-installed' | 'unknown'
}

export interface InstalledSkillInfo {
  skill_id: string
  app_id: string
  app_name: string
  installed_version: string
  installed_at: string
  output_path: string
}

export interface TargetAppInfo {
  id: string
  name: string
  description: string
  status: string
}

export interface AppConfig {
  update_check_interval_hours: number
  last_update_check?: string
  preferred_locale?: string
}

export interface UpdateCheckResult {
  skill_id: string
  current_version: string
  update_status: string
  latest_version?: string
  release_url?: string
}

export interface AppUpdateInfo {
  currentVersion: string
  version: string
  body?: string | null
  date?: string | null
}

export interface SkillResult<T> {
  success?: T
  error?: string
}

// View states for the app
export type ViewType =
  | 'onboarding'
  | 'welcome'
  | 'skills-list'
  | 'skill-detail'
  | 'install-wizard'
  | 'installed'
  | 'settings'
  | 'selection'
  | 'wizard'
  | 'summary'
  | 'result'

export interface InstallWizardState {
  skillId: string
  selectedAppId: string
  currentStep: number
  variables: Record<string, string>
}

// ===== Onboarding flow contracts =====

export interface OnboardingGeneratedSkillIds {
  production_skill_id: string
  test_skill_id: string
}

export interface OnboardingUseCaseQuestionDefinition {
  id: string
  label: string
  placeholder: string
  required: boolean
}

export interface OnboardingUseCaseQuestionRecord extends OnboardingUseCaseQuestionDefinition {
  answer: string
  locked: boolean
}

export interface OnboardingEditableUseCaseRecord {
  role_id: string
  use_case_id: string
  use_case_name: string
  description: string
  description_locked?: boolean
  info_sources: string
  rules: string
  questions?: OnboardingUseCaseQuestionRecord[]
}

export type OnboardingRoleUseCaseContent = OnboardingEditableUseCaseRecord

export interface OnboardingUseCase {
  id: string
  name: string
  directory: string
  applicable_role_ids: string[]
}

export interface OnboardingAgentState {
  id: string
  installed_skill_ids: string[]
}

export interface OnboardingLinuxDeviceRecord {
  id: string
  name: string
  host: string
  username: string
  password: string
}

export interface OnboardingState {
  selected_agent_ids: string[]
  selected_role_id: string
  selected_base_skill_ids: string[]
  role_use_case_contents: OnboardingEditableUseCaseRecord[]
  selected_install_skill_ids: string[]
  selected_install_skill_ids_initialized: boolean
  selected_install_candidate_skill_ids: string[]
  credential_values: Record<string, string>
  linux_devices: OnboardingLinuxDeviceRecord[]
}

export interface OnboardingInstallCandidateGroup {
  use_case_id: string
  use_case_name: string
  production_skill_id: string
  test_skill_id: string
}

export type OnboardingConnectionTestTrigger = 'manual' | 'automatic'

export type OnboardingConnectionTestStatus = 'idle' | 'pending' | 'success' | 'error'

export interface OnboardingConnectionTestInput {
  service_id: string
  credential_values: Record<string, string>
  trigger: OnboardingConnectionTestTrigger
  tested_fingerprint: string
}

export interface OnboardingConnectionTestResult {
  service_id: string
  success: boolean
  status: 'success' | 'error'
  summary: string
  details: string
  trigger: string
  tested_fingerprint: string
}

export interface OnboardingConnectionTestState {
  status: OnboardingConnectionTestStatus
  summary: string | null
  details: string | null
  last_trigger: OnboardingConnectionTestTrigger | null
  tested_fingerprint: string | null
  request_id: number
}

export type OnboardingEnvironmentTrigger = 'manual' | 'automatic' | 'install'

export type OnboardingEnvironmentCheckStatus =
  | 'idle'
  | 'pending'
  | 'ready'
  | 'missing'
  | 'unsupported'
  | 'error'

export interface OnboardingEnvironmentCheckInput {
  service_id: string
  credential_values: Record<string, string>
  trigger: OnboardingEnvironmentTrigger
  tested_fingerprint: string
}

export interface OnboardingEnvironmentRequirement {
  id: string
  label: string
  required: boolean
  status: 'ready' | 'missing'
  details: string
}

export interface OnboardingEnvironmentCheckResult {
  service_id: string
  platform: 'macos' | 'windows' | 'unsupported'
  status: Exclude<OnboardingEnvironmentCheckStatus, 'idle' | 'pending'>
  summary: string
  details: string
  requirements: OnboardingEnvironmentRequirement[]
  missing_requirement_ids: string[]
  install_supported: boolean
  install_support_message: string
  trigger: string
  tested_fingerprint: string
}

export interface OnboardingEnvironmentCheckState {
  status: OnboardingEnvironmentCheckStatus
  summary: string | null
  details: string | null
  requirements: OnboardingEnvironmentRequirement[]
  missing_requirement_ids: string[]
  install_supported: boolean
  install_support_message: string | null
  last_trigger: OnboardingEnvironmentTrigger | null
  tested_fingerprint: string | null
  request_id: number
}

export interface OnboardingEnvironmentInstallInput {
  install_id: string
  service_id: string
  credential_values: Record<string, string>
}

export interface OnboardingEnvironmentInstallResult {
  install_id: string
  service_id: string
  success: boolean
  summary: string
  details: string
  installed_requirement_ids: string[]
}

export interface OnboardingEnvironmentInstallProgressEvent {
  install_id: string
  service_id: string
  status: 'running' | 'success' | 'error'
  progress_percent: number
  step: string
  log_line: string | null
}

export type OnboardingEnvironmentInstallStatus = 'idle' | 'running' | 'success' | 'error'

export interface OnboardingEnvironmentInstallState {
  status: OnboardingEnvironmentInstallStatus
  install_id: string | null
  progress_percent: number
  step: string | null
  logs: string[]
  summary: string | null
  details: string | null
  request_id: number
}

export interface OnboardingCredentialGroup {
  service_id: string
  service_name: string
  service_description: string
  editor_type: 'fields' | 'linux-devices'
  supports_connection_test: boolean
  fields: WizardField[]
  required_field_ids: string[]
}

export interface OnboardingAgentSyncPreview {
  agent_id: string
  added_skill_ids: string[]
  removed_skill_ids: string[]
  unchanged_skill_ids: string[]
}

export interface OnboardingInstallPreview {
  install_candidate_skill_ids: string[]
  generated_skill_ids: OnboardingGeneratedSkillIds[]
  selected_agent_ids: string[]
  selected_install_skill_ids: string[]
  agent_previews: OnboardingAgentSyncPreview[]
}

export interface OnboardingAgentSyncResult extends OnboardingAgentSyncPreview {
  success: boolean
  error: string | null
}

export interface OnboardingBatchSyncResult {
  selected_agent_ids: string[]
  selected_install_skill_ids: string[]
  agent_results: OnboardingAgentSyncResult[]
}

export interface StagedOnboardingPackage {
  skill_id: string
  source_dir: string
}

export interface StagedOnboardingPackages {
  production: StagedOnboardingPackage | null
  test: StagedOnboardingPackage | null
}
