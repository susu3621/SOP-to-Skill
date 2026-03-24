import type { Locale, LocalizedText } from '../types'

export const defaultLocale: Locale = 'zh-CN'

export const pageCopy = {
  appTitle: {
    'zh-CN': 'WorkBuddy',
    'en-US': 'WorkBuddy'
  },
  appSubtitle: {
    'zh-CN': '项目周报发送引导 Demo',
    'en-US': 'Weekly report onboarding demo'
  },
  heroTitle: {
    'zh-CN': '把周报准备过程拆成一步一步的问题',
    'en-US': 'Turn weekly report setup into a guided conversation'
  },
  heroBody: {
    'zh-CN':
      '这版只验证问答界面和页面节奏，先帮项目经理把发送周报前的准备条件梳理清楚。',
    'en-US':
      'This version focuses on the onboarding flow and helps a project manager prepare the inputs needed for weekly reporting.'
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
    'zh-CN': 'WorkBuddy 周报发送引导',
    'en-US': 'WorkBuddy weekly report onboarding'
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
    'zh-CN': '界面 Demo，暂不接入真实发送能力',
    'en-US': 'UI demo only, no live send capability yet'
  }
} satisfies Record<string, LocalizedText>

export function getCopy(locale: Locale, text: LocalizedText): string {
  return text[locale] ?? text['zh-CN']
}
