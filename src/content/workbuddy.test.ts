import {
  createDefaultRoleUseCaseContents,
  getRoleNameById,
  onboardingBaseSkillGroups,
  onboardingUseCases,
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

  it('groups company IT tools by system type for future expansion', () => {
    expect(onboardingBaseSkillGroups.map((group) => group.name)).toEqual([
      'Wiki 系统',
      '问题管理系统',
      '通信系统',
    ])
    expect(onboardingBaseSkillGroups.map((group) => group.skills.map((skill) => skill.id))).toEqual([
      ['confluence'],
      ['jira'],
      ['mail'],
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

  it('keeps only the retained project-manager use cases after pruning the removed scenarios', () => {
    expect(sharedConfig.roles['project-manager']?.useCases.length).toBe(8)
    expect(sharedConfig.roles['project-manager']?.useCases).toEqual(
      expect.arrayContaining(['需求评估', '立项准备', '需求变更评估', '项目复盘'])
    )
    expect(sharedConfig.roles['project-manager']?.useCases).not.toEqual(
      expect.arrayContaining(['成本核算', '交期评估', '资源协调', '风险升级', '样机准备', '测试问题闭环', '试产导入'])
    )
    expect(onboardingUseCases.map((useCase) => useCase.name)).toEqual(
      expect.arrayContaining(['需求评估', '立项准备', '需求变更评估', '项目复盘'])
    )
    expect(onboardingUseCases.map((useCase) => useCase.name)).not.toEqual(
      expect.arrayContaining(['成本核算', '交期评估', '资源协调', '风险升级', '样机准备', '测试问题闭环', '试产导入'])
    )
  })

  it('prefills editable project-manager descriptions with summary, usage notes, and input-output guidance', () => {
    const defaults = createDefaultRoleUseCaseContents('project-manager')
    const requirementAssessmentOption = onboardingUseCases.find((useCase) => useCase.name === '需求评估')
    const requirementAssessment = defaults.find((useCase) => useCase.use_case_id === 'requirement-assessment')

    expect(defaults.every((useCase) => useCase.description.trim().length > 0)).toBe(true)
    expect(defaults.every((useCase) => useCase.info_sources === '')).toBe(true)
    expect(defaults.every((useCase) => useCase.rules === '')).toBe(true)
    expect(requirementAssessmentOption?.description_prompt).toContain('输入：')
    expect(requirementAssessmentOption?.description_prompt).toContain('输出：')
    expect(requirementAssessment?.description).toContain('梳理售前需求、企业技术积累和约束边界')
    expect(requirementAssessment?.description).toContain('适合配置成帮你做售前需求初评的助手')
    expect(requirementAssessment?.description).toContain('需要提前说明它会读取哪些公司现有技术积累')
    expect(requirementAssessment?.description).toContain('输入：客户原始需求')
    expect(requirementAssessment?.description).toContain('\n输出：需求拆解')
    expect(requirementAssessmentOption?.info_sources_prompt).toContain('技术模块清单')
    expect(requirementAssessmentOption?.rules_prompt).toContain('当前流程 / SOP / 模板')

    const normalized = createDefaultRoleUseCaseContents('project-manager', [
      {
        role_id: 'project-manager',
        use_case_id: 'requirement-assessment',
        use_case_name: '需求评估',
        description: requirementAssessmentOption?.description ?? '',
        info_sources: '',
        rules: requirementAssessmentOption?.rules_prompt ?? '',
      },
      {
        role_id: 'project-manager',
        use_case_id: 'weekly-report',
        use_case_name: '项目周报',
        description: '保留自定义说明',
        info_sources: '保留自定义来源',
        rules: '保留自定义流程',
      },
    ])

    expect(normalized.find((useCase) => useCase.use_case_id === 'requirement-assessment')).toEqual(
      expect.objectContaining({
        description: expect.stringContaining('适合配置成帮你做售前需求初评的助手'),
        info_sources: '',
        rules: '',
      })
    )
    expect(normalized.find((useCase) => useCase.use_case_id === 'weekly-report')).toEqual(
      expect.objectContaining({
        description: '保留自定义说明',
        info_sources: '保留自定义来源',
        rules: '保留自定义流程',
      })
    )
  })
})
