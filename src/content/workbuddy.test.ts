import {
  buildGeneratedSkillIdsForRoleUseCase,
  createCustomRoleUseCaseContent,
  createDefaultRoleUseCaseContents,
  getCredentialFields,
  getCredentialGroups,
  getBaseSkillNameById,
  getOnboardingAgentNameById,
  getOnboardingUseCaseOptionById,
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

  it('exposes Confluence, Jira, Gerrit, SVN, Linux, and Tencent Exmail as base skills', () => {
    expect(Object.keys(sharedConfig.baseSkills)).toEqual([
      'confluence',
      'jira',
      'gerrit',
      'svn',
      'linux',
      'mail',
    ])
    expect(workbuddyBaseSkills.map((skill) => skill.value)).toEqual([
      'confluence',
      'jira',
      'gerrit',
      'svn',
      'linux',
      'mail',
    ])
    expect(workbuddyBaseSkills.map((skill) => skill.label['zh-CN'])).toEqual([
      'Confluence',
      'Jira',
      'Gerrit',
      'SVN',
      'Linux',
      '腾讯企业邮箱',
    ])
  })

  it('groups company IT tools by system type for future expansion', () => {
    expect(onboardingBaseSkillGroups.map((group) => group.name)).toEqual([
      'Wiki 系统',
      '问题管理系统',
      '版本管理',
      '主机与运维',
      '通信系统',
    ])
    expect(onboardingBaseSkillGroups.map((group) => group.skills.map((skill) => skill.id))).toEqual([
      ['confluence'],
      ['jira'],
      ['gerrit', 'svn'],
      ['linux'],
      ['mail'],
    ])
  })

  it('describes wiki and version-management skills as read-write systems', () => {
    expect(sharedConfig.baseSkills.confluence?.description).toEqual({
      'zh-CN': '读取并写入周报模板、项目文档和会议纪要',
      'en-US': 'Read and write weekly report templates, project docs, and meeting notes.',
    })
    expect(sharedConfig.baseSkills.gerrit?.description).toEqual({
      'zh-CN': '读取并写入代码评审、提交状态和变更信息',
      'en-US': 'Read and write code reviews, submit status, and change information.',
    })
    expect(sharedConfig.baseSkills.svn?.description).toEqual({
      'zh-CN': '读取并写入版本库目录、历史提交和工作副本状态',
      'en-US': 'Read and write repository paths, history, and working-copy state.',
    })
    expect(onboardingBaseSkillGroups.find((group) => group.id === 'wiki')?.description).toBe(
      '集中放 SOP、项目文档和会议纪要，方便 AI 读取和写入稳定资料。'
    )
    expect(
      onboardingBaseSkillGroups.find((group) => group.id === 'version-management')?.description
    ).toBe('同步版本库、提交历史和版本变更，方便 AI 读取和写入研发协作信息。')
  })

  it('exposes flat credential fields for existing tools while Linux stays as a structured device editor', () => {
    const allCredentialFields = getCredentialFields([
      'confluence',
      'jira',
      'gerrit',
      'svn',
      'linux',
      'mail',
    ])

    expect(allCredentialFields.map((field) => field.id)).toEqual([
      'confluenceUrl',
      'confluenceUsername',
      'confluencePassword',
      'jiraUrl',
      'jiraUsername',
      'jiraPassword',
      'gerritAuthMode',
      'gerritUrl',
      'gerritHttpUsername',
      'gerritHttpPassword',
      'gerritSshHost',
      'gerritSshPort',
      'gerritSshUsername',
      'svnUrl',
      'svnUsername',
      'svnPassword',
      'mailUsername',
      'mailPassword',
    ])
    expect(sharedConfig.baseSkills.confluence?.credentials).toHaveProperty('confluenceUrl')
    expect(sharedConfig.baseSkills.jira?.credentials).toHaveProperty('jiraUrl')
    expect(sharedConfig.baseSkills.gerrit?.credentials).toHaveProperty('gerritAuthMode')
    expect(sharedConfig.baseSkills.svn?.credentials).toHaveProperty('svnUrl')
    expect(sharedConfig.baseSkills.linux?.credentials).toEqual({})
    expect(sharedConfig.baseSkills.mail?.name).toEqual({
      'zh-CN': '腾讯企业邮箱',
      'en-US': 'Tencent Exmail',
    })
    expect(sharedConfig.baseSkills.mail?.credentials).not.toHaveProperty('mailHost')
    expect(sharedConfig.baseSkills.mail?.credentials).not.toHaveProperty('mailFrom')
  })

  it('shows Gerrit HTTP fields by default and switches required fields for SSH mode', () => {
    const defaultGroup = getCredentialGroups(['gerrit'])[0]
    expect(defaultGroup?.service_name).toBe('Gerrit')
    expect(defaultGroup?.fields.map((field) => field.id)).toEqual([
      'gerritAuthMode',
      'gerritUrl',
      'gerritHttpUsername',
      'gerritHttpPassword',
    ])
    expect(defaultGroup?.required_field_ids).toEqual([
      'gerritUrl',
      'gerritHttpUsername',
      'gerritHttpPassword',
    ])

    const sshGroup = getCredentialGroups(['gerrit'], 'zh-CN', {
      gerritAuthMode: 'ssh',
    })[0]
    expect(sshGroup?.fields.map((field) => field.id)).toEqual([
      'gerritAuthMode',
      'gerritSshHost',
      'gerritSshPort',
      'gerritSshUsername',
    ])
    expect(sshGroup?.required_field_ids).toEqual([
      'gerritSshHost',
      'gerritSshPort',
      'gerritSshUsername',
    ])
  })

  it('exposes SVN as a structured onboarding credential group without flat fields', () => {
    const svnGroup = getCredentialGroups(['svn'])[0]

    expect(svnGroup?.service_name).toBe('SVN')
    expect(svnGroup?.editor_type).toBe('svn-repositories')
    expect(svnGroup?.fields).toEqual([])
    expect(svnGroup?.required_field_ids).toEqual([])
  })

  it('exposes Linux as a structured onboarding credential group without flat fields', () => {
    const linuxGroup = getCredentialGroups(['linux'])[0]

    expect(linuxGroup?.service_id).toBe('linux')
    expect(linuxGroup?.service_name).toBe('Linux')
    expect(linuxGroup?.fields).toEqual([])
    expect(linuxGroup?.required_field_ids).toEqual([])
  })

  it('exposes project manager, quality manager, and IT manager in visible role selectors while keeping legacy hidden role labels', () => {
    expect(Object.keys(sharedConfig.roles)).toEqual([
      'project-manager',
      'product-manager',
      'sales-manager',
      'qa-manager',
      'it-manager',
      'delivery-manager',
    ])
    expect(workbuddyRoles.map((role) => role.value)).toEqual([
      '项目经理',
      '质量经理',
      'IT经理',
    ])
    expect(onboardingRoles.map((role) => role.id)).toEqual([
      'project-manager',
      'qa-manager',
      'it-manager',
    ])
    expect(getRoleNameById('rd-manager')).toBe('研发经理')
    expect(getRoleNameById('product-manager')).toBe('产品经理')
  })

  it('assigns quality-management use cases plus generic logging, planning, and weekly report defaults to qa-manager', () => {
    expect(sharedConfig.roles['qa-manager']?.useCases).toEqual([
      '质量异常汇总与闭环跟进',
      '客诉售后问题分析与回复草稿',
      '变更评审里的质量影响检查',
      '质量周报',
      '供应商质量问题跟踪',
      '记录日志',
      '记录计划',
      '项目周报',
    ])

    const qaDefaults = createDefaultRoleUseCaseContents('qa-manager')

    expect(qaDefaults.map((useCase) => useCase.use_case_name)).toEqual([
      '质量异常汇总与闭环跟进',
      '客诉售后问题分析与回复草稿',
      '变更评审里的质量影响检查',
      '质量周报',
      '供应商质量问题跟踪',
      '记录日志',
      '记录计划',
      '项目周报',
    ])
    expect(qaDefaults.every((useCase) => useCase.description_locked)).toBe(true)
  })

  it('assigns IT-management use cases plus generic logging, planning, and weekly report defaults to it-manager', () => {
    expect(sharedConfig.roles['it-manager']?.useCases).toEqual([
      'IT 服务台工单分析与周报',
      '账号权限申请审核与开通跟踪',
      '基础应用程序的安装',
      '运维巡检异常汇总',
      '项目立项配置建立',
      '记录日志',
      '记录计划',
      '项目周报',
    ])

    const itDefaults = createDefaultRoleUseCaseContents('it-manager')

    expect(itDefaults.map((useCase) => useCase.use_case_name)).toEqual([
      'IT 服务台工单分析与周报',
      '账号权限申请审核与开通跟踪',
      '基础应用程序的安装',
      '运维巡检异常汇总',
      '项目立项配置建立',
      '记录日志',
      '记录计划',
      '项目周报',
    ])
    expect(itDefaults.every((useCase) => useCase.description_locked)).toBe(true)
  })

  it('defines structured onboarding questions for the five IT-manager use cases', () => {
    expect(getOnboardingUseCaseOptionById('it-service-desk-report')?.structured_questions).toEqual([
      expect.objectContaining({
        id: 'service-desk-ticket-source',
        label: '从哪里获取服务台工单清单？',
        required: true,
      }),
      expect.objectContaining({
        id: 'service-desk-progress-source',
        label: '从哪里可以知道处理进展、SLA 和责任人？',
        required: true,
      }),
      expect.objectContaining({
        id: 'service-desk-weekly-report-sop',
        label: '从哪里获取 IT 服务台周报模板或 SOP？',
        required: true,
      }),
      expect.objectContaining({
        id: 'other',
        label: '其他',
        required: false,
      }),
    ])

    expect(getOnboardingUseCaseOptionById('access-request-tracking')?.structured_questions).toEqual([
      expect.objectContaining({
        id: 'access-request-source',
        label: '从哪里获取账号 / 权限申请？',
        required: true,
      }),
      expect.objectContaining({
        id: 'access-matrix-source',
        label: '从哪里可以知道岗位对应的权限矩阵和审批要求？',
        required: true,
      }),
      expect.objectContaining({
        id: 'access-provisioning-sop',
        label: '从哪里获取账号开通、权限变更和离职回收的 SOP？',
        required: true,
      }),
      expect.objectContaining({
        id: 'other',
        label: '其他',
        required: false,
      }),
    ])

    expect(
      getOnboardingUseCaseOptionById('basic-application-installation')?.structured_questions
    ).toEqual([
      expect.objectContaining({
        id: 'standard-software-list',
        label: '从哪里获取标准软件清单？',
        required: true,
      }),
      expect.objectContaining({
        id: 'installer-source',
        label: '从哪里获取安装包、版本要求或下载入口？',
        required: true,
      }),
      expect.objectContaining({
        id: 'installation-sop',
        label: '从哪里获取安装顺序、授权方式或验收 SOP？',
        required: true,
      }),
      expect.objectContaining({
        id: 'other',
        label: '其他',
        required: false,
      }),
    ])

    expect(
      getOnboardingUseCaseOptionById('operations-inspection-summary')?.structured_questions
    ).toEqual([
      expect.objectContaining({
        id: 'inspection-result-source',
        label: '从哪里获取巡检结果或监控告警？',
        required: true,
      }),
      expect.objectContaining({
        id: 'affected-system-source',
        label: '从哪里可以知道受影响的主机、系统或服务清单？',
        required: true,
      }),
      expect.objectContaining({
        id: 'inspection-sop',
        label: '从哪里获取巡检模板或异常处理 SOP？',
        required: true,
      }),
      expect.objectContaining({
        id: 'other',
        label: '其他',
        required: false,
      }),
    ])

    expect(getOnboardingUseCaseOptionById('project-kickoff-setup')?.structured_questions).toEqual([
      expect.objectContaining({
        id: 'project-request-source',
        label: '从哪里获取项目立项或开项申请？',
        required: true,
      }),
      expect.objectContaining({
        id: 'setup-scope-source',
        label: '从哪里可以知道需要建立哪些系统、权限组或协作空间？',
        required: true,
      }),
      expect.objectContaining({
        id: 'project-setup-sop',
        label: '从哪里获取项目立项配置模板或 SOP？',
        required: true,
      }),
      expect.objectContaining({
        id: 'other',
        label: '其他',
        required: false,
      }),
    ])
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

  it('prefills built-in project-manager descriptions with system guidance and normalized question answers', () => {
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
        description_locked: true,
        description: getLocalizedConfigValue(sharedConfig.useCases['项目周报']?.defaultDescription, 'zh-CN'),
        info_sources: '保留自定义来源',
        rules: '保留自定义流程',
        questions: expect.arrayContaining([
          expect.objectContaining({
            id: 'project-info-navigation',
            answer: '保留自定义来源',
          }),
          expect.objectContaining({
            id: 'weekly-report-sop',
            answer: '保留自定义流程',
          }),
        ]),
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

  it('defines structured weekly-report questions with corrected project-info navigation wording', () => {
    const weeklyReport = getOnboardingUseCaseOptionById('weekly-report')

    expect(weeklyReport?.structured_questions).toEqual([
      expect.objectContaining({
        id: 'project-list-source',
        label: '从哪里获取负责的项目清单？',
        required: true,
      }),
      expect.objectContaining({
        id: 'project-info-navigation',
        label: '从哪里可以知道如何寻找每个项目的信息？',
        required: true,
      }),
      expect.objectContaining({
        id: 'weekly-report-sop',
        label: '从哪里获取周报 SOP？',
        required: true,
      }),
      expect.objectContaining({
        id: 'other',
        label: '其他',
        required: false,
      }),
    ])
  })

  it('creates built-in use cases with locked descriptions and structured questions', () => {
    const defaults = createDefaultRoleUseCaseContents('project-manager')
    const weeklyReport = defaults.find((useCase) => useCase.use_case_id === 'weekly-report')

    expect(weeklyReport).toEqual(
      expect.objectContaining({
        description_locked: true,
        description: expect.stringContaining('汇总项目状态、风险和下周动作'),
        questions: [
          expect.objectContaining({
            id: 'project-list-source',
            label: '从哪里获取负责的项目清单？',
            answer: '',
            locked: true,
            required: true,
          }),
          expect.objectContaining({
            id: 'project-info-navigation',
            label: '从哪里可以知道如何寻找每个项目的信息？',
            answer: '',
            locked: true,
            required: true,
          }),
          expect.objectContaining({
            id: 'weekly-report-sop',
            label: '从哪里获取周报 SOP？',
            answer: '',
            locked: true,
            required: true,
          }),
          expect.objectContaining({
            id: 'other',
            label: '其他',
            answer: '',
            locked: true,
            required: false,
          }),
        ],
      })
    )
  })

  it('creates custom use cases with editable descriptions and no default questions', () => {
    expect(createCustomRoleUseCaseContent('project-manager', '客户拜访纪要', [])).toEqual(
      expect.objectContaining({
        use_case_name: '客户拜访纪要',
        description_locked: false,
        description: '',
        questions: [],
      })
    )
  })
})
