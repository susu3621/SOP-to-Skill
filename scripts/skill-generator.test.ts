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
      skillConfig: { name: string }
      skillJsonPath: string
      skillMdPath: string
      useCaseDir: string
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
})
