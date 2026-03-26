// @vitest-environment node

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

type SharedConfig = {
  roles: Record<string, { name: string }>
  baseSkills: Record<string, { name: string }>
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
        type: 'codex' | 'claude-code'
      }) => { id: string }
      deleteBaseSkill: (id: string) => void
      deleteRole: (id: string) => void
      initialize: () => void
      listBaseSkills: () => Array<{ id: string; name: string }>
      listRoles: () => Array<{ id: string; name: string }>
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
        }
        installations: {
          agents: Array<{
            id: string
            installRoot: string
            installedSkillIds: string[]
            name: string
            type: string
          }>
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
      'project-manager': { name: '项目经理' },
      'qa-manager': { name: '质量经理' },
    },
    baseSkills: {
      jira: { name: 'Jira' },
      confluence: { name: 'Confluence' },
    },
  }
}

describe('createOnboardingConfigStore', () => {
  let storageDir: string

  beforeEach(() => {
    storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'onboarding-config-store-'))
  })

  afterEach(() => {
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
    expect(files.useCases.useCases.map((item) => item.name)).toEqual([
      '记录日志',
      '记录计划',
      '项目周报',
    ])
    expect(files.installations.agents).toEqual([])
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
})
