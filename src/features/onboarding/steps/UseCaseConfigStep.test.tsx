import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UseCaseConfigStep } from './UseCaseConfigStep'
import type { OnboardingEditableUseCaseRecord } from '../../../types'

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
})
