import type { Locale, LocalizedText } from '../../types'

type LocalizedList = Record<Locale, readonly string[]>

export const onboardingCopy = {
  loading: {
    'zh-CN': '正在加载设置内容...',
    'en-US': 'Loading setup...',
  },
  homeEyebrow: {
    'zh-CN': '开始设置',
    'en-US': 'Start setup',
  },
  homeBody: {
    'zh-CN': '按下面 3 步设置好以后，AI 就能按公司的 SOP 去完成你选好的工作。',
    'en-US': 'Complete the three steps below, then AI can run the work you choose with your company SOPs.',
  },
  moduleGuideEyebrow: {
    'zh-CN': '模块说明',
    'en-US': 'Module guide',
  },
  installedCount: {
    'zh-CN': '已安装',
    'en-US': 'Installed',
  },
  backHome: {
    'zh-CN': '返回首页',
    'en-US': 'Back to home',
  },
  configured: {
    'zh-CN': '已设置',
    'en-US': 'Configured',
  },
  empty: {
    'zh-CN': '未设置',
    'en-US': 'Not set',
  },
  notInstalled: {
    'zh-CN': '未安装',
    'en-US': 'Not installed',
  },
  homeSummaryTitle: {
    'zh-CN': '已设置内容',
    'en-US': 'Current setup',
  },
  homeSelectedRole: {
    'zh-CN': '已选岗位',
    'en-US': 'Selected role',
  },
  homeBaseSkills: {
    'zh-CN': '公司 IT 工具',
    'en-US': 'Company IT tools',
  },
  homeConfiguredWork: {
    'zh-CN': '已配置工作',
    'en-US': 'Configured work',
  },
  homeInstallTargets: {
    'zh-CN': '安装目标',
    'en-US': 'Install targets',
  },
  homeInstalledSkills: {
    'zh-CN': '安装技能',
    'en-US': 'Installed skills',
  },
  homeInstalledSkillsTable: {
    'zh-CN': '安装技能汇总',
    'en-US': 'Installed skill summary',
  },
  useCaseColumn: {
    'zh-CN': '岗位用例',
    'en-US': 'Role use case',
  },
  productionColumn: {
    'zh-CN': '生产用',
    'en-US': 'Production',
  },
  testColumn: {
    'zh-CN': '测试用',
    'en-US': 'Test',
  },
  basicModuleDescription: {
    'zh-CN': '先选择公司里已经在用的 IT 工具，并补充对应账号信息。保存后，后续步骤可以直接使用这些配置。',
    'en-US': 'Choose the IT tools your company already uses and fill in the related credentials. After saving, later steps can use these settings directly.',
  },
  useCasesModuleDescription: {
    'zh-CN': '先选岗位，再补充这个岗位下要交给 AI 的具体工作内容和 SOP 要求。',
    'en-US': 'Choose the role first, then add the work AI should handle for that role and the SOP requirements.',
  },
  installModuleDescription: {
    'zh-CN': '先选择要安装到的 AI 工具，再确认公司 IT 工具和岗位生成技能的安装内容，最后开始安装。',
    'en-US': 'Choose the AI tool first, review the company IT tools and generated role skills, then start the installation.',
  },
  roleTab: {
    'zh-CN': '选择岗位',
    'en-US': 'Choose role',
  },
  workTab: {
    'zh-CN': '选择工作',
    'en-US': 'Choose work',
  },
  workTabAriaLabel: {
    'zh-CN': '工作配置导航',
    'en-US': 'Work configuration tabs',
  },
  useCasePanelTitle: {
    'zh-CN': '选择工作',
    'en-US': 'Choose work',
  },
  useCasePanelBody: {
    'zh-CN': '当前岗位下可以交给 AI 的工作。',
    'en-US': 'Work that AI can handle for the current role.',
  },
  addUseCase: {
    'zh-CN': '新增用例',
    'en-US': 'Add use case',
  },
  newUseCaseName: {
    'zh-CN': '新用例名称',
    'en-US': 'New use case name',
  },
  newUseCasePlaceholder: {
    'zh-CN': '例如：客户回访',
    'en-US': 'Example: Customer follow-up',
  },
  newUseCaseEmptyError: {
    'zh-CN': '请输入新用例名称。',
    'en-US': 'Enter a name for the new use case.',
  },
  newUseCaseDuplicateError: {
    'zh-CN': '这个用例名称已经存在。',
    'en-US': 'A use case with this name already exists.',
  },
  newUseCaseFailedError: {
    'zh-CN': '新增用例失败，请重试。',
    'en-US': 'Failed to add the new use case. Try again.',
  },
  addUseCaseSubmit: {
    'zh-CN': '添加用例',
    'en-US': 'Add use case',
  },
  cancel: {
    'zh-CN': '取消',
    'en-US': 'Cancel',
  },
  saveRole: {
    'zh-CN': '保存岗位',
    'en-US': 'Save role',
  },
  saveSettings: {
    'zh-CN': '保存设置',
    'en-US': 'Save settings',
  },
  saving: {
    'zh-CN': '保存中...',
    'en-US': 'Saving...',
  },
  sync: {
    'zh-CN': '开始同步安装',
    'en-US': 'Start sync install',
  },
  syncing: {
    'zh-CN': '同步中...',
    'en-US': 'Syncing...',
  },
  useCaseEmptyHint: {
    'zh-CN': '当前岗位没有可配置的工作。',
    'en-US': 'No configurable work is available for the current role.',
  },
  customUseCase: {
    'zh-CN': '自定义用例',
    'en-US': 'Custom use case',
  },
  credentialsTitle: {
    'zh-CN': '账号凭证',
    'en-US': 'Credentials',
  },
  credentialsBody: {
    'zh-CN': '只显示当前仍被选择的公司 IT 工具所需的凭证字段。保存后会立即同步这些配置。',
    'en-US': 'Only the credential fields for currently selected company IT tools are shown. Saving this module syncs the credentials immediately.',
  },
  selectAgentApps: {
    'zh-CN': '选择 Agent 应用',
    'en-US': 'Choose AI apps',
  },
  officialSite: {
    'zh-CN': '官网',
    'en-US': 'Official site',
  },
  noCredentials: {
    'zh-CN': '当前没有需要补充的凭证字段。',
    'en-US': 'No extra credential fields are required right now.',
  },
  testConnection: {
    'zh-CN': '测试连接',
    'en-US': 'Test connection',
  },
  connectionTestIdle: {
    'zh-CN': '未测试',
    'en-US': 'Not tested',
  },
  connectionTestPending: {
    'zh-CN': '测试中...',
    'en-US': 'Testing...',
  },
  connectionTestSuccess: {
    'zh-CN': '连接成功',
    'en-US': 'Connection succeeded',
  },
  connectionTestError: {
    'zh-CN': '连接失败',
    'en-US': 'Connection failed',
  },
  connectionTestAutoHint: {
    'zh-CN': '填完必填项后会自动测试，也可以手动点击测试连接。',
    'en-US': 'The app tests automatically after required fields are complete, and you can also run it manually.',
  },
  connectionTestIncomplete: {
    'zh-CN': '请先填写当前服务的必填项。',
    'en-US': 'Fill in the required fields for this service first.',
  },
  connectionTestAutoTrigger: {
    'zh-CN': '自动测试',
    'en-US': 'Automatic test',
  },
  connectionTestManualTrigger: {
    'zh-CN': '手动测试',
    'en-US': 'Manual test',
  },
  selectedAgentsTitle: {
    'zh-CN': '已选 Agent',
    'en-US': 'Selected AI apps',
  },
  generatedSkillsTitle: {
    'zh-CN': '岗位生成技能',
    'en-US': 'Generated role skills',
  },
  generatedSkillsTable: {
    'zh-CN': '岗位生成技能列表',
    'en-US': 'Generated role skill table',
  },
  noGeneratedSkills: {
    'zh-CN': '当前岗位暂无可安装的生成技能。',
    'en-US': 'No generated skills are available for installation for the current role.',
  },
  previewTitle: {
    'zh-CN': '同步预览',
    'en-US': 'Sync preview',
  },
  previewAdded: {
    'zh-CN': '预览新增技能',
    'en-US': 'Skills to add',
  },
  previewRemoved: {
    'zh-CN': '预览移除技能',
    'en-US': 'Skills to remove',
  },
  previewUnchanged: {
    'zh-CN': '预览未变化技能',
    'en-US': 'Unchanged skills',
  },
  none: {
    'zh-CN': '无',
    'en-US': 'None',
  },
  syncResultTitle: {
    'zh-CN': '同步结果',
    'en-US': 'Sync result',
  },
  syncSuccess: {
    'zh-CN': '同步完成',
    'en-US': 'Sync complete',
  },
  syncFailed: {
    'zh-CN': '同步失败',
    'en-US': 'Sync failed',
  },
  addedSkills: {
    'zh-CN': '新增技能',
    'en-US': 'Added skills',
  },
  removedSkills: {
    'zh-CN': '移除技能',
    'en-US': 'Removed skills',
  },
  unchangedSkills: {
    'zh-CN': '未变化技能',
    'en-US': 'Unchanged skills',
  },
  useCaseDescription: {
    'zh-CN': '用例描述',
    'en-US': 'Use case description',
  },
  useCaseDescriptionHint: {
    'zh-CN': '已预置一版描述，可按实际业务改写；重点写清每次执行需要提供什么信息。',
    'en-US': 'A starter description is prefilled. Rewrite it for the real workflow and clarify what information is required each run.',
  },
  sopLabel: {
    'zh-CN': '当前流程 / SOP / 模板',
    'en-US': 'Current workflow / SOP / template',
  },
  sopHint: {
    'zh-CN': '直接把流程 / SOP / 模板的链接贴到这里就行。',
    'en-US': 'You can just paste the workflow / SOP / template link here.',
  },
  saveSuccess: {
    'zh-CN': '保存成功',
    'en-US': 'Saved successfully',
  },
  saveFailed: {
    'zh-CN': '保存失败',
    'en-US': 'Save failed',
  },
  credentialSyncFailed: {
    'zh-CN': '设置已保存，但公司 IT 工具凭证同步失败：',
    'en-US': 'Settings were saved, but company IT credential sync failed:',
  },
  syncSaveInstallFirst: {
    'zh-CN': '请先保存当前安装设置。',
    'en-US': 'Save the current install settings first.',
  },
  syncSaveOtherFirst: {
    'zh-CN': '请先保存其他页面的设置。',
    'en-US': 'Save the changes on the other pages first.',
  },
  homeEntries: {
    basic: {
      title: {
        'zh-CN': '选择公司 IT 工具',
        'en-US': 'Company IT Tools',
      },
      summary: {
        'zh-CN': '先选公司常用系统',
        'en-US': 'Choose company systems first',
      },
      description: {
        'zh-CN': '先选公司里已经在用的 IT 工具。AI 后面要从这些工具里取信息，才能按公司的 SOP 做事。',
        'en-US': 'Choose the IT tools your company already uses. AI reads information from these tools so it can follow company SOPs.',
      },
      items: {
        'zh-CN': ['选择公司 IT 工具'],
        'en-US': ['Choose company IT tools'],
      },
    },
    useCases: {
      title: {
        'zh-CN': '配置要交给 AI 的工作',
        'en-US': 'Configure AI Work',
      },
      summary: {
        'zh-CN': '先选岗位，再选工作',
        'en-US': 'Choose role, then work',
      },
      description: {
        'zh-CN': '先选岗位，再决定哪些工作要交给 AI 去做，并补充对应的 SOP、信息来源和执行要求。',
        'en-US': 'Choose the role first, decide which work AI should handle, then add the related SOPs, info sources, and execution requirements.',
      },
      items: {
        'zh-CN': ['选择岗位', '选择工作', '补充 SOP / 信息来源 / 执行要求'],
        'en-US': ['Choose role', 'Choose work', 'Add SOP / info sources / execution rules'],
      },
    },
    install: {
      title: {
        'zh-CN': '安装到 AI 工具',
        'en-US': 'Install into AI Tool',
      },
      summary: {
        'zh-CN': '选择工具并开始安装',
        'en-US': 'Choose tool and install',
      },
      description: {
        'zh-CN': '把前面整理好的 Skill 安装到你正在使用的 AI 工具里，之后就可以直接调用。',
        'en-US': 'Install the prepared Skills into the AI tool you already use, then call them directly.',
      },
      items: {
        'zh-CN': ['选择 AI 工具', '确认安装内容', '开始安装'],
        'en-US': ['Choose AI tool', 'Review install content', 'Start installation'],
      },
    },
  },
} as const satisfies Record<string, LocalizedText | LocalizedList | unknown>

export function getOnboardingCopy(locale: Locale, text: LocalizedText): string {
  return text[locale] ?? text['zh-CN']
}

export function getOnboardingList(locale: Locale, text: LocalizedList): string[] {
  return Array.from(text[locale] ?? text['zh-CN'])
}
