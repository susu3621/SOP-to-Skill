import { useState } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UseCaseConfigStep } from './UseCaseConfigStep'
import type { OnboardingEditableUseCaseRecord, OnboardingUseCaseQuestionRecord } from '../../../types'

function ControlledUseCaseConfigStep({
  initialUseCase,
  loadPreviewMarkdown = async (useCase: OnboardingEditableUseCaseRecord) =>
    `# ${useCase.use_case_name}\n\n## 用例说明\n\n${useCase.description}`,
}: {
  initialUseCase: OnboardingEditableUseCaseRecord
  loadPreviewMarkdown?: (useCase: OnboardingEditableUseCaseRecord) => Promise<string>
}) {
  const [useCases, setUseCases] = useState<OnboardingEditableUseCaseRecord[]>([initialUseCase])

  return (
    <UseCaseConfigStep
      loadPreviewMarkdown={loadPreviewMarkdown}
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
        loadPreviewMarkdown={async () => '# 项目周报\n\n## 用例说明\n\n示例'}
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

  it('opens a read-only preview dialog with the actual generated skill markdown', async () => {
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

    render(
      <ControlledUseCaseConfigStep
        initialUseCase={builtInUseCase}
        loadPreviewMarkdown={async () =>
          [
            '# project-manager-weekly-report',
            '',
            '## 用例说明',
            '',
            '汇总项目状态、风险和下周动作，形成标准化周报输出。',
            '',
            '## 结构化填写',
            '',
            '- **从哪里获取负责的项目清单？**: https://wiki.company.com/project-list',
            '- **从哪里获取周报 SOP？**: 1. 本周进展：关键交付、完成情况、里程碑状态',
          ].join('\n')
        }
      />
    )

    await user.click(screen.getByRole('button', { name: '预览当前内容' }))

    const dialog = screen.getByRole('dialog', { name: '项目周报 当前内容预览' })
    expect(dialog).toHaveTextContent('# project-manager-weekly-report')
    expect(dialog).toHaveTextContent('## 用例说明')
    expect(dialog).toHaveTextContent('## 结构化填写')
    expect(dialog).toHaveTextContent('https://wiki.company.com/project-list')
    expect(dialog).toHaveTextContent('1. 本周进展：关键交付、完成情况、里程碑状态')
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
        loadPreviewMarkdown={async () => '# customer-visit-note'}
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

    render(
      <ControlledUseCaseConfigStep
        initialUseCase={customUseCase}
        loadPreviewMarkdown={async (useCase) =>
          [
            '# customer-visit-note',
            '',
            '## 用例说明',
            '',
            useCase.description,
            '',
            '## 结构化填写',
            '',
            `- **${useCase.questions?.[0]?.label ?? ''}**: ${useCase.questions?.[0]?.answer ?? ''}`,
          ].join('\n')
        }
      />
    )

    await user.clear(screen.getByLabelText('用例说明'))
    await user.type(screen.getByLabelText('用例说明'), '整理本周客户拜访纪要，并补充后续跟进行动。')
    await user.clear(screen.getByLabelText('回答 1'))
    await user.type(screen.getByLabelText('回答 1'), 'https://wiki.company.com/customer-visits')

    await user.click(screen.getByRole('button', { name: '预览当前内容' }))

    const dialog = screen.getByRole('dialog', { name: '客户拜访纪要 当前内容预览' })
    expect(dialog).toHaveTextContent('# customer-visit-note')
    expect(dialog).toHaveTextContent('## 用例说明')
    expect(dialog).toHaveTextContent('整理本周客户拜访纪要，并补充后续跟进行动。')
    expect(dialog).toHaveTextContent('## 结构化填写')
    expect(dialog).toHaveTextContent(
      '- **从哪里获取客户拜访记录？**: https://wiki.company.com/customer-visits'
    )
    expect(within(dialog).queryByRole('textbox')).not.toBeInTheDocument()
  })
})
