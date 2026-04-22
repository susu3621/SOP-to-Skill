/**
 * WorkBuddy Wizard Configuration
 *
 * This module provides wizard configuration for the WorkBuddy onboarding flow.
 * Data is sourced from the shared configuration for consistency with test scripts.
 */

import type {
  Locale,
  LocalizedText,
  OnboardingCredentialGroup,
  OnboardingUseCaseQuestionDefinition,
  OnboardingUseCaseQuestionRecord,
  OnboardingUseCaseTemplateAssets,
  WizardField,
  WizardOption,
  WizardStep,
} from '../types'
import type { OnboardingEditableUseCaseRecord } from '../types'
import config from '../shared/config.json'

// Types for the shared config
type ConfigText = string | LocalizedText

interface CredentialFieldConfig {
  label: ConfigText
  placeholder?: ConfigText
  type: 'text' | 'password' | 'single-select'
  required: boolean
  options?: Array<{
    value: string
    label: ConfigText
  }>
}

interface BaseSkillConfig {
  name: ConfigText
  description: ConfigText
  credentials: Record<string, CredentialFieldConfig>
}

interface AgentAppConfig {
  name: ConfigText
  description: ConfigText
  websiteUrl?: string
}

interface RoleConfig {
  name: ConfigText
  description: ConfigText
  useCases: string[]
}

interface UseCaseConfig {
  name: ConfigText
  directory?: string
  description: ConfigText
  guidance?: ConfigText[]
  descriptionPrompt?: ConfigText
  infoSourcesPrompt?: ConfigText
  rulesPrompt?: ConfigText
  defaultDescription?: ConfigText
  defaultInfoSources?: ConfigText
  defaultRules?: ConfigText
  structuredQuestions?: UseCaseQuestionConfig[]
  templateAssets?: UseCaseTemplateAssetsConfig
}

interface UseCaseQuestionConfig {
  id: string
  label: ConfigText
  placeholder?: ConfigText
  required?: boolean
  legacyField?: 'info_sources' | 'rules'
}

interface UseCaseTemplateAssetsConfig {
  repoDir: string
  defaultTemplatePath: string
  exampleDataPath?: string
  rendererBaseSkillId: string
}

interface SharedConfig {
  version: string
  agentApps: Record<string, AgentAppConfig>
  roles: Record<string, RoleConfig>
  baseSkills: Record<string, BaseSkillConfig>
  useCases: Record<string, UseCaseConfig>
  testDefaults: {
    agentApps: string[]
    role: string
    baseSkills: string[]
    useCase: string
    infoSources: string
    reportRules: string
  }
}

const typedConfig = config as SharedConfig
const visibleRoleIds = ['project-manager', 'qa-manager', 'it-manager'] as const
const supportedLocales: Locale[] = ['zh-CN', 'en-US']
const legacyRoleNames: Record<string, LocalizedText> = {
  'rd-manager': {
    'zh-CN': '研发经理',
    'en-US': 'R&D Manager',
  },
}

export const defaultOnboardingRoleId = visibleRoleIds[0]

function readConfigText(value: ConfigText | undefined, locale: Locale = 'zh-CN'): string {
  if (!value) {
    return ''
  }

  if (typeof value === 'string') {
    return value
  }

  return value[locale] ?? value['zh-CN'] ?? value['en-US'] ?? ''
}

function readConfigTextVariants(value: ConfigText | undefined): string[] {
  if (!value) {
    return []
  }

  if (typeof value === 'string') {
    return value.trim().length > 0 ? [value] : []
  }

  return Array.from(
    new Set(
      supportedLocales
        .map((locale) => value[locale])
        .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
    )
  )
}

function toLocalizedText(value: ConfigText): LocalizedText {
  if (typeof value === 'string') {
    return {
      'zh-CN': value,
      'en-US': value,
    }
  }

  return {
    'zh-CN': value['zh-CN'] ?? value['en-US'] ?? '',
    'en-US': value['en-US'] ?? value['zh-CN'] ?? '',
  }
}

function text(value: string): LocalizedText {
  return toLocalizedText(value)
}

function getVisibleRoles() {
  return visibleRoleIds
    .map((roleId) => {
      const role = typedConfig.roles[roleId]
      if (!role) {
        return null
      }

      return [roleId, role] as const
    })
    .filter((entry): entry is readonly [typeof visibleRoleIds[number], RoleConfig] => entry != null)
}

function toUseCaseId(useCaseName: string): string {
  return typedConfig.useCases[useCaseName]?.directory ?? useCaseName
}

function getUseCaseDirectoryByName(useCaseName: string): string {
  return typedConfig.useCases[useCaseName]?.directory ?? useCaseName
}

function getUseCaseNameById(useCaseId: string): string {
  const match = Object.entries(typedConfig.useCases).find(
    ([, useCase]) => (useCase.directory ?? readConfigText(useCase.name)) === useCaseId
  )
  return match ? readConfigText(match[1].name) : useCaseId
}

function normalizeUseCaseId(value: string) {
  const normalized = value
    .trim()
    .replace(/[\s/\\|]+/g, '-')
    .replace(/[：:]+/g, '-')
    .replace(/[，,。.!?？、；;（）()【】[\]{}'"`]+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return normalized.length > 0 ? normalized : 'custom-use-case'
}

// Transform shared config to wizard options
export const workbuddyAgentApps: WizardOption[] = Object.entries(typedConfig.agentApps).map(
  ([key, app]) => ({
    value: key,
    label: toLocalizedText(app.name),
    hint: toLocalizedText(app.description),
  })
)

export const workbuddyRoles: WizardOption[] = getVisibleRoles().map(([, role]) => ({
    value: readConfigText(role.name),
    label: toLocalizedText(role.name),
    hint: toLocalizedText(role.description),
  }))

export const workbuddyBaseSkills: WizardOption[] = Object.entries(typedConfig.baseSkills).map(
  ([key, skill]) => ({
    value: key,
    label: toLocalizedText(skill.name),
    hint: toLocalizedText(skill.description),
  })
)

export const workbuddyUseCases: WizardOption[] = Object.entries(typedConfig.useCases).map(
  ([, useCase]) => ({
    value: readConfigText(useCase.name),
    label: toLocalizedText(useCase.name),
    hint: toLocalizedText(useCase.description),
  })
)

export interface OnboardingAgentOption {
  id: string
  name: string
  description: string
  website_url?: string
}

export interface OnboardingRoleOption {
  id: string
  name: string
  description: string
}

export interface OnboardingBaseSkillOption {
  id: string
  name: string
  description: string
  credential_field_ids: string[]
}

export interface OnboardingBaseSkillGroup {
  id: string
  name: string
  description: string
  skills: OnboardingBaseSkillOption[]
}

export interface OnboardingUseCaseOption {
  id: string
  name: string
  directory: string
  description: string
  system_description: string
  guidance: string[]
  description_prompt: string
  info_sources_prompt: string
  rules_prompt: string
  structured_questions: OnboardingUseCaseQuestionDefinition[]
  applicable_role_ids: string[]
  template_assets?: OnboardingUseCaseTemplateAssets
}

function buildOnboardingAgentOption(
  id: string,
  app: AgentAppConfig,
  locale: Locale = 'zh-CN'
): OnboardingAgentOption {
  return {
    id,
    name: readConfigText(app.name, locale),
    description: readConfigText(app.description, locale),
    website_url: app.websiteUrl,
  }
}

function buildOnboardingRoleOption(
  id: string,
  role: RoleConfig,
  locale: Locale = 'zh-CN'
): OnboardingRoleOption {
  return {
    id,
    name: readConfigText(role.name, locale),
    description: readConfigText(role.description, locale),
  }
}

function buildOnboardingBaseSkillOption(
  id: string,
  skill: BaseSkillConfig,
  locale: Locale = 'zh-CN'
): OnboardingBaseSkillOption {
  return {
    id,
    name: readConfigText(skill.name, locale),
    description: readConfigText(skill.description, locale),
    credential_field_ids: Object.keys(skill.credentials),
  }
}

function getGerritAuthMode(credentialValues: Record<string, string> = {}) {
  return credentialValues.gerritAuthMode === 'ssh' ? 'ssh' : 'http'
}

function isVisibleCredentialField(
  serviceId: string,
  fieldId: string,
  credentialValues: Record<string, string> = {}
) {
  if (serviceId !== 'gerrit') {
    return true
  }

  if (fieldId === 'gerritAuthMode') {
    return true
  }

  const authMode = getGerritAuthMode(credentialValues)

  if (authMode === 'ssh') {
    return fieldId.startsWith('gerritSsh')
  }

  return fieldId === 'gerritUrl' || fieldId.startsWith('gerritHttp')
}

function buildQuestionDefinition(
  question: UseCaseQuestionConfig,
  locale: Locale = 'zh-CN'
): OnboardingUseCaseQuestionDefinition {
  return {
    id: question.id,
    label: readConfigText(question.label, locale),
    placeholder: readConfigText(question.placeholder, locale),
    required: question.required ?? true,
  }
}

function buildFallbackStructuredQuestions(
  useCase: UseCaseConfig,
  locale: Locale = 'zh-CN'
): Array<OnboardingUseCaseQuestionDefinition & { legacyField?: 'info_sources' | 'rules' }> {
  const localizedName = readConfigText(useCase.name, locale)

  return [
    {
      id: 'information-source',
      label:
        locale === 'zh-CN'
          ? `从哪里获取${localizedName}需要的信息？`
          : `Where can AI find the information needed for ${localizedName}?`,
      placeholder: readConfigText(useCase.infoSourcesPrompt, locale),
      required: true,
      legacyField: 'info_sources',
    },
    {
      id: 'workflow-sop',
      label:
        locale === 'zh-CN'
          ? `从哪里获取${localizedName}的 SOP？`
          : `Where can AI find the SOP for ${localizedName}?`,
      placeholder: readConfigText(useCase.rulesPrompt, locale),
      required: true,
      legacyField: 'rules',
    },
    {
      id: 'other',
      label: locale === 'zh-CN' ? '其他' : 'Other',
      placeholder: '',
      required: false,
    },
  ]
}

function buildStructuredQuestionsForOption(
  useCase: UseCaseConfig,
  locale: Locale = 'zh-CN'
): Array<OnboardingUseCaseQuestionDefinition & { legacyField?: 'info_sources' | 'rules' }> {
  if (useCase.structuredQuestions?.length) {
    return useCase.structuredQuestions.map((question) => ({
      ...buildQuestionDefinition(question, locale),
      legacyField: question.legacyField,
    }))
  }

  return buildFallbackStructuredQuestions(useCase, locale)
}

function buildOnboardingUseCaseTemplateAssets(
  templateAssets: UseCaseTemplateAssetsConfig | undefined
): OnboardingUseCaseTemplateAssets | undefined {
  if (!templateAssets) {
    return undefined
  }

  return {
    repo_dir: templateAssets.repoDir,
    default_template_path: templateAssets.defaultTemplatePath,
    example_data_path: templateAssets.exampleDataPath,
    renderer_base_skill_id: templateAssets.rendererBaseSkillId,
  }
}

function buildOnboardingUseCaseOption(
  useCaseName: string,
  useCase: UseCaseConfig,
  locale: Locale = 'zh-CN'
): OnboardingUseCaseOption {
  const structuredQuestions = buildStructuredQuestionsForOption(useCase, locale)

  return {
    id: toUseCaseId(useCaseName),
    name: readConfigText(useCase.name, locale),
    directory: getUseCaseDirectoryByName(useCaseName),
    description: readConfigText(useCase.description, locale),
    system_description: readConfigText(
      useCase.defaultDescription ?? useCase.description,
      locale
    ),
    guidance: (useCase.guidance ?? []).map((value) => readConfigText(value, locale)),
    description_prompt: readConfigText(useCase.descriptionPrompt, locale),
    info_sources_prompt: readConfigText(useCase.infoSourcesPrompt, locale),
    rules_prompt: readConfigText(useCase.rulesPrompt, locale),
    structured_questions: structuredQuestions.map(({ legacyField, ...question }) => question),
    template_assets: buildOnboardingUseCaseTemplateAssets(useCase.templateAssets),
    applicable_role_ids: Object.entries(typedConfig.roles)
      .filter(([, role]) => role.useCases.includes(useCaseName))
      .map(([roleId]) => roleId),
  }
}

export const onboardingAgents: OnboardingAgentOption[] = Object.entries(typedConfig.agentApps).map(
  ([id, app]) => buildOnboardingAgentOption(id, app)
)

export const onboardingSupportedAgentIds = ['workbuddy', 'codex', 'claude-code'] as const

export const onboardingSupportedAgents: OnboardingAgentOption[] = onboardingAgents.filter((agent) =>
  onboardingSupportedAgentIds.includes(agent.id as (typeof onboardingSupportedAgentIds)[number])
)

export function getOnboardingAgents(locale: Locale = 'zh-CN'): OnboardingAgentOption[] {
  return Object.entries(typedConfig.agentApps).map(([id, app]) =>
    buildOnboardingAgentOption(id, app, locale)
  )
}

export function getOnboardingSupportedAgentOptions(locale: Locale = 'zh-CN'): OnboardingAgentOption[] {
  return getOnboardingAgents(locale).filter((agent) =>
    onboardingSupportedAgentIds.includes(agent.id as (typeof onboardingSupportedAgentIds)[number])
  )
}

export const onboardingRoles: OnboardingRoleOption[] = getVisibleRoles().map(([id, role]) => ({
  id,
  name: readConfigText(role.name),
  description: readConfigText(role.description),
}))

export function getOnboardingRoleOptions(locale: Locale = 'zh-CN'): OnboardingRoleOption[] {
  return getVisibleRoles().map(([id, role]) => buildOnboardingRoleOption(id, role, locale))
}

export const onboardingBaseSkills: OnboardingBaseSkillOption[] = Object.entries(
  typedConfig.baseSkills
).map(([id, skill]) => buildOnboardingBaseSkillOption(id, skill))

export function getOnboardingBaseSkillOptions(locale: Locale = 'zh-CN'): OnboardingBaseSkillOption[] {
  return Object.entries(typedConfig.baseSkills).map(([id, skill]) =>
    buildOnboardingBaseSkillOption(id, skill, locale)
  )
}

const onboardingBaseSkillById = new Map(
  onboardingBaseSkills.map((skill) => [skill.id, skill] as const)
)

const onboardingBaseSkillGroupDefinitions = [
  {
    id: 'wiki',
    name: {
      'zh-CN': 'Wiki 系统',
      'en-US': 'Wiki System',
    },
    description: {
      'zh-CN': '集中放 SOP、项目文档和会议纪要，方便 AI 读取和写入稳定资料。',
      'en-US': 'Store SOPs, project docs, and meeting notes in one place so AI can read and write stable references.',
    },
    skill_ids: ['confluence'],
  },
  {
    id: 'issue-management',
    name: {
      'zh-CN': '问题管理系统',
      'en-US': 'Issue Management System',
    },
    description: {
      'zh-CN': '同步任务、缺陷和负责人状态，方便 AI 跟进执行进度。',
      'en-US': 'Sync tasks, defects, and owners so AI can track execution progress.',
    },
    skill_ids: ['jira'],
  },
  {
    id: 'document-generation',
    name: {
      'zh-CN': '文档生成',
      'en-US': 'Document Generation',
    },
    description: {
      'zh-CN': '基于模板和结构化内容生成正式文档，方便 AI 输出 Word 或 PDF 结果。',
      'en-US': 'Generate formal documents from templates and structured data so AI can produce Word or PDF outputs.',
    },
    skill_ids: ['document-template'],
  },
  {
    id: 'version-management',
    name: {
      'zh-CN': '版本管理',
      'en-US': 'Version Management',
    },
    description: {
      'zh-CN': '同步版本库、提交历史和版本变更，方便 AI 读取和写入研发协作信息。',
      'en-US': 'Sync repositories, commit history, and version changes so AI can read and write engineering collaboration records.',
    },
    skill_ids: ['gerrit', 'svn'],
  },
  {
    id: 'host-ops',
    name: {
      'zh-CN': '主机与运维',
      'en-US': 'Host & Operations',
    },
    description: {
      'zh-CN': '维护 Linux 主机清单、远程连接和运维执行入口，方便 AI 读写服务器侧信息。',
      'en-US': 'Manage Linux hosts, remote access, and operations entry points so AI can read and write server-side information.',
    },
    skill_ids: ['linux'],
  },
  {
    id: 'communication',
    name: {
      'zh-CN': '通信系统',
      'en-US': 'Communication System',
    },
    description: {
      'zh-CN': '处理邮件往来和通知，方便 AI 整理沟通记录。',
      'en-US': 'Handle email traffic and notifications so AI can organize communication records.',
    },
    skill_ids: ['mail'],
  },
] as const

export const onboardingBaseSkillGroups: OnboardingBaseSkillGroup[] =
  onboardingBaseSkillGroupDefinitions.map((group) => ({
    id: group.id,
    name: group.name['zh-CN'],
    description: group.description['zh-CN'],
    skills: group.skill_ids.map((skillId) => {
      const skill = onboardingBaseSkillById.get(skillId)
      if (!skill) {
        throw new Error(`Unknown onboarding base skill: ${skillId}`)
      }
      return skill
    }),
  }))

export function getOnboardingBaseSkillGroupOptions(
  locale: Locale = 'zh-CN'
): OnboardingBaseSkillGroup[] {
  return onboardingBaseSkillGroupDefinitions.map((group) => ({
    id: group.id,
    name: group.name[locale] ?? group.name['zh-CN'],
    description: group.description[locale] ?? group.description['zh-CN'],
    skills: group.skill_ids.map((skillId) => {
      const skill = typedConfig.baseSkills[skillId]
      if (!skill) {
        throw new Error(`Unknown onboarding base skill: ${skillId}`)
      }

      return buildOnboardingBaseSkillOption(skillId, skill, locale)
    }),
  }))
}

export const onboardingUseCases: OnboardingUseCaseOption[] = Object.entries(typedConfig.useCases).map(
  ([useCaseName, useCase]) => buildOnboardingUseCaseOption(useCaseName, useCase)
)

export function getOnboardingUseCaseOptions(locale: Locale = 'zh-CN'): OnboardingUseCaseOption[] {
  return Object.entries(typedConfig.useCases).map(([useCaseName, useCase]) =>
    buildOnboardingUseCaseOption(useCaseName, useCase, locale)
  )
}

function getLocalizedUseCaseConfigById(useCaseId: string, locale: Locale = 'zh-CN') {
  const entry = Object.entries(typedConfig.useCases).find(
    ([, useCase]) => (useCase.directory ?? readConfigText(useCase.name)) === useCaseId
  )

  if (!entry) {
    return null
  }

  const [, useCase] = entry

  return {
    name: readConfigText(useCase.name, locale),
    description: readConfigText(useCase.description, locale),
    guidance: (useCase.guidance ?? []).map((value) => readConfigText(value, locale)),
    descriptionPrompt: readConfigText(useCase.descriptionPrompt, locale),
    infoSourcesPrompt: readConfigText(useCase.infoSourcesPrompt, locale),
    rulesPrompt: readConfigText(useCase.rulesPrompt, locale),
    defaultDescription: readConfigText(useCase.defaultDescription, locale),
    defaultInfoSources: readConfigText(useCase.defaultInfoSources, locale),
    defaultRules: readConfigText(useCase.defaultRules, locale),
    structuredQuestions: buildStructuredQuestionsForOption(useCase, locale),
  }
}

function getUseCaseConfigById(useCaseId: string): UseCaseConfig | null {
  const entry = Object.entries(typedConfig.useCases).find(
    ([, useCase]) => (useCase.directory ?? readConfigText(useCase.name)) === useCaseId
  )

  return entry?.[1] ?? null
}

function matchesConfigTextVariant(currentValue: string | undefined, variants: string[] = []) {
  if (!currentValue?.trim().length) {
    return false
  }

  const normalizedValue = currentValue.trim()
  return variants.some((variant) => variant.trim() === normalizedValue)
}

function clearLegacyAutofillText(currentValue: string | undefined, legacyValues: string[] = []) {
  if (!currentValue?.trim().length) {
    return ''
  }

  const normalizedValue = currentValue.trim()
  return legacyValues.some((legacyValue) => legacyValue.trim() === normalizedValue)
    ? ''
    : currentValue
}

function resolveLocalizedConfigBackedValue(
  currentValue: string | undefined,
  localizedValue: string,
  configVariants: string[] = []
) {
  if (!currentValue?.trim().length) {
    return localizedValue
  }

  return matchesConfigTextVariant(currentValue, configVariants) ? localizedValue : currentValue
}

function buildStructuredQuestionRecords(
  useCaseId: string,
  existingRecord: OnboardingEditableUseCaseRecord | undefined,
  locale: Locale = 'zh-CN'
): OnboardingUseCaseQuestionRecord[] {
  const useCase = getUseCaseConfigById(useCaseId)
  const localizedConfig = getLocalizedUseCaseConfigById(useCaseId, locale)

  if (!useCase || !localizedConfig) {
    return existingRecord?.questions ?? []
  }

  const existingAnswers = new Map(
    (existingRecord?.questions ?? []).map((question) => [question.id, question.answer] as const)
  )

  return localizedConfig.structuredQuestions.map((question) => ({
    ...question,
    answer:
      existingAnswers.get(question.id) ??
      ((question as OnboardingUseCaseQuestionDefinition & {
        legacyField?: 'info_sources' | 'rules'
      }).legacyField
        ? existingRecord?.[(question as OnboardingUseCaseQuestionDefinition & {
            legacyField?: 'info_sources' | 'rules'
          }).legacyField!] ?? ''
        : ''),
    locked: true,
  }))
}

function buildCustomUseCaseQuestions(
  existingRecord: OnboardingEditableUseCaseRecord | undefined
): OnboardingUseCaseQuestionRecord[] {
  if (existingRecord?.questions?.length) {
    return existingRecord.questions.map((question) => ({
      ...question,
      locked: false,
    }))
  }

  const questions: OnboardingUseCaseQuestionRecord[] = []

  if (existingRecord?.info_sources.trim()) {
    questions.push({
      id: 'information-source',
      label: '从哪里获取这个用例需要的信息？',
      placeholder: '',
      required: true,
      answer: existingRecord.info_sources,
      locked: false,
    })
  }

  if (existingRecord?.rules.trim()) {
    questions.push({
      id: 'workflow-sop',
      label: '从哪里获取这个用例的 SOP？',
      placeholder: '',
      required: true,
      answer: existingRecord.rules,
      locked: false,
    })
  }

  return questions
}

export function getOnboardingAgentNameById(agentId: string, locale: Locale = 'zh-CN'): string {
  return readConfigText(typedConfig.agentApps[agentId]?.name, locale) || agentId
}

export function getOnboardingAgentDescriptionById(
  agentId: string,
  locale: Locale = 'zh-CN'
): string {
  return readConfigText(typedConfig.agentApps[agentId]?.description, locale)
}

export function getRoleNameById(roleId: string, locale: Locale = 'zh-CN'): string {
  return readConfigText(typedConfig.roles[roleId]?.name ?? legacyRoleNames[roleId], locale) || roleId
}

export function getRoleDescriptionById(roleId: string, locale: Locale = 'zh-CN'): string {
  return readConfigText(typedConfig.roles[roleId]?.description, locale)
}

export function getBaseSkillNameById(skillId: string, locale: Locale = 'zh-CN'): string {
  return readConfigText(typedConfig.baseSkills[skillId]?.name, locale) || skillId
}

export function getBaseSkillDescriptionById(skillId: string, locale: Locale = 'zh-CN'): string {
  return readConfigText(typedConfig.baseSkills[skillId]?.description, locale)
}

export function getApplicableUseCasesForRole(roleId: string): OnboardingUseCaseOption[] {
  const configuredUseCases = typedConfig.roles[roleId]?.useCases ?? []

  return configuredUseCases
    .map((useCaseName) => {
      const useCase = typedConfig.useCases[useCaseName]

      if (!useCase) {
        return null
      }

      return buildOnboardingUseCaseOption(useCaseName, useCase)
    })
    .filter((useCase): useCase is OnboardingUseCaseOption => useCase != null)
}

export function getOnboardingUseCaseOptionById(useCaseId: string, locale: Locale = 'zh-CN') {
  return getOnboardingUseCaseOptions(locale).find((useCase) => useCase.id === useCaseId) ?? null
}

export function buildCustomUseCaseId(useCaseName: string, existingUseCaseIds: string[] = []) {
  const baseId = normalizeUseCaseId(useCaseName)
  let nextId = baseId
  let suffix = 2

  while (existingUseCaseIds.includes(nextId)) {
    nextId = `${baseId}-${suffix}`
    suffix += 1
  }

  return nextId
}

export function createCustomRoleUseCaseContent(
  roleId: string,
  useCaseName: string,
  existingUseCaseIds: string[] = []
): OnboardingEditableUseCaseRecord {
  const trimmedName = useCaseName.trim()

  return {
    role_id: roleId,
    use_case_id: buildCustomUseCaseId(trimmedName, existingUseCaseIds),
    use_case_name: trimmedName,
    description: '',
    description_locked: false,
    info_sources: '',
    rules: '',
    questions: [],
  }
}

export function buildGeneratedSkillIdsForRoleUseCase(roleId: string, useCaseDirectory: string) {
  return {
    production_skill_id: `${roleId}-${useCaseDirectory}`,
    test_skill_id: `test-${roleId}-${useCaseDirectory}`,
  }
}

export function createDefaultRoleUseCaseContents(
  roleId: string,
  existing: OnboardingEditableUseCaseRecord[] = [],
  locale: Locale = 'zh-CN'
): OnboardingEditableUseCaseRecord[] {
  const configuredDefaults = getApplicableUseCasesForRole(roleId).map((useCase) => {
    const existingRecord = existing.find(
      (record) => record.role_id === roleId && record.use_case_id === useCase.id
    )
    const localizedConfig = getLocalizedUseCaseConfigById(useCase.id, locale)
    const rawConfig = getUseCaseConfigById(useCase.id)
    const infoSourcesVariants = [
      ...readConfigTextVariants(rawConfig?.infoSourcesPrompt),
      ...readConfigTextVariants(rawConfig?.defaultInfoSources),
    ]
    const rulesVariants = [
      ...readConfigTextVariants(rawConfig?.rulesPrompt),
      ...readConfigTextVariants(rawConfig?.defaultRules),
    ]

    return {
      role_id: roleId,
      use_case_id: useCase.id,
      use_case_name: localizedConfig?.name ?? useCase.name,
      description: localizedConfig?.defaultDescription ?? '',
      description_locked: true,
      info_sources: resolveLocalizedConfigBackedValue(
        existingRecord?.info_sources,
        localizedConfig?.defaultInfoSources ?? '',
        infoSourcesVariants
      ),
      rules: resolveLocalizedConfigBackedValue(
        clearLegacyAutofillText(existingRecord?.rules, rulesVariants),
        localizedConfig?.defaultRules ?? '',
        rulesVariants
      ),
      questions: buildStructuredQuestionRecords(useCase.id, existingRecord, locale),
    }
  })

  const customUseCases = existing.filter(
    (record) =>
      record.role_id === roleId && getOnboardingUseCaseOptionById(record.use_case_id) == null
  ).map((record) => ({
    ...record,
    description_locked: false,
    questions: buildCustomUseCaseQuestions(record),
  }))

  return [...configuredDefaults, ...customUseCases]
}

export function getUseCaseNameFromId(useCaseId: string): string {
  return getUseCaseNameById(useCaseId)
}

export function getOnboardingUseCaseNameById(
  useCaseId: string,
  locale: Locale = 'zh-CN'
): string {
  return getOnboardingUseCaseOptionById(useCaseId, locale)?.name ?? getUseCaseNameById(useCaseId)
}

// Get use cases for a specific role
export function getRoleUseCases(roleName: string): WizardOption[] {
  // Find role by name
  const roleEntry = Object.entries(typedConfig.roles).find(
    ([, role]) => readConfigText(role.name) === roleName
  )
  if (!roleEntry) return workbuddyUseCases

  const [, role] = roleEntry
  return role.useCases.map((ucName) => {
    const uc = typedConfig.useCases[ucName]
    return {
      value: ucName,
      label: toLocalizedText(uc?.name ?? ucName),
      hint: toLocalizedText(uc?.description ?? ''),
    }
  })
}

// Wizard steps
export const workbuddySteps: WizardStep[] = [
  {
    id: 'agent-apps',
    title: text('选择要使用的 Agent 应用'),
    description: text('先选择你要在哪些 Agent 应用中使用这套配置。'),
    fields: [
      {
        id: 'agentApps',
        type: 'multi-select',
        label: text('Agent 应用（可多选）'),
        required: true,
        options: workbuddyAgentApps,
      },
    ],
  },
  {
    id: 'role',
    title: text('选择你的岗位'),
    description: text('先确认你在团队里的角色，再决定这套引导后面要收集哪些上下文。'),
    fields: [
      {
        id: 'role',
        type: 'single-select',
        label: text('选择你的岗位'),
        required: true,
        options: workbuddyRoles,
      },
    ],
  },
  {
    id: 'base-skills',
    title: text('连接你已经在用的基础工具'),
    description: text('先勾选你想让 Agent 读取上下文的基础系统。'),
    fields: [
      {
        id: 'baseSkills',
        type: 'multi-select',
        label: text('基础工具（可多选）'),
        required: true,
        options: workbuddyBaseSkills,
      },
    ],
  },
  {
    id: 'use-case',
    title: text('岗位用例'),
    description: text('先从当前已支持的岗位用例中选择一个，确认这次要完成的目标。'),
    fields: [
      {
        id: 'useCase',
        type: 'single-select',
        label: text('岗位用例'),
        required: true,
        options: workbuddyUseCases,
      },
    ],
  },
  {
    id: 'weekly-rules',
    title: text('当前流程 / SOP / 模板'),
    description: text('如果这个用例在公司内部有固定流程、模板、语气或输出要求，可以先写在这里。'),
    fields: [
      {
        id: 'reportRules',
        type: 'textarea',
        label: text('当前流程 / SOP / 模板'),
        placeholder: text('例如：采用固定模板，先风险后里程碑，没有更新也要写明阻塞项。'),
        required: false,
      },
    ],
  },
  {
    id: 'credentials',
    title: text('补充账号与凭证'),
    description: text('只展示你前面勾选过的基础工具所需账号信息。'),
    fields: [],
  },
]

// Build credential fields from shared config
function buildCredentialFields(skillKey: string): WizardField[] {
  const skill = typedConfig.baseSkills[skillKey]
  if (!skill?.credentials) return []

  return Object.entries(skill.credentials).map(([credKey, cred]) => ({
    id: credKey,
    type: cred.type,
    label: toLocalizedText(cred.label),
    placeholder: cred.placeholder ? toLocalizedText(cred.placeholder) : undefined,
    required: cred.required,
    options: cred.options?.map((option) => ({
      value: option.value,
      label: toLocalizedText(option.label),
    })),
  }))
}

const credentialFieldCache: Record<string, WizardField[]> = {}
Object.keys(typedConfig.baseSkills).forEach((skillKey) => {
  credentialFieldCache[skillKey] = buildCredentialFields(skillKey)
})

function buildCredentialGroup(
  skillKey: string,
  locale: Locale = 'zh-CN',
  credentialValues: Record<string, string> = {}
): OnboardingCredentialGroup | null {
  const skill = typedConfig.baseSkills[skillKey]
  if (!skill) {
    return null
  }

  if (skillKey === 'linux') {
    return {
      service_id: skillKey,
      service_name: readConfigText(skill.name, locale),
      service_description: readConfigText(skill.description, locale),
      editor_type: 'linux-devices',
      supports_connection_test: false,
      fields: [],
      required_field_ids: [],
    }
  }

  if (skillKey === 'svn') {
    return {
      service_id: skillKey,
      service_name: readConfigText(skill.name, locale),
      service_description: readConfigText(skill.description, locale),
      editor_type: 'svn-repositories',
      supports_connection_test: false,
      fields: [],
      required_field_ids: [],
    }
  }

  const fields = (credentialFieldCache[skillKey] ?? []).filter((field) =>
    isVisibleCredentialField(skillKey, field.id, credentialValues)
  )

  if (fields.length === 0) {
    return null
  }

  return {
    service_id: skillKey,
    service_name: readConfigText(skill.name, locale),
    service_description: readConfigText(skill.description, locale),
    editor_type: 'fields',
    supports_connection_test: true,
    fields,
    required_field_ids: fields
      .filter((field) => field.required)
      .map((field) => field.id)
      .filter((fieldId) => fieldId !== 'gerritAuthMode'),
  }
}

export function getCredentialFields(baseSkills: string[]): WizardField[] {
  return baseSkills.flatMap((skill) => credentialFieldCache[skill] ?? [])
}

export function getCredentialGroups(
  baseSkills: string[],
  locale: Locale = 'zh-CN',
  credentialValues: Record<string, string> = {}
): OnboardingCredentialGroup[] {
  return Array.from(new Set(baseSkills))
    .map((skillId) => buildCredentialGroup(skillId, locale, credentialValues))
    .filter((group): group is OnboardingCredentialGroup => group != null)
}

export function getRequiredCredentialFieldIds(
  serviceId: string,
  credentialValues: Record<string, string> = {}
): string[] {
  return (credentialFieldCache[serviceId] ?? [])
    .filter(
      (field) =>
        field.required &&
        field.id !== 'gerritAuthMode' &&
        isVisibleCredentialField(serviceId, field.id, credentialValues)
    )
    .map((field) => field.id)
}

export function getAgentLabels(agentApps: string[]): string[] {
  return agentApps.map((value) => readConfigText(typedConfig.agentApps[value]?.name) || value)
}

export function getRoleLabel(value?: string): string {
  if (!value) return '未选择'
  return readConfigText(typedConfig.roles[value]?.name) || value
}

export function getBaseSkillLabels(baseSkills: string[]): string[] {
  return baseSkills.map((value) => readConfigText(typedConfig.baseSkills[value]?.name) || value)
}

// Export config for testing
export { typedConfig as sharedConfig }
