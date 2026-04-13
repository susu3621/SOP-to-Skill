import type { Locale, LocalizedText } from '../types'

export const defaultLocale: Locale = 'zh-CN'

export const pageCopy = {
  appTitle: {
    'zh-CN': 'SOP 交给 AI 执行，省下时间去做真正有价值的事。',
    'en-US': 'Hand your company SOPs to AI so you can spend time on work that matters.',
  },
  heroBody: {
    'zh-CN':
      '利用公司的 SOP，快速生成对应的 Skill，让 AI 快速替你完成任务。',
    'en-US':
      'Choose the company IT tools first, decide which work AI should handle, then install it into an AI tool so repeated SOP work can run automatically.',
  },
  startButton: {
    'zh-CN': '开始配置',
    'en-US': 'Start setup'
  },
  selectionTitle: {
    'zh-CN': '先选你要配置的目标程序',
    'en-US': 'Choose the tool you want to configure first'
  },
  selectionBody: {
    'zh-CN': '当前优先开放 WorkBuddy 配置流程，其他入口会逐步补齐。',
    'en-US':
      'This release prioritizes the WorkBuddy setup flow while the other entries are filled in step by step.'
  },
  wizardTitle: {
    'zh-CN': 'WorkBuddy 配置向导',
    'en-US': 'WorkBuddy setup wizard'
  },
  summaryTitle: {
    'zh-CN': '配置摘要',
    'en-US': 'Configuration summary'
  },
  summaryBody: {
    'zh-CN': '用于确认当前问答流程和结果页结构。',
    'en-US':
      'Used to review the current question flow and result layout.'
  },
  resultTitle: {
    'zh-CN': '已生成配置结果',
    'en-US': 'Generated configuration result'
  },
  resultBody: {
    'zh-CN': 'WorkBuddy 将使用以下配置摘要。',
    'en-US': 'WorkBuddy will use the following configuration summary.'
  },
  comingSoon: {
    'zh-CN': '即将支持',
    'en-US': 'Coming soon'
  },
  previous: {
    'zh-CN': '上一步',
    'en-US': 'Back'
  },
  next: {
    'zh-CN': '下一步',
    'en-US': 'Next'
  },
  review: {
    'zh-CN': '查看摘要',
    'en-US': 'Review summary'
  },
  generate: {
    'zh-CN': '生成配置预览',
    'en-US': 'Generate preview'
  },
  restart: {
    'zh-CN': '重新开始',
    'en-US': 'Start over'
  },
  backToSummary: {
    'zh-CN': '返回摘要',
    'en-US': 'Back to summary'
  },
  selectionNextHint: {
    'zh-CN': '先选择一个当前可用的目标程序',
    'en-US': 'Choose an available target to continue'
  },
  resultLocations: {
    'zh-CN': '后续预期落点',
    'en-US': 'Planned output locations'
  },
  localeTag: {
    'zh-CN': '检查更新',
    'en-US': 'Check updates',
  },
  exportLogs: {
    'zh-CN': '导出日志',
    'en-US': 'Export logs',
  },
  exportingLogs: {
    'zh-CN': '导出中...',
    'en-US': 'Exporting...',
  },
  exportLogsSuccessPrefix: {
    'zh-CN': '日志已导出：',
    'en-US': 'Log exported: ',
  },
  exportLogsFailedPrefix: {
    'zh-CN': '导出日志失败：',
    'en-US': 'Failed to export logs: ',
  },
  navOnboarding: {
    'zh-CN': '开始设置',
    'en-US': 'Start setup',
  },
  navSkills: {
    'zh-CN': 'Skill 库',
    'en-US': 'Skill Library',
  },
  navInstalled: {
    'zh-CN': '已安装',
    'en-US': 'Installed',
  },
  skillsLibraryEyebrow: {
    'zh-CN': 'Skill 库',
    'en-US': 'Skill Library',
  },
  skillsLibraryTitle: {
    'zh-CN': '可用 Skill',
    'en-US': 'Available Skills',
  },
  skillsLibraryBody: {
    'zh-CN': '浏览并安装可用 Skill。',
    'en-US': 'Browse and install available Skills.',
  },
  skillsLibraryEmpty: {
    'zh-CN':
      '暂无可用 Skill。请将 Skill 目录包放到仓库的 `skills/` 目录，或应用数据目录中的 `skills/` 目录。',
    'en-US':
      'No Skills are available yet. Put the Skill directory package in the repository `skills/` directory or the application data `skills/` directory.',
  },
  installedLibraryEyebrow: {
    'zh-CN': 'Skill 库',
    'en-US': 'Skill Library',
  },
  installedLibraryTitle: {
    'zh-CN': '已安装 Skill',
    'en-US': 'Installed Skills',
  },
  installedLibraryBody: {
    'zh-CN': '管理已经安装到各个 AI 工具中的 Skill。',
    'en-US': 'Manage Skills already installed in each AI tool.',
  },
  installedLibraryEmpty: {
    'zh-CN': '暂无已安装 Skill。',
    'en-US': 'No Skills are installed yet.',
  },
  localeZh: {
    'zh-CN': '中文',
    'en-US': 'Chinese',
  },
  localeEn: {
    'zh-CN': 'English',
    'en-US': 'English',
  },
  updateAvailable: {
    'zh-CN': '更新',
    'en-US': 'Update',
  },
  installUpdate: {
    'zh-CN': '下载并安装更新',
    'en-US': 'Download and install update',
  },
  installingUpdate: {
    'zh-CN': '安装更新中...',
    'en-US': 'Installing update...',
  },
  updateHintPrefix: {
    'zh-CN': '发现新版本',
    'en-US': 'New version available',
  },
  loading: {
    'zh-CN': '加载中...',
    'en-US': 'Loading...',
  },
  installedStatus: {
    'zh-CN': '已安装',
    'en-US': 'Installed',
  },
  notInstalledStatus: {
    'zh-CN': '未安装',
    'en-US': 'Not installed',
  },
  noDescription: {
    'zh-CN': '暂无描述',
    'en-US': 'No description yet.',
  },
  skillDetailEyebrow: {
    'zh-CN': 'Skill 详情',
    'en-US': 'Skill details',
  },
  versionLabel: {
    'zh-CN': '版本',
    'en-US': 'Version',
  },
  categoryLabel: {
    'zh-CN': '类别',
    'en-US': 'Category',
  },
  authorLabel: {
    'zh-CN': '作者',
    'en-US': 'Author',
  },
  unknownAuthor: {
    'zh-CN': '未知',
    'en-US': 'Unknown',
  },
  targetsLabel: {
    'zh-CN': '支持的目标',
    'en-US': 'Supported targets',
  },
  statusLabel: {
    'zh-CN': '状态',
    'en-US': 'Status',
  },
  reinstall: {
    'zh-CN': '重新安装',
    'en-US': 'Reinstall',
  },
  install: {
    'zh-CN': '安装',
    'en-US': 'Install',
  },
  installWizardEyebrow: {
    'zh-CN': '安装向导',
    'en-US': 'Install wizard',
  },
  chooseTargetApp: {
    'zh-CN': '选择目标应用程序：',
    'en-US': 'Choose the target application:',
  },
  fillVariables: {
    'zh-CN': '填写配置变量：',
    'en-US': 'Fill in the configuration variables:',
  },
  confirmInstallConfig: {
    'zh-CN': '确认安装配置：',
    'en-US': 'Review the installation configuration:',
  },
  targetAppLabel: {
    'zh-CN': '目标应用',
    'en-US': 'Target application',
  },
  installing: {
    'zh-CN': '安装中...',
    'en-US': 'Installing...',
  },
  confirmInstall: {
    'zh-CN': '确认安装',
    'en-US': 'Confirm install',
  },
  finish: {
    'zh-CN': '完成',
    'en-US': 'Done',
  },
  installSuccessPrefix: {
    'zh-CN': '成功安装到',
    'en-US': 'Installed successfully to',
  },
  installFailed: {
    'zh-CN': '安装失败',
    'en-US': 'Installation failed',
  },
  uninstall: {
    'zh-CN': '卸载',
    'en-US': 'Uninstall',
  },
  uninstallFailedPrefix: {
    'zh-CN': '卸载失败',
    'en-US': 'Uninstall failed',
  },
  settingsEyebrow: {
    'zh-CN': '设置',
    'en-US': 'Settings',
  },
  settingsTitle: {
    'zh-CN': '应用设置',
    'en-US': 'App settings',
  },
  settingsBody: {
    'zh-CN': '配置 SOP to Skill。',
    'en-US': 'Configure SOP to Skill.',
  },
  appUpdatesTitle: {
    'zh-CN': '应用更新',
    'en-US': 'App updates',
  },
  currentVersionPrefix: {
    'zh-CN': '当前版本',
    'en-US': 'Current version',
  },
  newVersionPrefix: {
    'zh-CN': '新版本',
    'en-US': 'New version',
  },
  noNewVersion: {
    'zh-CN': '当前没有检测到可用的新版本。',
    'en-US': 'No new version is available right now.',
  },
  recheckUpdates: {
    'zh-CN': '重新检查更新',
    'en-US': 'Check again',
  },
  dataDirectoryTitle: {
    'zh-CN': '数据目录',
    'en-US': 'Data directory',
  },
  openInFinder: {
    'zh-CN': '在 Finder 中打开',
    'en-US': 'Open in Finder',
  },
  localPackage: {
    'zh-CN': '本地包',
    'en-US': 'Local package',
  },
} satisfies Record<string, LocalizedText>

export function getCopy(locale: Locale, text: LocalizedText): string {
  return text[locale] ?? text['zh-CN']
}
