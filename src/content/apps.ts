import type { TargetApp } from '../types'

export const targetApps: TargetApp[] = [
  {
    id: 'workbuddy',
    name: 'WorkBuddy',
    status: 'available',
    description: {
      'zh-CN': '首版完整路径。用问答向导收集信息，再展示配置结果。',
      'en-US':
        'The only fully open path in version one, using a guided questionnaire and configuration result page.'
    },
    highlight: {
      'zh-CN': '当前可配置',
      'en-US': 'Available now'
    }
  },
  {
    id: 'codex',
    name: 'Codex',
    status: 'coming-soon',
    description: {
      'zh-CN': '入口先保留，后续接入独立向导定义和结果页适配。',
      'en-US':
        'Visible now, with a dedicated wizard definition and result adapter planned next.'
    },
    highlight: {
      'zh-CN': '后续接入',
      'en-US': 'Planned next'
    }
  },
  {
    id: 'claude-code',
    name: 'Claude Code',
    status: 'coming-soon',
    description: {
      'zh-CN': '后续复用同一骨架扩展新的问题流和输出摘要。',
      'en-US':
        'Will reuse the same shell later with a new question flow and output summary.'
    },
    highlight: {
      'zh-CN': '后续接入',
      'en-US': 'Planned next'
    }
  }
]
