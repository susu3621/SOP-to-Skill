// @vitest-environment node

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

function loadManager() {
  return require('./lib/onboarding-manager.cjs') as {
    buildOverviewSnapshot: (input: {
      baseSkills: Array<{ id: string; name: string }>
      roles: Array<{ id: string; name: string }>
      storageDir: string
      useCases: Array<{ id: string; name: string }>
      agents: Array<{ id: string; installedSkillIds: string[]; name: string }>
    }, homeDir?: string) => {
      lines: string[]
    }
    collapseHomePath: (inputPath: string, homeDir?: string) => string
    expandHomePath: (inputPath: string, homeDir?: string) => string
    getBasicInfoMenuOptions: () => Array<{ label: string; value: string }>
    getDefaultInstallRoot: (agentType: 'codex' | 'claude-code' | 'workbuddy', homeDir: string) => string
    getInstallationMenuOptions: () => Array<{ label: string; value: string }>
    parseManagerArgs: (args: string[]) => {
      forceReinstall: boolean
      help: boolean
      storageDir: string | null
    }
    buildSkillSyncPlan: (input: {
      currentSkillIds: string[]
      desiredSkillIds: string[]
      forceReinstall?: boolean
    }) => {
      addedSkillIds: string[]
      removedSkillIds: string[]
    }
    getUseCaseEditContext: (
      selectedRoles: Array<{ id: string; name: string }>
    ) =>
      | { status: 'blocked'; message: string }
      | { status: 'ready'; role: { id: string; name: string } }
    buildDesiredInstalledSkillIds: (input: {
      selectedBaseSkills: Array<{ id: string; name: string }>
      selectedGeneratedProductionSkillIds: string[]
      selectedGeneratedTestSkillIds: string[]
    }) => string[]
    buildSelectedAgentInstallSyncPlans: (input: {
      agents: Array<{
        id: string
        installedSkillIds: string[]
        name: string
        type: string
      }>
      managedSkillIds: string[]
      selectedAgentIds: string[]
      selectedInstallSkillIds: string[]
    }) => {
      agentPlans: Array<{
        addedSkillIds: string[]
        agentId: string
        unchangedSkillIds: string[]
        removedSkillIds: string[]
        selectedInstallSkillIds: string[]
      }>
      selectedAgentIds: string[]
      selectedInstallSkillIds: string[]
    }
    installGeneratedSkillPackage: (sourceDir: string, installRoot: string, skillId: string) => string
    stageGeneratedUseCaseSkillPackages: (input: {
      agent: { type: string }
      outputDir: string
      role: { id: string; name: string }
      selectedBaseSkills: Array<{ id: string; name: string }>
      useCase: {
        description: string
        infoSources: string
        name: string
        rules: string
      }
    }, sharedConfig: {
      agentApps: Record<string, { name: string }>
      baseSkills: Record<string, { name: string }>
      useCases: Record<string, { directory: string }>
    }) => {
      production: { skillId: string; sourceDir: string }
      test: { skillId: string; sourceDir: string }
    }
    renderHelp: (homeDir?: string) => string
    getRoleScopedUseCases: (
      useCases: Array<{ applicableRoleIds: string[]; id: string; name: string }>,
      roleId: string
    ) => Array<{ applicableRoleIds: string[]; id: string; name: string }>
    getUseCaseMenuOptions: () => Array<{ label: string; value: string }>
  }
}

describe('onboarding manager helpers', () => {
  it('parses --storage-dir and --help flags for the config manager entrypoint', () => {
    const { parseManagerArgs } = loadManager()

    expect(parseManagerArgs(['--storage-dir', '/tmp/onboarding-state'])).toEqual({
      forceReinstall: false,
      help: false,
      storageDir: '/tmp/onboarding-state',
    })
    expect(parseManagerArgs(['--force-reinstall'])).toEqual({
      forceReinstall: true,
      help: false,
      storageDir: null,
    })
    expect(parseManagerArgs(['--help'])).toEqual({
      forceReinstall: false,
      help: true,
      storageDir: null,
    })
  })

  it('builds overview lines from modular config data', () => {
    const { buildOverviewSnapshot } = loadManager()

    const snapshot = buildOverviewSnapshot({
      agents: [
        { id: 'codex', installedSkillIds: ['jira', 'confluence'], name: 'Codex' },
        { id: 'claude-code', installedSkillIds: [], name: 'Claude Code' },
      ],
      baseSkills: [
        { id: 'jira', name: 'Jira' },
        { id: 'confluence', name: 'Confluence' },
      ],
      roles: [
        { id: 'project-manager', name: '项目经理' },
      ],
      storageDir: '/tmp/onboarding-state',
      useCases: [
        { id: 'weekly-report', name: '项目周报' },
        { id: 'daily-log', name: '记录日志' },
        { id: 'planning', name: '记录计划' },
      ],
    })

    expect(snapshot.lines).toContain('配置目录: /tmp/onboarding-state')
    expect(snapshot.lines).toContain('岗位数: 1')
    expect(snapshot.lines).toContain('基础技能数: 2')
    expect(snapshot.lines).toContain('用例数: 3')
    expect(snapshot.lines).toContain('Agent 数: 2')
    expect(snapshot.lines).toContain('已安装技能总数: 2')
  })

  it('uses ~ for home-relative display paths and expands it back before execution', () => {
    const { buildOverviewSnapshot, collapseHomePath, expandHomePath, getDefaultInstallRoot, renderHelp } =
      loadManager()
    const homeDir = '/tmp/test-home'

    expect(collapseHomePath(getDefaultInstallRoot('codex', homeDir), homeDir)).toBe('~/.codex/skills')
    expect(collapseHomePath(getDefaultInstallRoot('claude-code', homeDir), homeDir)).toBe('~/.claude/skills')
    expect(collapseHomePath(getDefaultInstallRoot('workbuddy', homeDir), homeDir)).toBe(
      '~/.workbuddy/skills'
    )
    expect(expandHomePath('~/.codex/skills', homeDir)).toBe('/tmp/test-home/.codex/skills')

    const snapshot = buildOverviewSnapshot(
      {
        agents: [],
        baseSkills: [],
        roles: [],
        storageDir: '/tmp/test-home/.skills-for-no-engineer/onboarding',
        useCases: [],
      },
      homeDir
    )

    expect(snapshot.lines).toContain('配置目录: ~/.skills-for-no-engineer/onboarding')
    expect(renderHelp(homeDir)).toContain('默认配置目录: ~/.skills-for-no-engineer/onboarding')
  })

  it('uses selection menus for preseeded items and filters use cases by role', () => {
    const {
      getBasicInfoMenuOptions,
      getInstallationMenuOptions,
      getUseCaseEditContext,
      getRoleScopedUseCases,
      getUseCaseMenuOptions,
    } = loadManager()

    expect(getBasicInfoMenuOptions()).toEqual([
      { label: '选择岗位', value: 'selectRoles' },
      { label: '选择基础技能', value: 'selectBaseSkills' },
      { label: '返回主菜单', value: 'back' },
    ])
    expect(getUseCaseMenuOptions()).toEqual([
      { label: '按岗位选择并编辑用例', value: 'edit' },
      { label: '返回主菜单', value: 'back' },
    ])
    expect(getInstallationMenuOptions()).toEqual([
      { label: '选择安装目标并同步已选基础技能', value: 'apply' },
      { label: '返回主菜单', value: 'back' },
    ])
    expect(getUseCaseEditContext([])).toEqual({
      status: 'blocked',
      message: '请先进入基础信息设置并选择岗位，然后再配置用例。',
    })
    expect(getUseCaseEditContext([{ id: 'project-manager', name: '项目经理' }])).toEqual({
      status: 'ready',
      role: { id: 'project-manager', name: '项目经理' },
    })

    const useCases = [
      { applicableRoleIds: ['project-manager', 'qa-manager'], id: 'planning', name: '记录计划' },
      { applicableRoleIds: ['project-manager'], id: 'weekly-report', name: '项目周报' },
      { applicableRoleIds: ['sales-manager'], id: 'daily-log', name: '记录日志' },
    ]

    expect(getRoleScopedUseCases(useCases, 'project-manager').map((item) => item.name)).toEqual([
      '记录计划',
      '项目周报',
    ])
    expect(getRoleScopedUseCases(useCases, 'qa-manager').map((item) => item.name)).toEqual(['记录计划'])
  })

  it('builds installation ids from selected base skills plus the selected generated production and test ids', () => {
    const { buildDesiredInstalledSkillIds } = loadManager()

    const skillIds = buildDesiredInstalledSkillIds({
      selectedBaseSkills: [
        { id: 'confluence', name: 'Confluence' },
        { id: 'jira', name: 'Jira' },
      ],
      selectedGeneratedProductionSkillIds: [
        'project-manager-planning',
        'project-manager-weekly-report',
      ],
      selectedGeneratedTestSkillIds: [
        'test-project-manager-planning',
        'test-project-manager-weekly-report',
      ],
    })

    expect(skillIds).toEqual([
      'confluence',
      'jira',
      'project-manager-planning',
      'project-manager-weekly-report',
      'test-project-manager-planning',
      'test-project-manager-weekly-report',
    ])
  })

  it('stages both production and test generated package directories for a role use case', () => {
    const { stageGeneratedUseCaseSkillPackages } = loadManager()
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'generated-skill-stage-'))

    try {
      const staged = stageGeneratedUseCaseSkillPackages(
        {
          agent: { type: 'workbuddy' },
          outputDir: tempDir,
          role: { id: 'project-manager', name: '项目经理' },
          selectedBaseSkills: [{ id: 'jira', name: 'Jira' }],
          useCase: {
            description: '输出项目周报',
            infoSources: 'Confluence 模板',
            name: '项目周报',
            rules: '按模板输出',
          },
        },
        {
          agentApps: {
            workbuddy: { name: 'WorkBuddy' },
          },
          baseSkills: {
            jira: { name: 'Jira' },
          },
          useCases: {
            项目周报: { directory: 'weekly-report' },
          },
        }
      )

      expect(staged.production.skillId).toBe('project-manager-weekly-report')
      expect(staged.production.sourceDir).toBe(path.join(tempDir, 'project-manager-weekly-report'))
      expect(staged.test.skillId).toBe('test-project-manager-weekly-report')
      expect(staged.test.sourceDir).toBe(path.join(tempDir, 'test-project-manager-weekly-report'))

      const productionSkillMd = fs.readFileSync(path.join(staged.production.sourceDir, 'SKILL.md'), 'utf8')
      const testSkillMd = fs.readFileSync(path.join(staged.test.sourceDir, 'SKILL.md'), 'utf8')
      expect(productionSkillMd).not.toContain('最终结果不要进行更新执行，而是打印出来。')
      expect(testSkillMd).toContain('最终结果不要进行更新执行，而是打印出来。')
    } finally {
      fs.rmSync(tempDir, { force: true, recursive: true })
    }
  })

  it('builds a shared sync plan for all selected agents and preserves unmanaged skills', () => {
    const { buildSelectedAgentInstallSyncPlans } = loadManager()

    const preview = buildSelectedAgentInstallSyncPlans({
      agents: [
        {
          id: 'codex',
          installedSkillIds: ['jira', 'project-manager-weekly-report', 'legacy-package'],
          name: 'Codex',
          type: 'codex',
        },
        {
          id: 'workbuddy',
          installedSkillIds: [
            'confluence',
            'project-manager-weekly-report',
            'test-project-manager-weekly-report',
          ],
          name: 'WorkBuddy',
          type: 'workbuddy',
        },
        {
          id: 'claude-code',
          installedSkillIds: ['jira', 'test-project-manager-weekly-report'],
          name: 'Claude Code',
          type: 'claude-code',
        },
      ],
      managedSkillIds: [
        'jira',
        'project-manager-weekly-report',
        'test-project-manager-weekly-report',
      ],
      selectedAgentIds: ['codex', 'workbuddy'],
      selectedInstallSkillIds: ['jira', 'test-project-manager-weekly-report'],
    })

    expect(preview.selectedAgentIds).toEqual(['codex', 'workbuddy'])
    expect(preview.selectedInstallSkillIds).toEqual(['jira', 'test-project-manager-weekly-report'])
    expect(preview.agentPlans).toEqual([
      {
        agentId: 'codex',
        addedSkillIds: ['test-project-manager-weekly-report'],
        removedSkillIds: ['project-manager-weekly-report'],
        selectedInstallSkillIds: ['jira', 'test-project-manager-weekly-report'],
        unchangedSkillIds: ['jira', 'legacy-package'],
      },
      {
        agentId: 'workbuddy',
        addedSkillIds: ['jira'],
        removedSkillIds: ['project-manager-weekly-report'],
        selectedInstallSkillIds: ['jira', 'test-project-manager-weekly-report'],
        unchangedSkillIds: ['confluence', 'test-project-manager-weekly-report'],
      },
    ])
  })

  it('builds a full reinstall plan when force-reinstall is enabled', () => {
    const { buildSkillSyncPlan } = loadManager()

    expect(
      buildSkillSyncPlan({
        currentSkillIds: ['confluence', 'jira', 'project-manager-weekly-report'],
        desiredSkillIds: ['confluence', 'jira', 'project-manager-weekly-report'],
        forceReinstall: false,
      })
    ).toEqual({
      addedSkillIds: [],
      removedSkillIds: [],
    })

    expect(
      buildSkillSyncPlan({
        currentSkillIds: ['confluence', 'jira', 'project-manager-weekly-report'],
        desiredSkillIds: ['confluence', 'jira', 'project-manager-weekly-report'],
        forceReinstall: true,
      })
    ).toEqual({
      addedSkillIds: ['confluence', 'jira', 'project-manager-weekly-report'],
      removedSkillIds: ['confluence', 'jira', 'project-manager-weekly-report'],
    })
  })

  it('copies a generated use-case skill package into the target install root', () => {
    const { installGeneratedSkillPackage } = loadManager()
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'generated-skill-install-'))

    try {
      const sourceDir = path.join(tempDir, 'source')
      const installRoot = path.join(tempDir, 'target-root')
      fs.mkdirSync(sourceDir, { recursive: true })
      fs.mkdirSync(path.join(sourceDir, 'scripts'), { recursive: true })
      fs.writeFileSync(path.join(sourceDir, 'SKILL.md'), '# 项目经理-项目周报\n', 'utf8')
      fs.writeFileSync(path.join(sourceDir, 'skill.json'), '{"name":"项目经理-项目周报"}\n', 'utf8')

      const installedDir = installGeneratedSkillPackage(
        sourceDir,
        installRoot,
        'project-manager-weekly-report'
      )

      expect(installedDir).toBe(path.join(installRoot, 'project-manager-weekly-report'))
      expect(fs.readFileSync(path.join(installedDir, 'SKILL.md'), 'utf8')).toContain('项目经理-项目周报')
      expect(fs.existsSync(path.join(installedDir, 'skill.json'))).toBe(true)
    } finally {
      fs.rmSync(tempDir, { force: true, recursive: true })
    }
  })

})
