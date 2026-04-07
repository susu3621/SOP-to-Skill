/**
 * WorkBuddy Wizard Configuration
 *
 * This module provides wizard configuration for the WorkBuddy onboarding flow.
 * Data is sourced from the shared configuration for consistency with test scripts.
 */

import type { LocalizedText, WizardField, WizardOption, WizardStep } from '../types'
import type { OnboardingEditableUseCaseRecord } from '../types'
import config from '../shared/config.json'

// Types for the shared config
interface CredentialFieldConfig {
  label: string
  placeholder: string
  type: 'text' | 'password'
  required: boolean
}

interface BaseSkillConfig {
  name: string
  description: string
  credentials: Record<string, CredentialFieldConfig>
}

interface AgentAppConfig {
  name: string
  description: string
}

interface RoleConfig {
  name: string
  description: string
  useCases: string[]
}

interface UseCaseConfig {
  name: string
  directory?: string
  description: string
  guidance?: string[]
  descriptionPrompt?: string
  infoSourcesPrompt?: string
  rulesPrompt?: string
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
const visibleRoleIds = ['project-manager'] as const

export const defaultOnboardingRoleId = visibleRoleIds[0]

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

// Helper to create localized text
function text(value: string): LocalizedText {
  return {
    'zh-CN': value,
    'en-US': value,
  }
}

function toUseCaseId(useCaseName: string): string {
  return typedConfig.useCases[useCaseName]?.directory ?? useCaseName
}

function getUseCaseDirectoryByName(useCaseName: string): string {
  return typedConfig.useCases[useCaseName]?.directory ?? useCaseName
}

function getUseCaseNameById(useCaseId: string): string {
  const match = Object.entries(typedConfig.useCases).find(
    ([, useCase]) => (useCase.directory ?? useCase.name) === useCaseId
  )
  return match?.[1]?.name ?? useCaseId
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
    label: text(app.name),
    hint: text(app.description),
  })
)

export const workbuddyRoles: WizardOption[] = getVisibleRoles().map(([, role]) => ({
    value: role.name,
    label: text(role.name),
    hint: text(role.description),
  }))

export const workbuddyBaseSkills: WizardOption[] = Object.entries(typedConfig.baseSkills).map(
  ([key, skill]) => ({
    value: key,
    label: text(skill.name),
    hint: text(skill.description),
  })
)

export const workbuddyUseCases: WizardOption[] = Object.entries(typedConfig.useCases).map(
  ([, useCase]) => ({
    value: useCase.name,
    label: text(useCase.name),
    hint: text(useCase.description),
  })
)

export interface OnboardingAgentOption {
  id: string
  name: string
  description: string
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
  guidance: string[]
  description_prompt: string
  info_sources_prompt: string
  rules_prompt: string
  applicable_role_ids: string[]
}

export const onboardingAgents: OnboardingAgentOption[] = Object.entries(typedConfig.agentApps).map(
  ([id, app]) => ({
    id,
    name: app.name,
    description: app.description,
  })
)

export const onboardingSupportedAgentIds = ['workbuddy', 'codex', 'claude-code'] as const

export const onboardingSupportedAgents: OnboardingAgentOption[] = onboardingAgents.filter((agent) =>
  onboardingSupportedAgentIds.includes(agent.id as (typeof onboardingSupportedAgentIds)[number])
)

export const onboardingRoles: OnboardingRoleOption[] = getVisibleRoles().map(([id, role]) => ({
    id,
    name: role.name,
    description: role.description,
  }))

export const onboardingBaseSkills: OnboardingBaseSkillOption[] = Object.entries(
  typedConfig.baseSkills
).map(([id, skill]) => ({
  id,
  name: skill.name,
  description: skill.description,
  credential_field_ids: Object.keys(skill.credentials),
}))

const onboardingBaseSkillById = new Map(
  onboardingBaseSkills.map((skill) => [skill.id, skill] as const)
)

const onboardingBaseSkillGroupDefinitions = [
  {
    id: 'wiki',
    name: 'Wiki 系统',
    description: '集中放 SOP、项目文档和会议纪要，方便 AI 读取稳定资料。',
    skill_ids: ['confluence'],
  },
  {
    id: 'issue-management',
    name: '问题管理系统',
    description: '同步任务、缺陷和负责人状态，方便 AI 跟进执行进度。',
    skill_ids: ['jira'],
  },
  {
    id: 'communication',
    name: '通信系统',
    description: '处理邮件往来和通知，方便 AI 整理沟通记录。',
    skill_ids: ['mail'],
  },
] as const

export const onboardingBaseSkillGroups: OnboardingBaseSkillGroup[] =
  onboardingBaseSkillGroupDefinitions.map((group) => ({
    id: group.id,
    name: group.name,
    description: group.description,
    skills: group.skill_ids.map((skillId) => {
      const skill = onboardingBaseSkillById.get(skillId)
      if (!skill) {
        throw new Error(`Unknown onboarding base skill: ${skillId}`)
      }
      return skill
    }),
  }))

export const onboardingUseCases: OnboardingUseCaseOption[] = Object.entries(typedConfig.useCases).map(
  ([useCaseName, useCase]) => ({
    id: toUseCaseId(useCaseName),
    name: useCase.name,
    directory: getUseCaseDirectoryByName(useCaseName),
    description: useCase.description,
    guidance: useCase.guidance ?? [],
    description_prompt: useCase.descriptionPrompt ?? '',
    info_sources_prompt: useCase.infoSourcesPrompt ?? '',
    rules_prompt: useCase.rulesPrompt ?? '',
    applicable_role_ids: Object.entries(typedConfig.roles)
      .filter(([, role]) => role.useCases.includes(useCaseName))
      .map(([roleId]) => roleId),
  })
)

function buildDefaultUseCaseDescription(useCase: OnboardingUseCaseOption) {
  return [useCase.description, ...useCase.guidance, useCase.description_prompt]
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .join('\n\n')
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

function resolveUseCaseDescription(currentValue: string | undefined, defaultValue: string, legacyValues: string[] = []) {
  if (!currentValue?.trim().length) {
    return defaultValue
  }

  const normalizedValue = currentValue.trim()
  return legacyValues.some((legacyValue) => legacyValue.trim() === normalizedValue)
    ? defaultValue
    : currentValue
}

export function getOnboardingAgentNameById(agentId: string): string {
  return typedConfig.agentApps[agentId]?.name ?? agentId
}

export function getRoleNameById(roleId: string): string {
  return typedConfig.roles[roleId]?.name ?? roleId
}

export function getBaseSkillNameById(skillId: string): string {
  return typedConfig.baseSkills[skillId]?.name ?? skillId
}

export function getApplicableUseCasesForRole(roleId: string): OnboardingUseCaseOption[] {
  return onboardingUseCases.filter((useCase) => useCase.applicable_role_ids.includes(roleId))
}

export function getOnboardingUseCaseOptionById(useCaseId: string) {
  return onboardingUseCases.find((useCase) => useCase.id === useCaseId) ?? null
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
    info_sources: '',
    rules: '',
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
  existing: OnboardingEditableUseCaseRecord[] = []
): OnboardingEditableUseCaseRecord[] {
  const configuredDefaults = getApplicableUseCasesForRole(roleId).map((useCase) => {
    const existingRecord = existing.find(
      (record) => record.role_id === roleId && record.use_case_id === useCase.id
    )
    const defaultDescription = buildDefaultUseCaseDescription(useCase)

    return {
      role_id: roleId,
      use_case_id: useCase.id,
      use_case_name: useCase.name,
      description: resolveUseCaseDescription(
        existingRecord?.description,
        defaultDescription,
        [useCase.description, useCase.description_prompt]
      ),
      info_sources: existingRecord?.info_sources ?? '',
      rules: clearLegacyAutofillText(existingRecord?.rules, [useCase.rules_prompt]),
    }
  })

  const customUseCases = existing.filter(
    (record) =>
      record.role_id === roleId && getOnboardingUseCaseOptionById(record.use_case_id) == null
  )

  return [...configuredDefaults, ...customUseCases]
}

export function getUseCaseNameFromId(useCaseId: string): string {
  return getUseCaseNameById(useCaseId)
}

// Get use cases for a specific role
export function getRoleUseCases(roleName: string): WizardOption[] {
  // Find role by name
  const roleEntry = Object.entries(typedConfig.roles).find(([, role]) => role.name === roleName)
  if (!roleEntry) return workbuddyUseCases

  const [, role] = roleEntry
  return role.useCases.map((ucName) => {
    const uc = typedConfig.useCases[ucName]
    return {
      value: ucName,
      label: text(ucName),
      hint: text(uc?.description || ''),
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
    type: cred.type === 'password' ? 'password' : 'text',
    label: text(cred.label),
    placeholder: text(cred.placeholder),
    required: cred.required,
  }))
}

const credentialFieldCache: Record<string, WizardField[]> = {}
Object.keys(typedConfig.baseSkills).forEach((skillKey) => {
  credentialFieldCache[skillKey] = buildCredentialFields(skillKey)
})

export function getCredentialFields(baseSkills: string[]): WizardField[] {
  return baseSkills.flatMap((skill) => credentialFieldCache[skill] ?? [])
}

export function getAgentLabels(agentApps: string[]): string[] {
  return agentApps.map((value) => typedConfig.agentApps[value]?.name ?? value)
}

export function getRoleLabel(value?: string): string {
  if (!value) return '未选择'
  return typedConfig.roles[value]?.name ?? value
}

export function getBaseSkillLabels(baseSkills: string[]): string[] {
  return baseSkills.map((value) => typedConfig.baseSkills[value]?.name ?? value)
}

// Export config for testing
export { typedConfig as sharedConfig }
