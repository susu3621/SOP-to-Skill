import type { Locale, LocalizedText } from '../types'

export const defaultLocale: Locale = 'zh-CN'

export const pageCopy = {
  appTitle: {
    'zh-CN': 'Skill Configurator',
    'en-US': 'Skill Configurator'
  },
  appSubtitle: {
    'zh-CN': '给普通用户的 skill 配置引导器骨架',
    'en-US': 'A guided skill setup shell for everyday users'
  },
  heroTitle: {
    'zh-CN': '把复杂配置拆成一步一步的问题',
    'en-US': 'Turn skill setup into a guided conversation'
  },
  heroBody: {
    'zh-CN':
      '首版聚焦 WorkBuddy，先把桌面界面、编译链路和未来多工具扩展骨架搭起来。',
    'en-US':
      'Version one focuses on WorkBuddy and establishes the desktop UI, build chain, and extension points for future tools.'
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
    'zh-CN': '本轮只开放 WorkBuddy 流程，其他入口先保留为可见占位。',
    'en-US':
      'This release only opens the WorkBuddy path while the others stay visible as future integrations.'
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
    'zh-CN': '这是首版的模拟摘要，用来确认问答流程和结果页结构。',
    'en-US':
      'This is the first-pass simulated summary used to validate the question flow and result layout.'
  },
  resultTitle: {
    'zh-CN': '已生成模拟配置结果',
    'en-US': 'Generated simulated configuration result'
  },
  resultBody: {
    'zh-CN':
      'WorkBuddy 将使用以下配置摘要。真实文件写入和环境探测将在后续版本接入。',
    'en-US':
      'WorkBuddy will use the following configuration summary. Real file writes and environment detection will be added in a later iteration.'
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
    'zh-CN': '默认中文，已预留双语结构',
    'en-US': 'Chinese default with bilingual structure ready'
  }
} satisfies Record<string, LocalizedText>

export function getCopy(locale: Locale, text: LocalizedText): string {
  return text[locale] ?? text['zh-CN']
}
