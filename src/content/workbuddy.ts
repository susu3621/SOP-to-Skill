import type { LocalizedText, WizardField, WizardOption, WizardStep } from '../types'

function text(value: string): LocalizedText {
  return {
    'zh-CN': value,
    'en-US': value,
  }
}

export const workbuddyRoles: WizardOption[] = [
  {
    value: '项目经理',
    label: text('项目经理'),
    hint: text('需要串联项目状态、风险、进度和跨团队同步。'),
  },
  {
    value: '交付负责人',
    label: text('交付负责人'),
    hint: text('更关注里程碑、客户节奏和交付承诺。'),
  },
  {
    value: '研发负责人',
    label: text('研发负责人'),
    hint: text('更关注研发进展、资源投入和风险暴露。'),
  },
]

export const workbuddySteps: WizardStep[] = [
  {
    id: 'base-skills',
    title: text('连接你已经在用的基础工具'),
    description: text('先勾选你想让 WorkBuddy 读取上下文的基础系统。'),
    fields: [
      {
        id: 'baseSkills',
        type: 'multi-select',
        label: text('基础设施 / Skills'),
        required: true,
        options: [
          {
            value: 'jira',
            label: text('Jira'),
            hint: text('同步项目任务、缺陷、负责人和状态变化。'),
          },
          {
            value: 'confluence',
            label: text('Confluence'),
            hint: text('读取周报模板、项目文档和会议纪要。'),
          },
        ],
      },
    ],
  },
  {
    id: 'use-case',
    title: text('目前已支持的用例'),
    description: text('首版只聚焦一个最小闭环，用来确认问答流程是否合理。'),
    fields: [
      {
        id: 'useCase',
        type: 'single-select',
        label: text('已支持用例'),
        required: true,
        options: [
          {
            value: '发送周报',
            label: text('发送周报'),
            hint: text('汇总项目状态、风险和待办，形成标准周报。'),
          },
        ],
      },
    ],
  },
  {
    id: 'project-source',
    title: text('项目清单从哪里来'),
    description: text('请提供一个可用链接，后续会作为 WorkBuddy 读取项目范围的入口。'),
    fields: [
      {
        id: 'projectSourceUrl',
        type: 'url',
        label: text('项目清单来源链接'),
        placeholder: text('https://pm.example.com/projects'),
        required: true,
      },
    ],
  },
  {
    id: 'weekly-rules',
    title: text('周报有哪些公司规则'),
    description: text('如果公司对周报格式、语气、章节或汇报对象有要求，可以先写在这里。'),
    fields: [
      {
        id: 'reportRules',
        type: 'textarea',
        label: text('周报规则或模板'),
        placeholder: text('例如：采用固定模板，先风险后里程碑，没有更新也要写明阻塞项。'),
        required: false,
      },
    ],
  },
  {
    id: 'credentials',
    title: text('补充账号与凭证'),
    description: text('只展示你前面勾选过的基础工具所需账号信息。'),
    fields: [],
  },
]

const credentialFieldMap: Record<string, WizardField[]> = {
  jira: [
    {
      id: 'jiraUsername',
      type: 'text',
      label: text('Jira 用户名'),
      placeholder: text('your.name@example.com'),
      required: true,
    },
    {
      id: 'jiraPassword',
      type: 'password',
      label: text('Jira 密码 / API Token'),
      placeholder: text('输入 Jira 密码或 API Token'),
      required: true,
    },
  ],
  confluence: [
    {
      id: 'confluenceUsername',
      type: 'text',
      label: text('Confluence 用户名'),
      placeholder: text('your.name@example.com'),
      required: true,
    },
    {
      id: 'confluencePassword',
      type: 'password',
      label: text('Confluence 密码 / API Token'),
      placeholder: text('输入 Confluence 密码或 API Token'),
      required: true,
    },
  ],
}

export function getCredentialFields(baseSkills: string[]): WizardField[] {
  return baseSkills.flatMap((skill) => credentialFieldMap[skill] ?? [])
}

export function getRoleLabel(value?: string): string {
  return workbuddyRoles.find((role) => role.value === value)?.value ?? '未选择'
}

export function getBaseSkillLabels(baseSkills: string[]): string[] {
  const field = workbuddySteps[0]?.fields[0]
  const options = field?.options ?? []

  return baseSkills.map(
    (value) => options.find((option) => option.value === value)?.label['zh-CN'] ?? value
  )
}
