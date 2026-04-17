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
    'zh-CN': '先选择公司里已经在用的 IT 工具，并补充对应账号信息。环境会自动检测；凭证填完后可按服务手动测试连接。保存后，后续步骤可以直接使用这些配置。',
    'en-US': 'Choose the IT tools your company already uses and fill in the related credentials. Environment checks run automatically, and connection tests run manually per service after the credentials are filled in. After saving, later steps can use these settings directly.',
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
  addUseCaseHint: {
    'zh-CN': '有新的想法？点击“新增用例”把新的 SO / 需求记录进来。',
    'en-US': 'Have a new idea? Click “Add use case” to capture the new SO or requirement.',
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
    'zh-CN': '只显示当前仍被选择的公司 IT 工具所需的凭证字段。保存后会立即同步这些配置；连接测试请按服务、设备或仓库手动执行。',
    'en-US': 'Only the credential fields for currently selected company IT tools are shown. Saving this module syncs the credentials immediately; run connection tests manually per service, device, or repository.',
  },
  linuxDevicesBody: {
    'zh-CN': '可录入多台 Linux 设备，每台设备单独填写名称、IP 和登录账号。',
    'en-US': 'Add multiple Linux devices and keep a separate name, host, and login account for each one.',
  },
  linuxDeviceName: {
    'zh-CN': '设备名称',
    'en-US': 'Device name',
  },
  linuxDeviceNamePlaceholder: {
    'zh-CN': '例如：Build Server',
    'en-US': 'Example: Build Server',
  },
  linuxDeviceHost: {
    'zh-CN': 'IP / 主机地址',
    'en-US': 'IP / Host',
  },
  linuxDeviceHostPlaceholder: {
    'zh-CN': '例如：192.168.9.20',
    'en-US': 'Example: 192.168.9.20',
  },
  linuxDeviceUsername: {
    'zh-CN': '用户名',
    'en-US': 'Username',
  },
  linuxDeviceUsernamePlaceholder: {
    'zh-CN': '例如：ops',
    'en-US': 'Example: ops',
  },
  linuxDevicePassword: {
    'zh-CN': '密码',
    'en-US': 'Password',
  },
  linuxDevicePasswordPlaceholder: {
    'zh-CN': '输入设备登录密码',
    'en-US': 'Enter the device password',
  },
  linuxAddDevice: {
    'zh-CN': '新增设备',
    'en-US': 'Add device',
  },
  linuxRemoveDevice: {
    'zh-CN': '删除设备',
    'en-US': 'Remove device',
  },
  linuxDeviceListEmpty: {
    'zh-CN': '当前还没有 Linux 设备，点击“新增设备”开始录入。',
    'en-US': 'No Linux devices yet. Click “Add device” to start.',
  },
  svnRepositoriesBody: {
    'zh-CN': '可录入多个 SVN 仓库，每个仓库单独填写名称、URL 和登录账号。',
    'en-US': 'Add multiple SVN repositories and keep a separate name, URL, and login for each one.',
  },
  svnRepositoryName: {
    'zh-CN': '仓库名称',
    'en-US': 'Repository name',
  },
  svnRepositoryNamePlaceholder: {
    'zh-CN': '例如：Project Repo',
    'en-US': 'Example: Project Repo',
  },
  svnRepositoryUrl: {
    'zh-CN': 'SVN URL',
    'en-US': 'SVN URL',
  },
  svnRepositoryUrlPlaceholder: {
    'zh-CN': 'https://svn.your-company.com/repos/project',
    'en-US': 'https://svn.your-company.com/repos/project',
  },
  svnRepositoryUsername: {
    'zh-CN': 'SVN 用户名',
    'en-US': 'SVN Username',
  },
  svnRepositoryUsernamePlaceholder: {
    'zh-CN': 'your.name',
    'en-US': 'your.name',
  },
  svnRepositoryPassword: {
    'zh-CN': 'SVN 密码',
    'en-US': 'SVN Password',
  },
  svnRepositoryPasswordPlaceholder: {
    'zh-CN': '输入 SVN 密码',
    'en-US': 'Enter your SVN password',
  },
  svnAddRepository: {
    'zh-CN': '新增仓库',
    'en-US': 'Add repository',
  },
  svnRemoveRepository: {
    'zh-CN': '删除仓库',
    'en-US': 'Remove repository',
  },
  svnRepositoryListEmpty: {
    'zh-CN': '当前还没有 SVN 仓库，点击“新增仓库”开始录入。',
    'en-US': 'No SVN repositories yet. Click “Add repository” to start.',
  },
  selectAgentApps: {
    'zh-CN': '选择 Agent 应用',
    'en-US': 'Choose AI apps',
  },
  officialSite: {
    'zh-CN': '点此打开官网',
    'en-US': 'Open official site',
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
    'zh-CN': '✅ 成功',
    'en-US': '✅ Success',
  },
  connectionTestError: {
    'zh-CN': '❌ 失败',
    'en-US': '❌ Failed',
  },
  connectionTestAutoHint: {
    'zh-CN': '填写完成后可手动点击测试连接。',
    'en-US': 'After filling in the fields, run the connection test manually.',
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
  environmentTitle: {
    'zh-CN': '运行环境',
    'en-US': 'Runtime environment',
  },
  environmentAutoHint: {
    'zh-CN': '勾选基础技能后会自动检测本机环境。',
    'en-US': 'The app automatically checks local runtime requirements after a base skill is selected.',
  },
  environmentIdle: {
    'zh-CN': '未检测',
    'en-US': 'Not checked',
  },
  environmentPending: {
    'zh-CN': '检测中...',
    'en-US': 'Checking...',
  },
  environmentPendingHint: {
    'zh-CN': '正在检测所需环境，请稍候...',
    'en-US': 'Checking required runtime tools. Please wait...',
  },
  environmentReady: {
    'zh-CN': '环境已就绪',
    'en-US': 'Environment ready',
  },
  environmentMissing: {
    'zh-CN': '缺少环境',
    'en-US': 'Missing requirements',
  },
  environmentUnsupported: {
    'zh-CN': '当前平台暂不支持自动安装',
    'en-US': 'Automatic install is unavailable on this platform',
  },
  environmentError: {
    'zh-CN': '环境检测失败',
    'en-US': 'Environment check failed',
  },
  environmentAutomaticTrigger: {
    'zh-CN': '自动检测',
    'en-US': 'Automatic check',
  },
  environmentManualTrigger: {
    'zh-CN': '手动检测',
    'en-US': 'Manual check',
  },
  environmentInstallButton: {
    'zh-CN': '自动安装缺失环境',
    'en-US': 'Auto-install missing requirements',
  },
  environmentInstallRunning: {
    'zh-CN': '安装中...',
    'en-US': 'Installing...',
  },
  environmentInstallSuccess: {
    'zh-CN': '环境安装完成',
    'en-US': 'Environment installation complete',
  },
  environmentInstallError: {
    'zh-CN': '环境安装失败',
    'en-US': 'Environment installation failed',
  },
  environmentInstallLogs: {
    'zh-CN': '安装日志',
    'en-US': 'Install logs',
  },
  environmentRequirementReady: {
    'zh-CN': '已就绪',
    'en-US': 'Ready',
  },
  environmentRequirementMissing: {
    'zh-CN': '缺失',
    'en-US': 'Missing',
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
  useCaseSummary: {
    'zh-CN': '用例说明',
    'en-US': 'Use case summary',
  },
  useCaseDescriptionHint: {
    'zh-CN': '已预置一版描述，可按实际业务改写；重点写清每次执行需要提供什么信息。',
    'en-US': 'A starter description is prefilled. Rewrite it for the real workflow and clarify what information is required each run.',
  },
  customUseCaseDescriptionHint: {
    'zh-CN': '写清这个自定义用例要做什么。',
    'en-US': 'Describe what this custom use case is for.',
  },
  systemUseCaseDescription: {
    'zh-CN': '系统内置说明',
    'en-US': 'Built-in guidance',
  },
  useCaseQuestionsTitle: {
    'zh-CN': '你需要填写的问题',
    'en-US': 'Questions to answer',
  },
  addQuestion: {
    'zh-CN': '新增问题',
    'en-US': 'Add question',
  },
  emptyQuestionHint: {
    'zh-CN': '先新增一个问题。',
    'en-US': 'Add a question first.',
  },
  questionLabelPrefix: {
    'zh-CN': '问题',
    'en-US': 'Question',
  },
  answerLabelPrefix: {
    'zh-CN': '回答',
    'en-US': 'Answer',
  },
  removeQuestion: {
    'zh-CN': '删除问题',
    'en-US': 'Delete question',
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
  guideNext: {
    'zh-CN': '下一步',
    'en-US': 'Next',
  },
  guidePrevious: {
    'zh-CN': '上一步',
    'en-US': 'Back',
  },
  guideClose: {
    'zh-CN': '关闭',
    'en-US': 'Close',
  },
  guideStepLabel: {
    'zh-CN': '第 {current} 步 / 共 {total} 步',
    'en-US': 'Step {current} of {total}',
  },
  guideHomeStep1Title: {
    'zh-CN': '先选公司 IT 工具',
    'en-US': 'Start with company IT tools',
  },
  guideHomeStep1Body: {
    'zh-CN': '第一步先把公司正在用的 IT 工具和账号信息准备好，后面的工作配置都会依赖这些系统。',
    'en-US': 'Start by selecting the company IT tools and preparing the related credentials. Later steps depend on these systems.',
  },
  guideHomeStep2Title: {
    'zh-CN': '再配置要交给 AI 的工作',
    'en-US': 'Then configure the work for AI',
  },
  guideHomeStep2Body: {
    'zh-CN': '第二步再选择岗位，并补充这个岗位下要交给 AI 的具体工作和 SOP 要求。',
    'en-US': 'Next choose the role and describe the work plus SOP requirements that AI should handle.',
  },
  guideHomeStep3Title: {
    'zh-CN': '最后安装到 AI 工具',
    'en-US': 'Finally install into the AI tool',
  },
  guideHomeStep3Body: {
    'zh-CN': '最后确认要安装到哪一个 AI 工具，再开始同步安装。',
    'en-US': 'Finally choose the AI tool you want to install into and start sync installation.',
  },
  guideBasicStep1Title: {
    'zh-CN': '先选你们公司正在使用的 IT 工具',
    'en-US': 'First choose the IT tools your company uses',
  },
  guideBasicStep1Body: {
    'zh-CN': '先勾选公司里已经在用的系统，只保留你们真正需要接入的工具。',
    'en-US': 'Start by selecting the systems your company actually uses so only relevant tools are configured.',
  },
  guideBasicStep2Title: {
    'zh-CN': '再填写这些工具对应的账号信息',
    'en-US': 'Then fill in the credentials for those tools',
  },
  guideBasicStep2Body: {
    'zh-CN': '系统会根据你选中的工具显示对应账号字段；把这里补齐以后，AI 才能从这些系统里取信息。',
    'en-US': 'The app shows only the credential fields for the selected tools. Fill these in so AI can read data from those systems.',
  },
  guideBasicStep3Title: {
    'zh-CN': '最后保存公司 IT 工具设置',
    'en-US': 'Finally save the company IT tool settings',
  },
  guideBasicStep3Body: {
    'zh-CN': '确认信息无误后保存这一页，后面的岗位工作和安装步骤就会直接复用这些配置。',
    'en-US': 'Save this page after the information is ready so later onboarding steps can reuse these settings.',
  },
  guideUseCasesStep1Title: {
    'zh-CN': '先选岗位',
    'en-US': 'Choose the role first',
  },
  guideUseCasesStep1Body: {
    'zh-CN': '先在这里确认你当前的岗位，系统会据此决定后面默认给你哪些工作类型。',
    'en-US': 'Choose the current role first. The app uses it to decide which work types to prepare next.',
  },
  guideUseCasesStep2Title: {
    'zh-CN': '再切到要交给 AI 的工作',
    'en-US': 'Then switch to the work tab',
  },
  guideUseCasesStep2Body: {
    'zh-CN': '切到工作页以后，选择这个岗位下真正要交给 AI 去做的工作。',
    'en-US': 'Switch to the work tab and choose the work items this role should hand off to AI.',
  },
  guideUseCasesStep3Title: {
    'zh-CN': '最后补充工作说明和 SOP',
    'en-US': 'Finally add the work instructions and SOP',
  },
  guideUseCasesStep3Body: {
    'zh-CN': '把工作说明、信息来源和执行要求补完整，再保存这部分内容。',
    'en-US': 'Add the work description, information sources, and execution rules, then save the configuration.',
  },
  guideInstallStep1Title: {
    'zh-CN': '先选要安装到的 AI 工具',
    'en-US': 'First choose the AI tool to install into',
  },
  guideInstallStep1Body: {
    'zh-CN': '先选择最终要把 Skill 安装到哪一个 AI 工具里。',
    'en-US': 'Start by choosing which AI tool should receive the generated Skills.',
  },
  guideInstallStep2Title: {
    'zh-CN': '再确认安装内容',
    'en-US': 'Then review the install contents',
  },
  guideInstallStep2Body: {
    'zh-CN': '这里会汇总基础工具和岗位生成的 Skill，确认哪些内容会被安装。',
    'en-US': 'Review the base tools and generated Skills here to confirm what will be installed.',
  },
  guideInstallStep3Title: {
    'zh-CN': '最后开始同步安装',
    'en-US': 'Finally start sync installation',
  },
  guideInstallStep3Body: {
    'zh-CN': '确认无误后点击同步安装，把前面准备好的内容真正写入目标 AI 工具。',
    'en-US': 'Start sync installation to write the prepared content into the target AI tool.',
  },
  homeEntries: {
    basic: {
      title: {
        'zh-CN': '选择公司 IT 工具',
        'en-US': 'Company IT Tools',
      },
      summary: {
        'zh-CN': '先选系统，再测连接',
        'en-US': 'Choose systems, then test access',
      },
      description: {
        'zh-CN': '先选公司里已经在用的 IT 工具，补充账号信息，并在需要时手动测试连接。AI 后面要从这些工具里取信息，才能按公司的 SOP 做事。',
        'en-US': 'Choose the IT tools your company already uses, add the required credentials, and manually test access when needed. AI reads information from these tools so it can follow company SOPs.',
      },
      items: {
        'zh-CN': ['选择公司 IT 工具', '填写账号信息', '按需测试连接'],
        'en-US': ['Choose company IT tools', 'Fill in credentials', 'Run connection tests as needed'],
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
