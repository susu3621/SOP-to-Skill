import { sharedConfig, workbuddyAgentApps, workbuddyBaseSkills } from './workbuddy'

describe('workbuddy agent apps', () => {
  it('does not expose Antigravity as a selectable app', () => {
    expect(sharedConfig.agentApps).not.toHaveProperty('antigravity')
    expect(workbuddyAgentApps.map((app) => app.value)).not.toContain('antigravity')
    expect(workbuddyAgentApps.map((app) => app.label['zh-CN'])).not.toContain('Antigravity')
  })

  it('exposes only Confluence, Jira, and Mail as base skills', () => {
    expect(Object.keys(sharedConfig.baseSkills)).toEqual(['confluence', 'jira', 'mail'])
    expect(workbuddyBaseSkills.map((skill) => skill.value)).toEqual(['confluence', 'jira', 'mail'])
    expect(workbuddyBaseSkills.map((skill) => skill.label['zh-CN'])).toEqual([
      'Confluence',
      'Jira',
      'Mail',
    ])
  })
})
