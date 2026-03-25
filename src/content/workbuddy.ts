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
    value: '产品经理',
    label: text('产品经理'),
    hint: text('更关注需求变更、版本范围和关键里程碑。'),
  },
  {
    value: '质量经理',
    label: text('质量经理'),
    hint: text('更关注质量风险、测试闭环和过程规范。'),
  },
  {
    value: '研发经理',
    label: text('研发经理'),
    hint: text('更关注研发进展、资源投入和风险暴露。'),
  },
  {
    value: '销售经理',
    label: text('销售经理'),
    hint: text('更关注客户机会、商务节奏和项目推进状态。'),
  },
  {
    value: '交付经理',
    label: text('交付经理'),
    hint: text('更关注交付节奏、上线问题和跨团队协同闭环。'),
  },
]

export const workbuddyAgentApps: WizardOption[] = [
  {
    value: 'antigravity',
    label: text('Antigravity'),
    hint: text('适合承接企业工作流与 AI 协作场景。'),
  },
  {
    value: 'workbuddy',
    label: text('WorkBuddy'),
    hint: text('当前这套周报引导的主承载应用。'),
  },
  {
    value: 'claude-code',
    label: text('Claude Code'),
    hint: text('适合在命令行里通过对话驱动任务执行。'),
  },
  {
    value: 'codex',
    label: text('Codex'),
    hint: text('适合工程协作、脚本调用和自动化操作。'),
  },
  {
    value: 'gemini-cli',
    label: text('Gemini CLI'),
    hint: text('适合接入另一套命令行 Agent 工作方式。'),
  },
]

export const workbuddyBaseSkills: WizardOption[] = [
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
  {
    value: 'saleseasy',
    label: text('销售易'),
    hint: text('同步客户机会、商务推进和关键客户动态。'),
  },
  {
    value: 'notion',
    label: text('Notion'),
    hint: text('读取团队知识库、项目页面和协作文档。'),
  },
  {
    value: 'zentao',
    label: text('禅道'),
    hint: text('同步需求、Bug、任务和测试执行状态。'),
  },
]

export const workbuddySteps: WizardStep[] = [
  {
    id: 'role',
    title: text('选择你的岗位'),
    description: text('先确认你在团队里的角色，再决定这套引导后面要收集哪些上下文。'),
    fields: [
      {
        id: 'role',
        type: 'single-select',
        label: text('选择你的岗位'),
        required: true,
        options: workbuddyRoles,
      },
    ],
  },
  {
    id: 'base-skills',
    title: text('连接你已经在用的基础工具'),
    description: text('先勾选你想让 WorkBuddy 读取上下文的基础系统。'),
    fields: [
      {
        id: 'baseSkills',
        type: 'multi-select',
        label: text('基础工具（可多选）'),
        required: true,
        options: workbuddyBaseSkills,
      },
    ],
  },
  {
    id: 'use-case',
    title: text('岗位用例'),
    description: text('先从当前已支持的岗位用例中选择一个，确认这次要完成的目标。'),
    fields: [
      {
        id: 'useCase',
        type: 'single-select',
        label: text('岗位用例'),
        required: true,
        options: [
          {
            value: '记录日志',
            label: text('记录日志'),
            hint: text('记录每日工作内容和进展，形成项目日志。'),
          },
          {
            value: '记录计划',
            label: text('记录计划'),
            hint: text('制定和更新项目计划，跟踪里程碑和任务。'),
          },
          {
            value: '项目周报',
            label: text('项目周报'),
            hint: text('汇总项目状态、风险和待办，形成标准周报。'),
          },
        ],
      },
    ],
  },
  {
    id: 'project-source',
    title: text('基础信息来源'),
    description: text('请用文本框写下你依赖的基础信息来源，可以是系统名称、页面链接、文档位置或补充说明。'),
    fields: [
      {
        id: 'infoSources',
        type: 'textarea',
        label: text('基础信息来源'),
        placeholder: text('例如：Jira 项目看板、Confluence 项目主页、销售易商机页、例会纪要目录。'),
        required: true,
      },
    ],
  },
  {
    id: 'weekly-rules',
    title: text('用例规则'),
    description: text('如果这个用例在公司内部有模板、规则、语气或输出要求，可以先写在这里。'),
    fields: [
      {
        id: 'reportRules',
        type: 'textarea',
        label: text('用例规则或模板'),
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
  saleseasy: [
    {
      id: 'saleseasyUsername',
      type: 'text',
      label: text('销售易 用户名'),
      placeholder: text('your.name@example.com'),
      required: true,
    },
    {
      id: 'saleseasyPassword',
      type: 'password',
      label: text('销售易 密码'),
      placeholder: text('输入销售易密码'),
      required: true,
    },
  ],
  notion: [
    {
      id: 'notionUsername',
      type: 'text',
      label: text('Notion 用户邮箱'),
      placeholder: text('your.name@example.com'),
      required: true,
    },
    {
      id: 'notionPassword',
      type: 'password',
      label: text('Notion 密码 / Integration Token'),
      placeholder: text('输入 Notion 密码或集成令牌'),
      required: true,
    },
  ],
  zentao: [
    {
      id: 'zentaoUsername',
      type: 'text',
      label: text('禅道 用户名'),
      placeholder: text('your-account'),
      required: true,
    },
    {
      id: 'zentaoPassword',
      type: 'password',
      label: text('禅道 密码'),
      placeholder: text('输入禅道密码'),
      required: true,
    },
  ],
}

export function getCredentialFields(baseSkills: string[]): WizardField[] {
  return baseSkills.flatMap((skill) => credentialFieldMap[skill] ?? [])
}

export function getAgentLabels(agentApps: string[]): string[] {
  return agentApps.map(
    (value) => workbuddyAgentApps.find((option) => option.value === value)?.label['zh-CN'] ?? value
  )
}

export function getRoleLabel(value?: string): string {
  return workbuddyRoles.find((role) => role.value === value)?.value ?? '未选择'
}

export function getBaseSkillLabels(baseSkills: string[]): string[] {
  return baseSkills.map(
    (value) => workbuddyBaseSkills.find((option) => option.value === value)?.label['zh-CN'] ?? value
  )
}
