import type { WizardStep } from '../types'

export const workbuddySteps: WizardStep[] = [
  {
    id: 'work-style',
    title: {
      'zh-CN': '先判断 WorkBuddy 主要帮你做什么',
      'en-US': 'Decide what WorkBuddy should help with first'
    },
    description: {
      'zh-CN': '首版先收集一个核心使用场景，方便结果页生成有方向的配置摘要。',
      'en-US':
        'The first version captures one primary usage mode so the result page can show a focused configuration summary.'
    },
    fields: [
      {
        id: 'primaryScenario',
        type: 'single-select',
        label: {
          'zh-CN': '主要使用场景',
          'en-US': 'Primary usage scenario'
        },
        required: true,
        options: [
          {
            value: '项目协作',
            label: {
              'zh-CN': '项目协作',
              'en-US': 'Project collaboration'
            },
            hint: {
              'zh-CN': '偏向任务同步、跨人沟通和上下文整理',
              'en-US': 'Focuses on task sync, cross-team communication, and context management'
            }
          },
          {
            value: '知识整理',
            label: {
              'zh-CN': '知识整理',
              'en-US': 'Knowledge curation'
            }
          },
          {
            value: '重复流程',
            label: {
              'zh-CN': '重复流程',
              'en-US': 'Repeatable workflows'
            }
          }
        ]
      }
    ]
  },
  {
    id: 'workspace',
    title: {
      'zh-CN': '告诉配置器你的工作目录或项目目录',
      'en-US': 'Tell the configurator where the workspace lives'
    },
    description: {
      'zh-CN': '这里先只收集路径，占位模拟将来生成本地配置时所需的上下文。',
      'en-US':
        'This step currently captures only a path and stands in for the future local configuration context.'
    },
    fields: [
      {
        id: 'workspacePath',
        type: 'text',
        label: {
          'zh-CN': '工作目录',
          'en-US': 'Workspace path'
        },
        placeholder: {
          'zh-CN': '/Users/you/workbuddy-project',
          'en-US': '/Users/you/workbuddy-project'
        },
        required: true
      }
    ]
  }
]
