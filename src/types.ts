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

export interface SkillResult<T> {
  success?: T
  error?: string
}

// View states for the app
export type ViewType =
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
