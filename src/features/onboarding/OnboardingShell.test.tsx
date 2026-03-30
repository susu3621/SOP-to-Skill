import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../../App'
import type {
  OnboardingAgentSyncResult,
  OnboardingBatchSyncResult,
  OnboardingEditableUseCaseRecord,
  OnboardingGeneratedSkillIds,
  OnboardingInstallCandidateGroup,
  OnboardingInstallPreview,
  OnboardingState,
} from '../../types'

const fixtures = vi.hoisted(() => {
  const editableUseCases: OnboardingEditableUseCaseRecord[] = [
    {
      role_id: 'project-manager',
      use_case_id: 'daily-log',
      use_case_name: '记录日志',
      description: '记录每日工作内容和进展。',
      info_sources: 'Jira 看板',
      rules: '按日同步',
    },
    {
      role_id: 'project-manager',
      use_case_id: 'planning',
      use_case_name: '记录计划',
      description: '制定和更新项目计划。',
      info_sources: 'Confluence 项目主页',
      rules: '按周同步',
    },
    {
      role_id: 'project-manager',
      use_case_id: 'weekly-report',
      use_case_name: '项目周报',
      description: '汇总项目状态、风险和待办。',
      info_sources: 'Jira、Confluence、邮件归档',
      rules: '先风险后里程碑',
    },
  ]

  const installCandidateGroups: OnboardingInstallCandidateGroup[] = [
    {
      use_case_id: 'daily-log',
      use_case_name: '记录日志',
      production_skill_id: 'project-manager-daily-log',
      test_skill_id: 'test-project-manager-daily-log',
    },
    {
      use_case_id: 'planning',
      use_case_name: '记录计划',
      production_skill_id: 'project-manager-planning',
      test_skill_id: 'test-project-manager-planning',
    },
    {
      use_case_id: 'weekly-report',
      use_case_name: '项目周报',
      production_skill_id: 'project-manager-weekly-report',
      test_skill_id: 'test-project-manager-weekly-report',
    },
  ]

  const generatedSkillIds: OnboardingGeneratedSkillIds[] = installCandidateGroups.map(
    ({ production_skill_id, test_skill_id }) => ({
      production_skill_id,
      test_skill_id,
    })
  )

  const onboardingState: OnboardingState = {
    selected_agent_ids: ['codex', 'claude-code'],
    selected_role_id: 'project-manager',
    selected_base_skill_ids: ['jira', 'confluence'],
    role_use_case_contents: editableUseCases,
    selected_install_skill_ids: [
      'jira',
      'confluence',
      'project-manager-daily-log',
      'test-project-manager-daily-log',
      'project-manager-planning',
      'test-project-manager-planning',
      'project-manager-weekly-report',
      'test-project-manager-weekly-report',
    ],
    selected_install_skill_ids_initialized: false,
    selected_install_candidate_skill_ids: [],
    credential_values: {},
  }

  const onboardingPreview: OnboardingInstallPreview = {
    install_candidate_skill_ids: [
      'jira',
      'confluence',
      'project-manager-daily-log',
      'test-project-manager-daily-log',
      'project-manager-planning',
      'test-project-manager-planning',
      'project-manager-weekly-report',
      'test-project-manager-weekly-report',
    ],
    generated_skill_ids: generatedSkillIds,
    selected_agent_ids: ['codex', 'claude-code'],
    selected_install_skill_ids: onboardingState.selected_install_skill_ids,
    agent_previews: [
      {
        agent_id: 'codex',
        added_skill_ids: [
          'confluence',
          'project-manager-daily-log',
          'test-project-manager-daily-log',
          'project-manager-planning',
          'test-project-manager-planning',
          'project-manager-weekly-report',
          'test-project-manager-weekly-report',
        ],
        removed_skill_ids: [],
        unchanged_skill_ids: ['jira'],
      },
      {
        agent_id: 'claude-code',
        added_skill_ids: [
          'jira',
          'project-manager-daily-log',
          'test-project-manager-daily-log',
          'project-manager-planning',
          'test-project-manager-planning',
          'project-manager-weekly-report',
          'test-project-manager-weekly-report',
        ],
        removed_skill_ids: [],
        unchanged_skill_ids: ['confluence'],
      },
    ],
  }

  const onboardingSyncResult: OnboardingBatchSyncResult = {
    selected_agent_ids: ['codex', 'claude-code'],
    selected_install_skill_ids: onboardingState.selected_install_skill_ids,
    agent_results: [
      {
        agent_id: 'codex',
        added_skill_ids: [
          'confluence',
          'project-manager-daily-log',
          'test-project-manager-daily-log',
          'project-manager-planning',
          'test-project-manager-planning',
          'project-manager-weekly-report',
          'test-project-manager-weekly-report',
        ],
        removed_skill_ids: [],
        unchanged_skill_ids: ['jira'],
        success: true,
        error: null,
      } as OnboardingAgentSyncResult,
      {
        agent_id: 'claude-code',
        added_skill_ids: [
          'jira',
          'project-manager-daily-log',
          'test-project-manager-daily-log',
          'project-manager-planning',
          'test-project-manager-planning',
          'project-manager-weekly-report',
          'test-project-manager-weekly-report',
        ],
        removed_skill_ids: [],
        unchanged_skill_ids: ['confluence'],
        success: false,
        error: 'claude-code sync failed',
      } as OnboardingAgentSyncResult,
    ],
  }

  return {
    onboardingState,
    onboardingPreview,
    onboardingSyncResult,
  }
})

const mockControls = vi.hoisted(() => ({
  saveError: null as string | null,
}))

const invokeMock = vi.hoisted(() => vi.fn())

vi.mock('@tauri-apps/api/core', () => ({
  invoke: invokeMock,
}))

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(async () => () => {}),
}))

beforeEach(() => {
  mockControls.saveError = null
  invokeMock.mockReset()
  invokeMock.mockImplementation(async (command: string, payload?: { state?: OnboardingState }) => {
    switch (command) {
      case 'list_skills':
        return { success: [] }
      case 'list_installed':
        return { success: [] }
      case 'get_target_apps':
        return []
      case 'check_skill_updates':
        return { success: [] }
      case 'get_config':
        return { success: { preferred_locale: 'zh-CN' } }
      case 'get_onboarding_state':
        return { success: fixtures.onboardingState }
      case 'set_onboarding_state':
        return mockControls.saveError
          ? { error: mockControls.saveError }
          : { success: payload?.state ?? fixtures.onboardingState }
      case 'get_onboarding_install_preview':
        return { success: fixtures.onboardingPreview }
      case 'stage_onboarding_generated_packages':
        return { success: { production: null, test: null } }
      case 'sync_onboarding_installation':
        return { success: fixtures.onboardingSyncResult }
      default:
        return { success: null }
    }
  })
})

function getSetStateCalls() {
  return invokeMock.mock.calls.filter(([command]) => command === 'set_onboarding_state')
}

describe('OnboardingShell', () => {
  it('shows saved status badges and hides module detail until the user hovers a card', async () => {
    const user = userEvent.setup()

    render(<App />)

    expect(await screen.findByRole('heading', { name: '开始设置' })).toBeInTheDocument()
    const basicCard = screen.getByRole('button', { name: '基础信息设置' })
    const useCaseCard = screen.getByRole('button', { name: '用例配置' })
    const installCard = screen.getByRole('button', { name: '安装技能' })

    expect(within(basicCard).getByText('已设置')).toBeInTheDocument()
    expect(within(useCaseCard).getByText('已设置')).toBeInTheDocument()
    expect(within(installCard).getByText('已设置')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '基础信息设置' })).not.toBeInTheDocument()

    await user.hover(useCaseCard)

    expect(screen.getByText('按用例分别编辑内容')).toBeInTheDocument()
    expect(screen.getByText('记录计划')).toBeInTheDocument()
    expect(screen.getByText('记录日志')).toBeInTheDocument()
    expect(screen.getByText('项目周报')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '用例配置' })).toBeInTheDocument()

    await user.unhover(useCaseCard)

    expect(screen.queryByRole('heading', { name: '用例配置' })).not.toBeInTheDocument()
  })

  it('renders secondary-entry guidance as text instead of nested boxed cards', async () => {
    const user = userEvent.setup()

    render(<App />)

    expect(await screen.findByRole('heading', { name: '开始设置' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '基础信息设置' }))
    const roleEntry = await screen.findByRole('button', { name: '选择岗位' })

    await user.click(roleEntry)

    const detailPanel = document.querySelector('.onboarding-detail-panel')
    expect(detailPanel).not.toBeNull()
    const detailHeading = within(detailPanel as HTMLElement).getByRole('heading', { name: '选择岗位' })
    expect(detailHeading.closest('.summary-card')).toBeNull()
    expect(within(detailPanel as HTMLElement).getByText('项目经理')).toBeInTheDocument()
    expect(within(detailPanel as HTMLElement).getByText('产品经理')).toBeInTheDocument()
    expect(within(detailPanel as HTMLElement).getByText('研发负责人')).toBeInTheDocument()
    expect(document.querySelector('.summary-card--nested')).toBeNull()
  })

  it('does not persist role changes until save and shows a success banner after saving', async () => {
    const user = userEvent.setup()

    render(<App />)

    expect(await screen.findByRole('heading', { name: '开始设置' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '基础信息设置' }))
    await user.click(await screen.findByRole('button', { name: '选择岗位' }))

    await user.click(screen.getByRole('radio', { name: '产品经理' }))

    expect(getSetStateCalls()).toHaveLength(0)
    expect(screen.getByRole('button', { name: '保存设置' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '保存设置' }))

    expect(getSetStateCalls()).toHaveLength(1)
    expect(await screen.findByText('保存成功')).toBeInTheDocument()
  })

  it('shows a failure banner when saving base skill changes fails', async () => {
    const user = userEvent.setup()

    render(<App />)

    expect(await screen.findByRole('heading', { name: '开始设置' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '基础信息设置' }))
    await user.click(await screen.findByRole('button', { name: '选择基础技能' }))
    await user.click(screen.getByRole('checkbox', { name: 'Confluence' }))

    expect(getSetStateCalls()).toHaveLength(0)

    mockControls.saveError = '保存失败：网络异常'
    await user.click(screen.getByRole('button', { name: '保存设置' }))

    expect(getSetStateCalls()).toHaveLength(1)
    expect(await screen.findByText('保存失败：网络异常')).toBeInTheDocument()
  })

  it('shows a use-case list first, marks configured items, and saves only on demand', async () => {
    const user = userEvent.setup()

    render(<App />)

    expect(await screen.findByRole('heading', { name: '开始设置' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '用例配置' }))

    expect(await screen.findByRole('heading', { name: '用例配置' })).toBeInTheDocument()
    const planningItem = screen.getByRole('button', { name: '记录计划' })
    const dailyLogItem = screen.getByRole('button', { name: '记录日志' })
    const weeklyReportItem = screen.getByRole('button', { name: '项目周报' })

    expect(within(planningItem).getByText('已设置')).toBeInTheDocument()
    expect(within(dailyLogItem).getByText('已设置')).toBeInTheDocument()
    expect(within(weeklyReportItem).getByText('已设置')).toBeInTheDocument()

    const descriptionInput = screen.getByLabelText('用例描述')
    await user.clear(descriptionInput)
    await user.type(descriptionInput, '更新后的记录计划说明')

    expect(getSetStateCalls()).toHaveLength(0)

    await user.click(screen.getByRole('button', { name: '保存设置' }))

    expect(getSetStateCalls()).toHaveLength(1)
    expect(await screen.findByText('保存成功')).toBeInTheDocument()
  })

  it('requires an explicit save on the install page before syncing and keeps sync results inside the module', async () => {
    const user = userEvent.setup()

    render(<App />)

    expect(await screen.findByRole('heading', { name: '开始设置' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '安装技能' }))

    expect(await screen.findByRole('heading', { name: '安装技能' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Codex' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Claude Code' })).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: 'Jira' }))

    expect(getSetStateCalls()).toHaveLength(0)
    expect(screen.getByRole('button', { name: '保存设置' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '开始同步安装' }))

    expect(screen.getByText('请先保存当前安装设置。')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '保存设置' }))

    expect(getSetStateCalls()).toHaveLength(1)
    expect(await screen.findByText('保存成功')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '开始同步安装' }))

    expect(await screen.findByRole('heading', { name: '同步结果' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Codex' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Claude Code' })).toBeInTheDocument()
    expect(screen.getAllByText('新增技能').length).toBeGreaterThan(0)
    expect(screen.getAllByText('移除技能').length).toBeGreaterThan(0)
    expect(screen.getAllByText('未变化技能').length).toBeGreaterThan(0)
    expect(screen.getByText('claude-code sync failed')).toBeInTheDocument()
    expect(screen.queryByLabelText('Jira 用户名')).not.toBeInTheDocument()
  })
})
