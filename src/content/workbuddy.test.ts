import {
  buildGeneratedSkillIdsForRoleUseCase,
  createDefaultRoleUseCaseContents,
  getBaseSkillNameById,
  getOnboardingAgentNameById,
  getRoleNameById,
  onboardingBaseSkillGroups,
  onboardingUseCases,
  onboardingRoles,
  sharedConfig,
  workbuddyAgentApps,
  workbuddyBaseSkills,
  workbuddyRoles,
} from './workbuddy'

function getLocalizedConfigValue(value: unknown, locale: 'zh-CN' | 'en-US') {
  if (typeof value === 'string') {
    return value
  }

  if (value && typeof value === 'object') {
    return (value as Record<'zh-CN' | 'en-US', string | undefined>)[locale] ?? ''
  }

  return ''
}

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
    expect(sharedConfig.roles['project-manager']?.useCases.length).toBe(5)
    expect(sharedConfig.roles['project-manager']?.useCases).toEqual(
      ['需求评估', '记录日志', '记录计划', '项目周报', '问题跟踪']
    )
    expect(sharedConfig.roles['project-manager']?.useCases).not.toEqual(
      expect.arrayContaining(['立项准备', '需求变更评估', '项目复盘', '成本核算', '交期评估'])
    )
    expect(onboardingUseCases.map((useCase) => useCase.name)).toEqual(
      expect.arrayContaining(['需求评估', '记录日志', '记录计划', '项目周报', '问题跟踪'])
    )
    expect(onboardingUseCases.map((useCase) => useCase.name)).not.toEqual(
      expect.arrayContaining(['成本核算', '交期评估', '资源协调', '风险升级', '样机准备'])
    )
  })

  it('prefills editable project-manager descriptions with summary, usage notes, and input guidance', () => {
    const defaults = createDefaultRoleUseCaseContents('project-manager')
    const requirementAssessmentOption = onboardingUseCases.find((useCase) => useCase.name === '需求评估')
    const requirementAssessment = defaults.find((useCase) => useCase.use_case_id === 'requirement-assessment')

    expect(defaults.every((useCase) => useCase.description.trim().length > 0)).toBe(true)
    expect(defaults.every((useCase) => useCase.info_sources === '')).toBe(true)
    expect(defaults.every((useCase) => useCase.rules === '')).toBe(true)
    expect(requirementAssessmentOption?.description_prompt).toContain(
      '输入（每次执行都需要提供给Skill的信息）：'
    )
    expect(requirementAssessmentOption?.description_prompt).not.toContain('输出（Skill输出的结果）：')
    expect(requirementAssessment?.description).toContain('梳理售前需求、企业技术积累和约束边界')
    expect(requirementAssessment?.description).toContain('适合配置成帮你做售前需求初评的助手')
    expect(requirementAssessment?.description).toContain('需要提前说明它会读取哪些公司现有技术积累')
    expect(requirementAssessment?.description).toContain(
      '输入（每次执行都需要提供给Skill的信息）：需要评估的需求名字'
    )
    expect(requirementAssessment?.description).not.toContain('其他相关信息由 AI 自己从系统中查找。')
    expect(requirementAssessment?.description).not.toContain('输出（Skill输出的结果）：')
    expect(requirementAssessment?.description).not.toContain('客户原始需求、销售澄清记录')
    expect(requirementAssessment?.description).not.toContain('范围边界和待确认问题')
    expect(requirementAssessmentOption?.info_sources_prompt).toContain('技术模块清单')
    expect(requirementAssessmentOption?.rules_prompt).toContain('例如：\n当前流程 / SOP / 模板：')
    expect(requirementAssessmentOption?.rules_prompt).toContain('较好的例子：')
    expect(requirementAssessmentOption?.rules_prompt).toContain('技术积累库：')
    expect(requirementAssessmentOption?.rules_prompt).not.toContain('查找')

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

  it('uses updated default input wording for daily log, planning, and issue tracking', () => {
    const defaults = createDefaultRoleUseCaseContents('project-manager')
    const dailyLog = defaults.find((useCase) => useCase.use_case_id === 'daily-log')
    const planning = defaults.find((useCase) => useCase.use_case_id === 'planning')
    const issueTracking = defaults.find((useCase) => useCase.use_case_id === 'issue-tracking')

    expect(dailyLog?.description).toContain('输入（每次执行都需要提供给Skill的信息）：具体哪一天。')
    expect(dailyLog?.description).not.toContain('会议纪要、聊天记录和问题管理系统变化')
    expect(dailyLog?.description).not.toContain('输出（Skill输出的结果）：')
    expect(planning?.description).toContain('输入（每次执行都需要提供给Skill的信息）：计划的时间及范围。')
    expect(planning?.description).not.toContain('项目里程碑、任务拆解和跨团队依赖')
    expect(planning?.description).not.toContain('输出（Skill输出的结果）：')
    expect(issueTracking?.description).toContain(
      '输入（每次执行都需要提供给Skill的信息）：要跟踪的问题，或者项目。'
    )
    expect(issueTracking?.description).not.toContain('问题管理系统中的缺陷、测试反馈和会议行动项')
    expect(issueTracking?.description).not.toContain('输出（Skill输出的结果）：')
  })

  it('reads explicit default use case values from shared config instead of composing them in code', () => {
    const defaults = createDefaultRoleUseCaseContents('project-manager')
    const dailyLog = defaults.find((useCase) => useCase.use_case_id === 'daily-log')

    expect(sharedConfig.useCases['记录日志']).toHaveProperty('defaultDescription')
    expect(sharedConfig.useCases['记录日志']).toHaveProperty('defaultInfoSources')
    expect(sharedConfig.useCases['记录日志']).toHaveProperty('defaultRules')
    expect(dailyLog?.description).toBe(
      getLocalizedConfigValue(sharedConfig.useCases['记录日志']?.defaultDescription, 'zh-CN')
    )
    expect(dailyLog?.info_sources).toBe(
      getLocalizedConfigValue(sharedConfig.useCases['记录日志']?.defaultInfoSources, 'zh-CN')
    )
    expect(dailyLog?.rules).toBe(
      getLocalizedConfigValue(sharedConfig.useCases['记录日志']?.defaultRules, 'zh-CN')
    )
  })

  it('re-localizes config-backed default use case content when the locale changes', () => {
    const zhDefaults = createDefaultRoleUseCaseContents('project-manager', [], 'zh-CN')
    const englishDefaults = createDefaultRoleUseCaseContents('project-manager', zhDefaults, 'en-US')
    const requirementAssessment = englishDefaults.find(
      (useCase) => useCase.use_case_id === 'requirement-assessment'
    )
    const dailyLog = englishDefaults.find((useCase) => useCase.use_case_id === 'daily-log')

    expect(requirementAssessment?.use_case_name).toBe(
      getLocalizedConfigValue(sharedConfig.useCases['需求评估']?.name, 'en-US')
    )
    expect(requirementAssessment?.description).toBe(
      getLocalizedConfigValue(sharedConfig.useCases['需求评估']?.defaultDescription, 'en-US')
    )
    expect(dailyLog?.use_case_name).toBe(
      getLocalizedConfigValue(sharedConfig.useCases['记录日志']?.name, 'en-US')
    )
    expect(dailyLog?.description).toBe(
      getLocalizedConfigValue(sharedConfig.useCases['记录日志']?.defaultDescription, 'en-US')
    )
  })

  it('exposes localized onboarding names from shared config', () => {
    expect(getOnboardingAgentNameById('workbuddy', 'en-US')).toBe('WorkBuddy')
    expect(getRoleNameById('project-manager', 'en-US')).toBe('Project Manager')
    expect(getBaseSkillNameById('jira', 'en-US')).toBe('Jira')
  })

  it('adds example and other sections to every SOP placeholder', () => {
    expect(onboardingUseCases.every((useCase) => useCase.rules_prompt.includes('较好的例子：'))).toBe(
      true
    )
    expect(onboardingUseCases.every((useCase) => useCase.rules_prompt.includes('其他：'))).toBe(true)
  })

  it('preserves custom use cases when rebuilding the selected role content list', () => {
    const generatedIds = buildGeneratedSkillIdsForRoleUseCase('project-manager', '客户回访')
    const defaults = createDefaultRoleUseCaseContents('project-manager', [
      {
        role_id: 'project-manager',
        use_case_id: '客户回访',
        use_case_name: '客户回访',
        description: '回顾客户反馈并输出后续动作。',
        info_sources: '客户邮件、会议纪要',
        rules: '按客户优先级排序',
      },
    ])

    expect(defaults.some((useCase) => useCase.use_case_id === '客户回访')).toBe(true)
    expect(defaults.find((useCase) => useCase.use_case_id === '客户回访')).toEqual(
      expect.objectContaining({
        use_case_name: '客户回访',
        description: '回顾客户反馈并输出后续动作。',
        rules: '按客户优先级排序',
      })
    )
    expect(generatedIds.production_skill_id).toBe('project-manager-客户回访')
    expect(generatedIds.test_skill_id).toBe('test-project-manager-客户回访')
  })
})
