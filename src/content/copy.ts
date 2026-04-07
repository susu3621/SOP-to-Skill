import type { Locale, LocalizedText } from '../types'

export const defaultLocale: Locale = 'zh-CN'

export const pageCopy = {
  appTitle: {
    'zh-CN': 'SOP 交给 AI 执行，省下时间去做真正有价值的事。',
    'en-US': 'Hand your company SOPs to AI so you can spend time on work that matters.',
  },
  heroBody: {
    'zh-CN':
      '先选公司常用的 IT 工具，再告诉 AI 要做哪些工作，最后安装到 AI 工具里，让重复工作按公司的 SOP 自动完成。',
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
  }
} satisfies Record<string, LocalizedText>

export function getCopy(locale: Locale, text: LocalizedText): string {
  return text[locale] ?? text['zh-CN']
}
