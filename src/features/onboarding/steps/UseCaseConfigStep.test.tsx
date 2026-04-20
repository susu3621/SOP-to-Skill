import { useState } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UseCaseConfigStep } from './UseCaseConfigStep'
import type { OnboardingEditableUseCaseRecord, OnboardingUseCaseQuestionRecord } from '../../../types'

function ControlledUseCaseConfigStep({
  initialUseCase,
}: {
  initialUseCase: OnboardingEditableUseCaseRecord
}) {
  const [useCases, setUseCases] = useState<OnboardingEditableUseCaseRecord[]>([initialUseCase])

  return (
    <UseCaseConfigStep
      locale="zh-CN"
      useCases={useCases}
      onAddQuestion={(useCaseId) => {
        setUseCases((current) =>
          current.map((record) =>
            record.use_case_id === useCaseId
              ? {
                  ...record,
                  questions: [
                    ...(record.questions ?? []),
                    {
                      id: 'new-question',
                      label: '新增问题',
                      placeholder: '',
                      required: true,
                      answer: '',
                      locked: false,
                    } satisfies OnboardingUseCaseQuestionRecord,
                  ],
                }
              : record
          )
        )
      }}
      onRemoveQuestion={(useCaseId, questionId) => {
        setUseCases((current) =>
          current.map((record) =>
            record.use_case_id === useCaseId
              ? {
                  ...record,
                  questions: (record.questions ?? []).filter((question) => question.id !== questionId),
                }
              : record
          )
        )
      }}
      onUpdateDescription={(useCaseId, value) => {
        setUseCases((current) =>
          current.map((record) =>
            record.use_case_id === useCaseId ? { ...record, description: value } : record
          )
        )
      }}
      onUpdateQuestionAnswer={(useCaseId, questionId, value) => {
        setUseCases((current) =>
          current.map((record) =>
            record.use_case_id === useCaseId
              ? {
                  ...record,
                  questions: (record.questions ?? []).map((question) =>
                    question.id === questionId ? { ...question, answer: value } : question
                  ),
                }
              : record
          )
        )
      }}
      onUpdateQuestionLabel={(useCaseId, questionId, value) => {
        setUseCases((current) =>
          current.map((record) =>
            record.use_case_id === useCaseId
              ? {
                  ...record,
                  questions: (record.questions ?? []).map((question) =>
                    question.id === questionId ? { ...question, label: value } : question
                  ),
                }
              : record
          )
        )
      }}
    />
  )
}

describe('UseCaseConfigStep', () => {
  it('renders built-in use cases with locked system description and fixed question inputs', () => {
    const builtInUseCase: OnboardingEditableUseCaseRecord = {
      role_id: 'project-manager',
      use_case_id: 'weekly-report',
      use_case_name: '项目周报',
      description:
        '汇总项目状态、风险和下周动作，形成标准化周报输出。适合配置成固定节奏产出项目周报的助手。需要说明周报面向谁、固定结构是什么、哪些异常必须突出展示。',
      description_locked: true,
      info_sources: '',
      rules: '',
      questions: [
        {
          id: 'project-list-source',
          label: '从哪里获取负责的项目清单？',
          placeholder: '例如：Wiki 项目清单页',
          required: true,
          answer: 'https://wiki.company.com/project-list',
          locked: true,
        },
      ],
    }

    render(
      <UseCaseConfigStep
        locale="zh-CN"
        useCases={[builtInUseCase]}
        onAddQuestion={vi.fn()}
        onRemoveQuestion={vi.fn()}
        onUpdateDescription={vi.fn()}
        onUpdateQuestionAnswer={vi.fn()}
        onUpdateQuestionLabel={vi.fn()}
      />
    )

    expect(screen.getByText('系统内置说明')).toBeInTheDocument()
    expect(screen.getByText('汇总项目状态、风险和下周动作，形成标准化周报输出。')).toBeInTheDocument()
    expect(
      screen.queryByText('适合配置成固定节奏产出项目周报的助手。')
    ).not.toBeInTheDocument()
    expect(screen.queryByLabelText('用例说明')).not.toBeInTheDocument()
    expect(screen.getByLabelText('从哪里获取负责的项目清单？')).toHaveValue(
      'https://wiki.company.com/project-list'
    )
    expect(screen.queryByRole('button', { name: '新增问题' })).not.toBeInTheDocument()
  })

  it('opens a read-only preview dialog for built-in use cases with the full current content', async () => {
    const user = userEvent.setup()
    const builtInUseCase: OnboardingEditableUseCaseRecord = {
      role_id: 'project-manager',
      use_case_id: 'weekly-report',
      use_case_name: '项目周报',
      description:
        '汇总项目状态、风险和下周动作，形成标准化周报输出。适合配置成固定节奏产出项目周报的助手。需要说明周报面向谁、固定结构是什么、哪些异常必须突出展示。',
      description_locked: true,
      info_sources: '',
      rules: '',
      questions: [
        {
          id: 'project-list-source',
          label: '从哪里获取负责的项目清单？',
          placeholder: '例如：Wiki 项目清单页',
          required: true,
          answer: 'https://wiki.company.com/project-list',
          locked: true,
        },
        {
          id: 'weekly-report-sop',
          label: '从哪里获取周报 SOP？',
          placeholder: '例如：周报模板 Wiki',
          required: true,
          answer: '',
          locked: true,
        },
      ],
    }

    render(<ControlledUseCaseConfigStep initialUseCase={builtInUseCase} />)

    expect(
      screen.queryByText('适合配置成固定节奏产出项目周报的助手。')
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '预览当前内容' }))

    const dialog = screen.getByRole('dialog', { name: '项目周报 当前内容预览' })
    expect(dialog).toHaveTextContent('适合配置成固定节奏产出项目周报的助手。')
    expect(dialog).toHaveTextContent('需要说明周报面向谁、固定结构是什么、哪些异常必须突出展示。')
    expect(within(dialog).getByText('https://wiki.company.com/project-list')).toBeInTheDocument()
    expect(within(dialog).getByText('未填写')).toBeInTheDocument()
    expect(within(dialog).queryByRole('textbox')).not.toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: '关闭预览' }))
    expect(screen.queryByRole('dialog', { name: '项目周报 当前内容预览' })).not.toBeInTheDocument()
  })

  it('lets custom use cases edit description, question labels, and answers', async () => {
    const user = userEvent.setup()
    const customUseCase: OnboardingEditableUseCaseRecord = {
      role_id: 'project-manager',
      use_case_id: 'customer-visit-note',
      use_case_name: '客户拜访纪要',
      description: '整理客户拜访纪要。',
      description_locked: false,
      info_sources: '',
      rules: '',
      questions: [
        {
          id: 'question-1',
          label: '从哪里获取客户拜访记录？',
          placeholder: '',
          required: true,
          answer: '',
          locked: false,
        },
      ],
    }

    const onUpdateDescription = vi.fn()
    const onUpdateQuestionLabel = vi.fn()
    const onUpdateQuestionAnswer = vi.fn()
    const onAddQuestion = vi.fn()
    const onRemoveQuestion = vi.fn()

    render(
      <UseCaseConfigStep
        locale="zh-CN"
        useCases={[customUseCase]}
        onAddQuestion={onAddQuestion}
        onRemoveQuestion={onRemoveQuestion}
        onUpdateDescription={onUpdateDescription}
        onUpdateQuestionAnswer={onUpdateQuestionAnswer}
        onUpdateQuestionLabel={onUpdateQuestionLabel}
      />
    )

    await user.type(screen.getByLabelText('用例说明'), '更新')
    expect(onUpdateDescription).toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('问题 1'), { target: { value: '入口' } })
    expect(onUpdateQuestionLabel).toHaveBeenCalledWith(
      'customer-visit-note',
      'question-1',
      '入口'
    )

    fireEvent.change(screen.getByLabelText('回答 1'), {
      target: { value: 'https://wiki.company.com/customer-visits' },
    })
    expect(onUpdateQuestionAnswer).toHaveBeenCalledWith(
      'customer-visit-note',
      'question-1',
      'https://wiki.company.com/customer-visits'
    )

    await user.click(screen.getByRole('button', { name: '新增问题' }))
    expect(onAddQuestion).toHaveBeenCalledWith('customer-visit-note')

    await user.click(screen.getByRole('button', { name: '删除问题 1' }))
    expect(onRemoveQuestion).toHaveBeenCalledWith('customer-visit-note', 'question-1')
  })

  it('previews the latest unsaved content for custom use cases without exposing editing controls', async () => {
    const user = userEvent.setup()
    const customUseCase: OnboardingEditableUseCaseRecord = {
      role_id: 'project-manager',
      use_case_id: 'customer-visit-note',
      use_case_name: '客户拜访纪要',
      description: '整理客户拜访纪要。',
      description_locked: false,
      info_sources: '',
      rules: '',
      questions: [
        {
          id: 'question-1',
          label: '从哪里获取客户拜访记录？',
          placeholder: '',
          required: true,
          answer: '',
          locked: false,
        },
      ],
    }

    render(<ControlledUseCaseConfigStep initialUseCase={customUseCase} />)

    await user.clear(screen.getByLabelText('用例说明'))
    await user.type(screen.getByLabelText('用例说明'), '整理本周客户拜访纪要，并补充后续跟进行动。')
    await user.clear(screen.getByLabelText('回答 1'))
    await user.type(screen.getByLabelText('回答 1'), 'https://wiki.company.com/customer-visits')

    await user.click(screen.getByRole('button', { name: '预览当前内容' }))

    const dialog = screen.getByRole('dialog', { name: '客户拜访纪要 当前内容预览' })
    expect(within(dialog).getByText('整理本周客户拜访纪要，并补充后续跟进行动。')).toBeInTheDocument()
    expect(within(dialog).getByText('从哪里获取客户拜访记录？')).toBeInTheDocument()
    expect(within(dialog).getByText('https://wiki.company.com/customer-visits')).toBeInTheDocument()
    expect(within(dialog).queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('shows the built-in ISO9001 template and explains the empty template-link fallback in preview', async () => {
    const user = userEvent.setup()
    const builtInUseCase: OnboardingEditableUseCaseRecord = {
      role_id: 'qa-manager',
      use_case_id: 'iso9001-package-preparation',
      use_case_name: 'ISO9001资料包出具',
      description:
        '基于现有体系文件和记录，整理一套可直接提交、审核或归档的 ISO9001 资料包。\n\n适合配置成质量经理按审核范围快速整理体系资料、识别缺口并给出补件清单的助手。\n\n如果用户填写了模板链接，则优先采用用户模板；未填写时，默认按以下模板整理：\n1. 基本信息：客户 / 审核范围 / 版本 / 编制日期\n2. 体系文件清单：质量手册、程序文件、作业指导书、记录表单目录\n3. 运行记录：内审、管理评审、纠正预防措施、培训、校准、供应商管理等证明材料\n4. 缺口与待补项：缺失文件、过期记录、责任人、预计补齐时间\n5. 交付说明：资料路径、命名规则、是否可直接外发 / 审核\n\n输入（每次执行都需要提供给Skill的信息）：本次要出具的审核范围、客户 / 工厂 / 项目名称，以及时间范围。',
      description_locked: true,
      info_sources: '',
      rules: '',
      questions: [
        {
          id: 'iso9001-scope-source',
          label: '从哪里获取本次 ISO9001 资料包对应的审核范围和要求？',
          placeholder: '',
          required: true,
          answer: 'https://wiki.company.com/iso/scope',
          locked: true,
        },
        {
          id: 'iso9001-template-source',
          label: '如果要覆盖内置模板，从哪里获取用户指定的 ISO9001 资料包模板？',
          placeholder: '',
          required: false,
          answer: '',
          locked: true,
        },
      ],
    }

    render(<ControlledUseCaseConfigStep initialUseCase={builtInUseCase} />)

    await user.click(screen.getByRole('button', { name: '预览当前内容' }))

    const dialog = screen.getByRole('dialog', { name: 'ISO9001资料包出具 当前内容预览' })
    expect(within(dialog).getByText('当前内置模板')).toBeInTheDocument()
    expect(dialog).toHaveTextContent('1. 基本信息：客户 / 审核范围 / 版本 / 编制日期')
    expect(dialog).toHaveTextContent('4. 缺口与待补项：缺失文件、过期记录、责任人、预计补齐时间')
    expect(dialog).toHaveTextContent('未填写，当前将使用内置模板')
  })

  it('shows the built-in 8D template in preview when no custom template link is provided', async () => {
    const user = userEvent.setup()
    const builtInUseCase: OnboardingEditableUseCaseRecord = {
      role_id: 'qa-manager',
      use_case_id: 'eight-d-report-preparation',
      use_case_name: '8D报告出具',
      description:
        '基于质量异常或客诉记录，生成一份结构完整、可继续补充证据的 8D 报告草稿。\n\n适合配置成质量经理快速组织跨部门问题分析、纠正措施和防再发行动的助手。\n\n如果用户填写了模板链接，则优先采用用户模板；未填写时，默认按以下模板整理：\nD1 团队与职责\nD2 问题描述与影响范围\nD3 临时遏制措施\nD4 根本原因分析\nD5 永久纠正措施\nD6 实施验证与效果确认\nD7 防再发措施\nD8 团队结项与经验沉淀\n\n输入（每次执行都需要提供给Skill的信息）：本次需要处理的质量异常、客诉或批次信息。',
      description_locked: true,
      info_sources: '',
      rules: '',
      questions: [
        {
          id: 'eight-d-issue-source',
          label: '从哪里获取本次 8D 的问题记录和影响范围？',
          placeholder: '',
          required: true,
          answer: 'https://wiki.company.com/8d/issues',
          locked: true,
        },
        {
          id: 'eight-d-template-source',
          label: '如果要覆盖内置模板，从哪里获取用户指定的 8D 模板？',
          placeholder: '',
          required: false,
          answer: '',
          locked: true,
        },
      ],
    }

    render(<ControlledUseCaseConfigStep initialUseCase={builtInUseCase} />)

    await user.click(screen.getByRole('button', { name: '预览当前内容' }))

    const dialog = screen.getByRole('dialog', { name: '8D报告出具 当前内容预览' })
    expect(within(dialog).getByText('当前内置模板')).toBeInTheDocument()
    expect(dialog).toHaveTextContent('D4 根本原因分析')
    expect(dialog).toHaveTextContent('D8 团队结项与经验沉淀')
    expect(dialog).toHaveTextContent('未填写，当前将使用内置模板')
  })

  it.each([
    {
      title: '需求评估',
      useCaseId: 'requirement-assessment',
      templateQuestionId: 'workflow-sop',
      templateQuestionLabel: '从哪里获取需求评估的 SOP？',
      templateSnippet: '初步结论：可做 / 不可做 / 待确认项',
    },
    {
      title: '记录日志',
      useCaseId: 'daily-log',
      templateQuestionId: 'workflow-sop',
      templateQuestionLabel: '从哪里获取记录日志的 SOP？',
      templateSnippet: '日志记录：时间、事件、结论、责任人',
    },
    {
      title: '记录计划',
      useCaseId: 'planning',
      templateQuestionId: 'workflow-sop',
      templateQuestionLabel: '从哪里获取记录计划的 SOP？',
      templateSnippet: '计划总览：阶段、里程碑、当前状态、预计日期',
    },
    {
      title: '项目周报',
      useCaseId: 'weekly-report',
      templateQuestionId: 'weekly-report-sop',
      templateQuestionLabel: '从哪里获取周报 SOP？',
      templateSnippet: '下周计划：关键动作、责任人、目标时间',
    },
    {
      title: '问题跟踪',
      useCaseId: 'issue-tracking',
      templateQuestionId: 'workflow-sop',
      templateQuestionLabel: '从哪里获取问题跟踪的 SOP？',
      templateSnippet: '问题闭环：当前状态、责任人、预计关闭时间、升级条件',
    },
    {
      title: '质量异常汇总与闭环跟进',
      useCaseId: 'quality-issue-closure',
      templateQuestionId: 'issue-closure-sop',
      templateQuestionLabel: '从哪里获取异常分级和闭环标准？',
      templateSnippet: '异常概览：编号、严重度、产品线、当前状态',
    },
    {
      title: '客诉售后问题分析与回复草稿',
      useCaseId: 'customer-complaint-reply-draft',
      templateQuestionId: 'reply-sop-source',
      templateQuestionLabel: '从哪里获取对外回复模板或 SOP？',
      templateSnippet: '对外回复草稿：结论、已采取动作、后续计划、承诺时间',
    },
    {
      title: '变更评审里的质量影响检查',
      useCaseId: 'change-review-quality-impact',
      templateQuestionId: 'change-review-sop',
      templateQuestionLabel: '从哪里获取变更评审模板或质量评审 SOP？',
      templateSnippet: '质量影响评估：受影响项目、风险等级、依据文件',
    },
    {
      title: '质量周报',
      useCaseId: 'quality-weekly-report',
      templateQuestionId: 'quality-weekly-report-sop',
      templateQuestionLabel: '从哪里获取质量周报模板或 SOP？',
      templateSnippet: '下周重点：优先事项、资源需求、升级事项',
    },
    {
      title: '供应商质量问题跟踪',
      useCaseId: 'supplier-quality-tracking',
      templateQuestionId: 'supplier-closure-sop',
      templateQuestionLabel: '从哪里获取供应商问题升级 / 关闭标准？',
      templateSnippet: '升级与关闭：升级节点、预计关闭时间、验证结论',
    },
  ])(
    'shows the built-in template fallback for $title when the SOP/template answer is empty',
    async ({ title, useCaseId, templateQuestionId, templateQuestionLabel, templateSnippet }) => {
      const user = userEvent.setup()
      const builtInUseCase: OnboardingEditableUseCaseRecord = {
        role_id: 'qa-manager',
        use_case_id: useCaseId,
        use_case_name: title,
        description:
          `这是 ${title} 的默认说明。\n\n如果用户填写了公司 SOP / 模板链接，则优先采用用户提供的内容；未填写时，默认按以下模板整理：\n${templateSnippet}\n补充字段：责任人、截止时间、备注\n\n输入（每次执行都需要提供给Skill的信息）：本次执行范围。`,
        description_locked: true,
        info_sources: '',
        rules: '',
        questions: [
          {
            id: 'source-1',
            label: '主数据来源',
            placeholder: '',
            required: true,
            answer: 'https://wiki.company.com/source',
            locked: true,
          },
          {
            id: templateQuestionId,
            label: templateQuestionLabel,
            placeholder: '',
            required: true,
            answer: '',
            locked: true,
          },
        ],
      }

      render(<ControlledUseCaseConfigStep initialUseCase={builtInUseCase} />)

      await user.click(screen.getByRole('button', { name: '预览当前内容' }))

      const dialog = screen.getByRole('dialog', { name: `${title} 当前内容预览` })
      expect(within(dialog).getByText('当前内置模板')).toBeInTheDocument()
      expect(dialog).toHaveTextContent(templateSnippet)
      expect(dialog).toHaveTextContent('未填写，当前将使用内置模板')
    }
  )
})
