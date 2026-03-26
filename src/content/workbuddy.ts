/**
 * WorkBuddy Wizard Configuration
 *
 * This module provides wizard configuration for the WorkBuddy onboarding flow.
 * Data is sourced from the shared configuration for consistency with test scripts.
 */

import type { LocalizedText, WizardField, WizardOption, WizardStep } from '../types'
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

// Helper to create localized text
function text(value: string): LocalizedText {
  return {
    'zh-CN': value,
    'en-US': value,
  }
}

// Transform shared config to wizard options
export const workbuddyAgentApps: WizardOption[] = Object.entries(typedConfig.agentApps).map(
  ([key, app]) => ({
    value: key,
    label: text(app.name),
    hint: text(app.description),
  })
)

export const workbuddyRoles: WizardOption[] = Object.entries(typedConfig.roles).map(
  ([, role]) => ({
    value: role.name,
    label: text(role.name),
    hint: text(role.description),
  })
)

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
    id: 'project-source',
    title: text('基础信息来源'),
    description: text('请用文本框写下你依赖的基础信息来源，可以是系统名称、页面链接、文档位置或补充说明。'),
    fields: [
      {
        id: 'infoSources',
        type: 'textarea',
        label: text('基础信息来源'),
        placeholder: text('例如：Jira 项目看板、Confluence 项目主页、销售易商机页、例会纪要目录。'),
        required: true,
      },
    ],
  },
  {
    id: 'weekly-rules',
    title: text('用例规则'),
    description: text('如果这个用例在公司内部有模板、规则、语气或输出要求，可以先写在这里。'),
    fields: [
      {
        id: 'reportRules',
        type: 'textarea',
        label: text('用例规则或模板'),
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
  return value ?? '未选择'
}

export function getBaseSkillLabels(baseSkills: string[]): string[] {
  return baseSkills.map((value) => typedConfig.baseSkills[value]?.name ?? value)
}

// Export config for testing
export { typedConfig as sharedConfig }
