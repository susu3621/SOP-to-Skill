// @vitest-environment node

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
    }) => {
      lines: string[]
    }
    getDefaultInstallRoot: (agentType: 'codex' | 'claude-code', homeDir: string) => string
    parseManagerArgs: (args: string[]) => {
      help: boolean
      storageDir: string | null
    }
  }
}

describe('onboarding manager helpers', () => {
  it('parses --storage-dir and --help flags for the config manager entrypoint', () => {
    const { parseManagerArgs } = loadManager()

    expect(parseManagerArgs(['--storage-dir', '/tmp/onboarding-state'])).toEqual({
      help: false,
      storageDir: '/tmp/onboarding-state',
    })
    expect(parseManagerArgs(['--help'])).toEqual({
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

  it('maps agent types to default install roots', () => {
    const { getDefaultInstallRoot } = loadManager()

    expect(getDefaultInstallRoot('codex', '/Users/juns')).toBe('/Users/juns/.codex/skills')
    expect(getDefaultInstallRoot('claude-code', '/Users/juns')).toBe('/Users/juns/.claude/skills')
  })
})
