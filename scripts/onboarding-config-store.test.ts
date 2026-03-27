// @vitest-environment node

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

type SharedConfig = {
  roles: Record<string, { name: string; useCases?: string[] }>
  baseSkills: Record<string, { name: string }>
  agentApps?: Record<string, { name: string }>
  useCases?: Record<string, { directory: string; name: string; description: string }>
  testDefaults?: {
    role?: string
    baseSkills?: string[]
    agentApps?: string[]
  }
}

function loadStore() {
  return require('./lib/onboarding-config-store.cjs') as {
    createOnboardingConfigStore: (options: {
      sharedConfig: SharedConfig
      storageDir: string
    }) => {
      createAgent: (input: {
        installRoot: string
        name: string
        type: 'codex' | 'claude-code' | 'workbuddy'
      }) => { id: string }
      deleteBaseSkill: (id: string) => void
      deleteRole: (id: string) => void
      initialize: () => void
      listBaseSkills: () => Array<{ id: string; name: string }>
      listSelectedBaseSkills: () => Array<{ id: string; name: string }>
      listRoles: () => Array<{ id: string; name: string }>
      listSelectedRoles: () => Array<{ id: string; name: string }>
      listUseCases: () => Array<{
        applicableRoleIds: string[]
        id: string
        infoSources: string
        name: string
        rules: string
      }>
      readRawFiles: () => {
        basicInfo: {
          baseSkills: Array<{ id: string; name: string }>
          roles: Array<{ id: string; name: string }>
          selectedBaseSkillIds: string[]
          selectedRoleIds: string[]
        }
        installations: {
          agents: Array<{
            id: string
            installRoot: string
            installedSkillIds: string[]
            name: string
            type: string
          }>
          selectedAgentIds: string[]
          selectedInstallSkillIds: string[]
        }
        useCases: {
          useCases: Array<{
            applicableRoleIds: string[]
            description: string
            id: string
            infoSources: string
            name: string
            rules: string
          }>
        }
      }
      renameRole: (id: string, name: string) => void
      setSelectedBaseSkills: (skillIds: string[]) => Array<{ id: string; name: string }>
      setSelectedRoles: (roleIds: string[]) => Array<{ id: string; name: string }>
      setAgentInstalledSkills: (agentId: string, skillIds: string[]) => void
      upsertUseCase: (input: {
        applicableRoleIds: string[]
        description: string
        id?: string
        infoSources: string
        name: string
        rules: string
      }) => { id: string }
    }
  }
}

function createSharedConfig(): SharedConfig {
  return {
    roles: {
      'project-manager': { name: '项目经理', useCases: ['记录计划', '项目周报'] },
      'qa-manager': { name: '质量经理', useCases: ['记录计划'] },
    },
    baseSkills: {
      confluence: { name: 'Confluence' },
      jira: { name: 'Jira' },
      mail: { name: 'Mail' },
    },
    agentApps: {
      codex: { name: 'Codex' },
      'claude-code': { name: 'Claude Code' },
      workbuddy: { name: 'WorkBuddy' },
    },
    useCases: {
      记录计划: {
        directory: 'planning',
        name: '记录计划',
        description: '维护项目计划、里程碑和下一步安排。',
      },
      项目周报: {
        directory: 'weekly-report',
        name: '项目周报',
        description: '沉淀项目周报，汇总风险、进展与待办。',
      },
    },
    testDefaults: {
      role: 'project-manager',
      baseSkills: ['jira', 'confluence'],
      agentApps: ['codex', 'workbuddy'],
    },
  }
}

describe('createOnboardingConfigStore', () => {
  let storageDir: string
  let originalHome: string | undefined

  beforeEach(() => {
    storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'onboarding-config-store-'))
    originalHome = process.env.HOME
    process.env.HOME = path.join(storageDir, 'home')
  })

  afterEach(() => {
    process.env.HOME = originalHome
    fs.rmSync(storageDir, { force: true, recursive: true })
  })

  it('initializes modular JSON files with migrated basic info and default use cases', () => {
    const { createOnboardingConfigStore } = loadStore()
    const store = createOnboardingConfigStore({
      sharedConfig: createSharedConfig(),
      storageDir,
    })

    store.initialize()

    const files = store.readRawFiles()
    expect(files.basicInfo.roles).toEqual([
      { id: 'project-manager', name: '项目经理' },
      { id: 'qa-manager', name: '质量经理' },
    ])
    expect(files.basicInfo.baseSkills).toEqual(
      expect.arrayContaining([
        { id: 'jira', name: 'Jira' },
        { id: 'confluence', name: 'Confluence' },
      ])
    )
    expect(files.basicInfo.selectedRoleIds).toEqual(['project-manager'])
    expect(files.basicInfo.selectedBaseSkillIds).toEqual(['jira', 'confluence'])
    expect(files.installations.agents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'codex',
          installedSkillIds: [],
        }),
        expect.objectContaining({
          id: 'workbuddy',
          installedSkillIds: [],
        }),
      ])
    )
    expect(files.installations.selectedAgentIds).toEqual(['codex', 'workbuddy'])
    expect(files.installations.selectedInstallSkillIds).toEqual([
      'jira',
      'confluence',
      'project-manager-planning',
      'test-project-manager-planning',
      'project-manager-weekly-report',
      'test-project-manager-weekly-report',
    ])
    expect(files.useCases.useCases).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: '记录计划',
          applicableRoleIds: ['project-manager', 'qa-manager'],
        }),
        expect.objectContaining({
          name: '项目周报',
          applicableRoleIds: ['project-manager'],
        }),
      ])
    )
    expect(files.installations.agents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'codex',
          name: 'Codex',
          type: 'codex',
          installRoot: path.join(process.env.HOME as string, '.codex', 'skills'),
        }),
        expect.objectContaining({
          id: 'claude-code',
          name: 'Claude Code',
          type: 'claude-code',
          installRoot: path.join(process.env.HOME as string, '.claude', 'skills'),
        }),
        expect.objectContaining({
          id: 'workbuddy',
          name: 'WorkBuddy',
          type: 'workbuddy',
          installRoot: path.join(process.env.HOME as string, '.workbuddy', 'skills'),
        }),
      ])
    )
  })

  it('blocks deleting a role that is still referenced by a use case and keeps ids stable across rename', () => {
    const { createOnboardingConfigStore } = loadStore()
    const store = createOnboardingConfigStore({
      sharedConfig: createSharedConfig(),
      storageDir,
    })

    store.initialize()

    const [projectManagerRole] = store.listRoles()
    const [defaultUseCase] = store.listUseCases()
    store.upsertUseCase({
      ...defaultUseCase,
      applicableRoleIds: [projectManagerRole.id],
      description: '按模板汇总项目状态',
      infoSources: 'Jira 看板',
      rules: '先风险后里程碑',
    })

    expect(() => store.deleteRole(projectManagerRole.id)).toThrow(/仍被用例引用/)

    store.renameRole(projectManagerRole.id, '高级项目经理')

    expect(store.listRoles()).toContainEqual({
      id: projectManagerRole.id,
      name: '高级项目经理',
    })
  })

  it('stores only one selected role and lets later choices replace it', () => {
    const { createOnboardingConfigStore } = loadStore()
    const store = createOnboardingConfigStore({
      sharedConfig: createSharedConfig(),
      storageDir,
    })

    store.initialize()

    expect(store.listSelectedRoles()).toEqual([{ id: 'project-manager', name: '项目经理' }])

    const nextSelection = store.setSelectedRoles(['qa-manager', 'project-manager'])

    expect(nextSelection).toEqual([{ id: 'qa-manager', name: '质量经理' }])
    expect(store.readRawFiles().basicInfo.selectedRoleIds).toEqual(['qa-manager'])

    store.setSelectedRoles(['project-manager'])
    expect(store.readRawFiles().basicInfo.selectedRoleIds).toEqual(['project-manager'])
  })

  it('preserves an existing selected install subset and prunes stale generated ids on write', () => {
    const { createOnboardingConfigStore } = loadStore()
    const installationsPath = path.join(storageDir, 'installations.json')

    fs.writeFileSync(
      installationsPath,
      JSON.stringify(
        {
          agents: [],
          selectedAgentIds: ['codex'],
          selectedInstallSkillIds: ['jira', 'project-manager-planning', 'legacy-package'],
        },
        null,
        2
      )
    )

    const store = createOnboardingConfigStore({
      sharedConfig: createSharedConfig(),
      storageDir,
    })

    store.initialize()

    expect(store.readRawFiles().installations.selectedInstallSkillIds).toEqual([
      'jira',
      'project-manager-planning',
    ])

    store.setSelectedRoles(['qa-manager'])

    expect(store.readRawFiles().installations.selectedInstallSkillIds).toEqual([
      'jira',
    ])
  })

  it('preserves a custom selected agent id when the agent record already exists', () => {
    const { createOnboardingConfigStore } = loadStore()
    const installationsPath = path.join(storageDir, 'installations.json')

    fs.writeFileSync(
      installationsPath,
      JSON.stringify(
        {
          agents: [
            {
              id: 'codex',
              installRoot: '/tmp/codex',
              installedSkillIds: [],
              name: 'Codex',
              type: 'codex',
            },
            {
              id: 'local-codex',
              installRoot: '/tmp/local-codex',
              installedSkillIds: [],
              name: 'Local Codex',
              type: 'codex',
            },
          ],
          selectedAgentIds: ['local-codex'],
          selectedInstallSkillIds: ['jira'],
        },
        null,
        2
      )
    )

    const store = createOnboardingConfigStore({
      sharedConfig: createSharedConfig(),
      storageDir,
    })

    store.initialize()

    expect(store.readRawFiles().installations.selectedAgentIds).toEqual(['local-codex'])

    store.setSelectedRoles(['qa-manager'])

    expect(store.readRawFiles().installations.selectedAgentIds).toEqual(['local-codex'])
  })

  it('replaces stale base skill entries with the current shared-config list during initialize', () => {
    const { createOnboardingConfigStore } = loadStore()
    const basicInfoPath = path.join(storageDir, 'basic-info.json')

    fs.mkdirSync(storageDir, { recursive: true })
    fs.writeFileSync(
      basicInfoPath,
      JSON.stringify(
        {
          baseSkills: [
            { id: 'zentao', name: '禅道' },
            { id: 'saleseasy', name: '销售易' },
            { id: 'confluence', name: 'Confluence' },
            { id: 'jira', name: 'Jira' },
            { id: 'notion', name: 'Notion' },
          ],
          roles: [
            { id: 'project-manager', name: '项目经理' },
            { id: 'qa-manager', name: '质量经理' },
          ],
          selectedBaseSkillIds: ['zentao', 'jira', 'mail'],
          selectedRoleIds: ['project-manager'],
        },
        null,
        2
      )
    )

    const store = createOnboardingConfigStore({
      sharedConfig: createSharedConfig(),
      storageDir,
    })

    store.initialize()

    expect(store.readRawFiles().basicInfo.baseSkills).toEqual([
      { id: 'confluence', name: 'Confluence' },
      { id: 'jira', name: 'Jira' },
      { id: 'mail', name: 'Mail' },
    ])
    expect(store.readRawFiles().basicInfo.selectedBaseSkillIds).toEqual(['jira', 'mail'])
    expect(store.readRawFiles().installations.selectedInstallSkillIds).toEqual([
      'jira',
      'mail',
      'project-manager-planning',
      'test-project-manager-planning',
      'project-manager-weekly-report',
      'test-project-manager-weekly-report',
    ])
  })

  it('keeps base skills as multi-select', () => {
    const { createOnboardingConfigStore } = loadStore()
    const store = createOnboardingConfigStore({
      sharedConfig: createSharedConfig(),
      storageDir,
    })

    store.initialize()

    expect(store.listSelectedBaseSkills()).toEqual([
      { id: 'confluence', name: 'Confluence' },
      { id: 'jira', name: 'Jira' },
    ])

    const nextSelection = store.setSelectedBaseSkills(['confluence', 'jira'])

    expect(nextSelection).toEqual([
      { id: 'confluence', name: 'Confluence' },
      { id: 'jira', name: 'Jira' },
    ])
    expect(store.readRawFiles().basicInfo.selectedBaseSkillIds).toEqual(['confluence', 'jira'])
  })

  it('removes a deleted base skill from persisted install selections', () => {
    const { createOnboardingConfigStore } = loadStore()
    const store = createOnboardingConfigStore({
      sharedConfig: createSharedConfig(),
      storageDir,
    })

    store.initialize()

    store.deleteBaseSkill('jira')

    expect(store.readRawFiles().basicInfo.selectedBaseSkillIds).toEqual(['confluence'])
    expect(store.readRawFiles().installations.selectedInstallSkillIds).toEqual([
      'confluence',
      'project-manager-planning',
      'test-project-manager-planning',
      'project-manager-weekly-report',
      'test-project-manager-weekly-report',
    ])
  })

  it('blocks deleting a base skill that is still installed by an agent', () => {
    const { createOnboardingConfigStore } = loadStore()
    const store = createOnboardingConfigStore({
      sharedConfig: createSharedConfig(),
      storageDir,
    })

    store.initialize()

    const [jiraSkill] = store.listBaseSkills()
    const createdAgent = store.createAgent({
      installRoot: '/tmp/custom-codex-skills',
      name: 'Codex 本地环境',
      type: 'codex',
    })

    store.setAgentInstalledSkills(createdAgent.id, [jiraSkill.id])

    expect(() => store.deleteBaseSkill(jiraSkill.id)).toThrow(/仍安装在 agent 上/)
  })

  it('allows installed skill ids to include production and test generated role use-case skills', () => {
    const { createOnboardingConfigStore } = loadStore()
    const store = createOnboardingConfigStore({
      sharedConfig: createSharedConfig(),
      storageDir,
    })

    store.initialize()

    store.setAgentInstalledSkills('codex', [
      'jira',
      'project-manager-weekly-report',
      'test-project-manager-weekly-report',
    ])

    expect(store.readRawFiles().installations.agents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'codex',
          installedSkillIds: [
            'jira',
            'project-manager-weekly-report',
            'test-project-manager-weekly-report',
          ],
        }),
      ])
    )
  })
})
