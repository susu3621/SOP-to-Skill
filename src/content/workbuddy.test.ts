import {
  getRoleNameById,
  onboardingRoles,
  sharedConfig,
  workbuddyAgentApps,
  workbuddyBaseSkills,
  workbuddyRoles,
} from './workbuddy'

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

  it('exposes only project manager in visible role selectors while keeping legacy role labels', () => {
    expect(Object.keys(sharedConfig.roles)).toEqual([
      'project-manager',
      'product-manager',
      'sales-manager',
      'qa-manager',
      'delivery-manager',
      'rd-manager',
    ])
    expect(workbuddyRoles.map((role) => role.value)).toEqual(['项目经理'])
    expect(onboardingRoles.map((role) => role.id)).toEqual(['project-manager'])
    expect(getRoleNameById('product-manager')).toBe('产品经理')
  })
})
