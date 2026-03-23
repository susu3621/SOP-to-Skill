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
  type: 'single-select' | 'text'
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
