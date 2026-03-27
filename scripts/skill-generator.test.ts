// @vitest-environment node

import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

function loadSkillGenerator() {
  return require('./lib/skill-generator.cjs') as {
    generateSkillArtifacts: (config: {
      agentApps: string[]
      baseSkills: string[]
      credentials: Record<string, string>
      infoSources: string
      localOnly?: boolean
      outputDir: string
      reportRules: string
      roleKey: string
      role: string
      useCase: string
    }, sharedConfig: {
      agentApps: Record<string, { name: string }>
      baseSkills: Record<string, { name: string }>
      useCases: Record<string, { directory: string }>
    }, options?: {
      variant?: 'production' | 'test'
    }) => {
      skillConfig: { name: string }
      skillJsonPath: string
      skillMdPath: string
      useCaseDir: string
    }
    generateOnboardingSkillSetArtifacts: (config: {
      agentApps: string[]
      baseSkills: string[]
      credentials: Record<string, string>
      infoSources: string
      outputDir: string
      reportRules: string
      roleKey: string
      role: string
      useCase: string
    }, sharedConfig: {
      agentApps: Record<string, { name: string }>
      baseSkills: Record<string, { name: string }>
      useCases: Record<string, { directory: string }>
    }) => {
      production: {
        skillConfig: { name: string }
        skillJsonPath: string
        skillMdPath: string
        skillMD: string
        useCaseDir: string
      }
      test: {
        skillConfig: { name: string }
        skillJsonPath: string
        skillMdPath: string
        skillMD: string
        useCaseDir: string
      }
    }
  }
}

describe('generateSkillArtifacts', () => {
  it('uses the Chinese use case name as the skill name', () => {
    const { generateSkillArtifacts } = loadSkillGenerator()

    const result = generateSkillArtifacts(
      {
        agentApps: ['workbuddy', 'claude-code'],
        baseSkills: ['jira', 'confluence'],
        credentials: {
          jiraUsername: 'juns@example.com',
          jiraPassword: '123456',
        },
        infoSources: 'Jira 项目看板',
        outputDir: './test-output',
        reportRules: '按模板输出',
        roleKey: 'project-manager',
        role: '项目经理',
        useCase: '项目周报',
      },
      {
        agentApps: {
          workbuddy: { name: 'WorkBuddy' },
          'claude-code': { name: 'Claude Code' },
        },
        baseSkills: {
          jira: { name: 'Jira' },
          confluence: { name: 'Confluence' },
        },
        useCases: {
          项目周报: { directory: 'weekly-report' },
        },
      }
    )

    expect(result.skillConfig.name).toBe('项目经理-项目周报')
  })

  it('writes artifacts into the mapped English use case directory', () => {
    const { generateSkillArtifacts } = loadSkillGenerator()

    const result = generateSkillArtifacts(
      {
        agentApps: ['workbuddy'],
        baseSkills: ['jira'],
        credentials: {},
        infoSources: 'Jira 项目看板',
        outputDir: './test-output',
        reportRules: '',
        roleKey: 'project-manager',
        role: '项目经理',
        useCase: '项目周报',
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

    expect(result.useCaseDir).toBe('project-manager-weekly-report')
    expect(result.skillJsonPath).toBe('test-output/project-manager-weekly-report/skill.json')
    expect(result.skillMdPath).toBe('test-output/project-manager-weekly-report/SKILL.md')
  })

  it('generates matching production and test packages for the same role/use-case pair', () => {
    const { generateSkillArtifacts } = loadSkillGenerator()

    const sharedConfig = {
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

    const productionResult = generateSkillArtifacts(
      {
        agentApps: ['workbuddy'],
        baseSkills: ['jira'],
        credentials: {},
        infoSources: 'Jira 项目看板',
        outputDir: './test-output',
        reportRules: '',
        roleKey: 'project-manager',
        role: '项目经理',
        useCase: '项目周报',
      },
      sharedConfig,
      { variant: 'production' }
    )

    const testResult = generateSkillArtifacts(
      {
        agentApps: ['workbuddy'],
        baseSkills: ['jira'],
        credentials: {},
        infoSources: 'Jira 项目看板',
        outputDir: './test-output',
        reportRules: '',
        roleKey: 'project-manager',
        role: '项目经理',
        useCase: '项目周报',
      },
      sharedConfig,
      { variant: 'test' }
    )

    expect(productionResult.useCaseDir).toBe('project-manager-weekly-report')
    expect(testResult.useCaseDir).toBe('test-project-manager-weekly-report')
    expect(testResult.skillMD).toContain('## 测试环境说明')
    expect(testResult.skillMD).toContain('/tmp/skills-for-no-engineer')
    expect(testResult.skillMD).toContain('不要实际进行发送')
    expect(testResult.skillMD).toContain('最终结果不要进行更新执行，而是打印出来。')
    expect(productionResult.skillMD).not.toContain('## 测试环境说明')
  })

  it('returns both generated variants from a single wrapper call', () => {
    const { generateOnboardingSkillSetArtifacts } = loadSkillGenerator()

    const result = generateOnboardingSkillSetArtifacts(
      {
        agentApps: ['workbuddy'],
        baseSkills: ['jira'],
        credentials: {},
        infoSources: 'Jira 项目看板',
        outputDir: './test-output',
        reportRules: '',
        roleKey: 'project-manager',
        role: '项目经理',
        useCase: '项目周报',
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

    expect(result.production.useCaseDir).toBe('project-manager-weekly-report')
    expect(result.test.useCaseDir).toBe('test-project-manager-weekly-report')
    expect(result.test.skillMD).toContain('## 测试环境说明')
    expect(result.production.skillMD).not.toContain('## 测试环境说明')
  })

  it('keeps the legacy local-only path on production ids while adding test guidance', () => {
    const { generateSkillArtifacts } = loadSkillGenerator()

    const result = generateSkillArtifacts(
      {
        agentApps: ['workbuddy'],
        baseSkills: ['jira'],
        credentials: {},
        infoSources: 'Jira 项目看板',
        localOnly: true,
        outputDir: './test-output',
        reportRules: '',
        roleKey: 'project-manager',
        role: '项目经理',
        useCase: '项目周报',
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

    expect(result.useCaseDir).toBe('project-manager-weekly-report')
    expect(result.skillMD).toContain('## 测试环境说明')
    expect(result.skillMD).toContain('/tmp/skills-for-no-engineer')
  })

  it('rejects contradictory explicit production and local-only flags', () => {
    const { generateSkillArtifacts } = loadSkillGenerator()

    expect(() =>
      generateSkillArtifacts(
        {
          agentApps: ['workbuddy'],
          baseSkills: ['jira'],
          credentials: {},
          infoSources: 'Jira 项目看板',
          localOnly: true,
          outputDir: './test-output',
          reportRules: '',
          roleKey: 'project-manager',
          role: '项目经理',
          useCase: '项目周报',
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
        },
        { variant: 'production' }
      )
    ).toThrow('Conflicting skill generation flags')
  })

  it('fails fast on unknown variant values', () => {
    const { generateSkillArtifacts } = loadSkillGenerator()

    expect(() =>
      generateSkillArtifacts(
        {
          agentApps: ['workbuddy'],
          baseSkills: ['jira'],
          credentials: {},
          infoSources: 'Jira 项目看板',
          outputDir: './test-output',
          reportRules: '',
          roleKey: 'project-manager',
          role: '项目经理',
          useCase: '项目周报',
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
        },
        { variant: 'preview' as 'production' | 'test' }
      )
    ).toThrow('Unsupported skill variant: preview')
  })
})
