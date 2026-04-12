import { fireEvent, render, screen, within } from '@testing-library/react'
import { act } from 'react'
import userEvent from '@testing-library/user-event'
import App from '../../App'
import { buildGeneratedSkillIdsForRoleUseCase } from '../../content/workbuddy'
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
  stateOverride: null as OnboardingState | null,
  connectionTestResults: {} as Record<
    string,
    { success: boolean; summary: string; details: string }
  >,
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
  mockControls.stateOverride = null
  mockControls.connectionTestResults = {}
  invokeMock.mockReset()
  invokeMock.mockImplementation(async (command: string, payload?: any) => {
    const currentState = mockControls.stateOverride ?? fixtures.onboardingState
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
        return { success: currentState }
      case 'set_onboarding_state':
        return mockControls.saveError
          ? { error: mockControls.saveError }
          : { success: payload?.state ?? currentState }
      case 'sync_onboarding_credentials':
        return { success: true }
      case 'test_onboarding_connection':
        {
          const serviceId = payload?.input?.service_id ?? 'jira'
          const configuredResult = mockControls.connectionTestResults[serviceId] ?? {
            success: true,
            summary: '连接成功',
            details: '',
          }

        return {
          success: {
            service_id: serviceId,
            success: configuredResult.success,
            status: configuredResult.success ? 'success' : 'error',
            summary: configuredResult.summary,
            details: configuredResult.details,
            trigger: payload?.input?.trigger ?? 'manual',
            tested_fingerprint: payload?.input?.tested_fingerprint ?? 'fingerprint',
          },
        }
      }
      case 'get_onboarding_install_preview':
        return { success: { ...fixtures.onboardingPreview, selected_install_skill_ids: currentState.selected_install_skill_ids, selected_agent_ids: currentState.selected_agent_ids } }
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

function getCredentialSyncCalls() {
  return invokeMock.mock.calls.filter(([command]) => command === 'sync_onboarding_credentials')
}

function getConnectionTestCalls() {
  return invokeMock.mock.calls.filter(([command]) => command === 'test_onboarding_connection')
}

function getSyncCalls() {
  return invokeMock.mock.calls.filter(([command]) => command === 'sync_onboarding_installation')
}

async function waitForOnboardingHome() {
  return screen.findByRole('button', { name: '选择公司 IT 工具' })
}

async function waitForUseCasesModule() {
  return screen.findByRole('tab', { name: '选择岗位', selected: true })
}

async function waitForInstallModule() {
  return screen.findByRole('checkbox', { name: 'Codex' })
}

describe('OnboardingShell', () => {
  it('shows no selected role while leaving all onboarding sections incomplete for a fresh state', async () => {
    mockControls.stateOverride = {
      selected_agent_ids: [],
      selected_role_id: '',
      selected_base_skill_ids: [],
      role_use_case_contents: [],
      selected_install_skill_ids: [],
      selected_install_skill_ids_initialized: false,
      selected_install_candidate_skill_ids: [],
      credential_values: {},
    }

    render(<App />)

    expect(await waitForOnboardingHome()).toBeInTheDocument()
    expect(
      screen.getByText('按下面 3 步设置好以后，AI 就能按公司的 SOP 去完成你选好的工作。')
    ).toBeInTheDocument()
    expect(screen.queryByText('Onboarding')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '开始设置' })).not.toBeInTheDocument()

    const basicCard = screen.getByRole('button', { name: '选择公司 IT 工具' })
    const useCaseCard = screen.getByRole('button', { name: '配置要交给 AI 的工作' })
    const installCard = screen.getByRole('button', { name: '安装到 AI 工具' })

    expect(within(basicCard).queryByText('已设置')).not.toBeInTheDocument()
    expect(within(useCaseCard).queryByText('已设置')).not.toBeInTheDocument()
    expect(within(installCard).queryByText('已设置')).not.toBeInTheDocument()

    const summary = screen.getByRole('region', { name: '已设置内容' })
    expect(within(summary).getAllByText('未设置')).toHaveLength(5)
    expect(within(summary).queryByText('项目经理')).not.toBeInTheDocument()
    expect(within(summary).queryByText('记录日志')).not.toBeInTheDocument()
    expect(within(summary).queryByText('Jira')).not.toBeInTheDocument()
    expect(within(summary).queryByText('Codex')).not.toBeInTheDocument()
  })

  it('keeps fresh unsaved state with no selected role and no generated use cases', async () => {
    mockControls.stateOverride = {
      selected_agent_ids: [],
      selected_role_id: '',
      selected_base_skill_ids: [],
      role_use_case_contents: [],
      selected_install_skill_ids: [],
      selected_install_skill_ids_initialized: false,
      selected_install_candidate_skill_ids: [],
      credential_values: {},
    }

    const user = userEvent.setup()

    render(<App />)

    expect(await waitForOnboardingHome()).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '配置要交给 AI 的工作' }))

    expect(await waitForUseCasesModule()).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '配置要交给 AI 的工作' })).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '选择岗位', selected: true })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '选择工作', selected: false })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '项目经理' })).not.toBeChecked()
    expect(screen.queryByRole('radio', { name: '产品经理' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '需求评估' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('用例描述')).not.toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: '选择工作' }))
    expect(screen.queryByRole('button', { name: '需求评估' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '记录日志' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('用例描述')).not.toBeInTheDocument()
    expect(screen.getByText('当前岗位没有可配置的工作。')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '返回首页' }))
    await user.click(screen.getByRole('button', { name: '选择公司 IT 工具' }))

    expect(await screen.findByRole('checkbox', { name: 'Jira' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '选择公司 IT 工具' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '选择岗位' })).not.toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Jira' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Confluence' })).not.toBeChecked()

    await user.click(screen.getByRole('button', { name: '返回首页' }))
    await user.click(screen.getByRole('button', { name: '安装到 AI 工具' }))

    expect(await waitForInstallModule()).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '安装到 AI 工具' })).not.toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Codex' })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Claude Code' })).not.toBeChecked()
  })

  it('opens the work page on the 岗位 tab by default', async () => {
    const user = userEvent.setup()

    render(<App />)

    expect(await waitForOnboardingHome()).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '配置要交给 AI 的工作' }))

    expect(await waitForUseCasesModule()).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '配置要交给 AI 的工作' })).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '选择岗位', selected: true })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '选择工作', selected: false })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '项目经理' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '保存岗位' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '需求评估' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('用例描述')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '选择岗位' })).not.toBeInTheDocument()
    expect(screen.queryByText('先选岗位，再看这个岗位下可以交给 AI 的工作。')).not.toBeInTheDocument()
    expect(screen.queryByText('选择岗位', { selector: 'label' })).not.toBeInTheDocument()
  })

  it('shows the work list and editor after switching to the 工作 tab', async () => {
    const user = userEvent.setup()

    render(<App />)

    expect(await waitForOnboardingHome()).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '配置要交给 AI 的工作' }))
    await user.click(screen.getByRole('tab', { name: '选择工作' }))

    expect(screen.getByRole('tab', { name: '选择岗位', selected: false })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '选择工作', selected: true })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '需求评估' })).toBeInTheDocument()
    expect(screen.getByLabelText('用例描述')).toBeInTheDocument()
    expect(screen.getByText('直接把流程 / SOP / 模板的链接贴到这里就行。')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '保存设置' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '保存岗位' })).not.toBeInTheDocument()
  })

  it('shows saved status badges and reveals a hover bubble beside the active card', async () => {
    const user = userEvent.setup()

    render(<App />)

    expect(await waitForOnboardingHome()).toBeInTheDocument()
    const basicCard = screen.getByRole('button', { name: '选择公司 IT 工具' })
    const useCaseCard = screen.getByRole('button', { name: '配置要交给 AI 的工作' })
    const installCard = screen.getByRole('button', { name: '安装到 AI 工具' })
    const homeCardShells = Array.from(
      document.querySelectorAll('.onboarding-entry-card-shell')
    ) as HTMLElement[]
    const useCaseShell = useCaseCard.closest('.onboarding-entry-card-shell') as HTMLElement | null

    expect(within(basicCard).getByText('已设置')).toBeInTheDocument()
    expect(within(useCaseCard).queryByText('已设置')).not.toBeInTheDocument()
    expect(within(installCard).getByText('已设置')).toBeInTheDocument()
    expect(homeCardShells).toHaveLength(3)
    homeCardShells.forEach((shell) => {
      expect(shell).toHaveClass('onboarding-entry-card-shell--uniform')
    })
    expect(useCaseShell).not.toBeNull()
    expect(
      within(useCaseShell as HTMLElement).queryByRole('heading', {
        name: '配置要交给 AI 的工作',
      })
    ).not.toBeInTheDocument()
    expect(document.querySelector('.onboarding-section > .onboarding-detail-panel')).toBeNull()

    await user.hover(useCaseCard)

    const detailPanel = within(useCaseShell as HTMLElement).getByRole('heading', {
      name: '配置要交给 AI 的工作',
    })
    expect(detailPanel).toBeInTheDocument()
    expect(
      within(useCaseShell as HTMLElement).getByText(
        '先选岗位，再决定哪些工作要交给 AI 去做，并补充对应的 SOP、信息来源和执行要求。'
      )
    ).toBeInTheDocument()
    expect(within(useCaseShell as HTMLElement).getByText('选择岗位')).toBeInTheDocument()
    expect(within(useCaseShell as HTMLElement).getByText('选择工作')).toBeInTheDocument()
    expect(
      within(useCaseShell as HTMLElement).getByText('补充 SOP / 信息来源 / 执行要求')
    ).toBeInTheDocument()

    await user.unhover(useCaseCard)

    expect(
      within(useCaseShell as HTMLElement).queryByRole('heading', {
        name: '配置要交给 AI 的工作',
      })
    ).not.toBeInTheDocument()
  })

  it('shows the same hover bubble when a home card receives keyboard focus', async () => {
    render(<App />)

    const installCard = await screen.findByRole('button', { name: '安装到 AI 工具' })
    const installShell = installCard.closest('.onboarding-entry-card-shell') as HTMLElement | null

    expect(installShell).not.toBeNull()

    fireEvent.focus(installCard)

    expect(
      within(installShell as HTMLElement).getByRole('heading', { name: '安装到 AI 工具' })
    ).toBeInTheDocument()
    expect(within(installShell as HTMLElement).getByText('选择 AI 工具')).toBeInTheDocument()

    fireEvent.blur(installCard)

    expect(
      within(installShell as HTMLElement).queryByRole('heading', { name: '安装到 AI 工具' })
    ).not.toBeInTheDocument()
  })

  it('lists configured onboarding details on the home screen', async () => {
    render(<App />)

    expect(await waitForOnboardingHome()).toBeInTheDocument()

    const summary = screen.getByRole('region', { name: '已设置内容' })
    const baseSkillsGroup = within(summary)
      .getByText('公司 IT 工具')
      .closest('.onboarding-home-summary__group') as HTMLElement
    const useCasesGroup = within(summary)
      .getByText('已配置工作')
      .closest('.onboarding-home-summary__group') as HTMLElement
    const installTargetsGroup = within(summary)
      .getByText('安装目标')
      .closest('.onboarding-home-summary__group') as HTMLElement
    const installSkillsGroup = within(summary)
      .getByText('安装技能')
      .closest('.onboarding-home-summary__group') as HTMLElement

    expect(within(summary).getByText('已选岗位')).toBeInTheDocument()
    expect(within(summary).getByText('项目经理')).toBeInTheDocument()
    expect(within(summary).getByText('公司 IT 工具')).toBeInTheDocument()
    expect(within(baseSkillsGroup).getByText('Jira')).toBeInTheDocument()
    expect(within(baseSkillsGroup).getByText('Confluence')).toBeInTheDocument()
    expect(within(summary).getByText('已配置工作')).toBeInTheDocument()
    expect(within(useCasesGroup).getByText('记录计划')).toBeInTheDocument()
    expect(within(useCasesGroup).getByText('项目周报')).toBeInTheDocument()
    expect(within(summary).getByText('安装目标')).toBeInTheDocument()
    expect(within(installTargetsGroup).getByText('Codex')).toBeInTheDocument()
    expect(within(installTargetsGroup).getByText('Claude Code')).toBeInTheDocument()
    expect(within(summary).getByText('安装技能')).toBeInTheDocument()
    expect(installSkillsGroup).toHaveClass('onboarding-home-summary__group--full-width')
    const installSkillTable = within(installSkillsGroup).getByRole('table', { name: '安装技能汇总' })
    expect(within(installSkillTable).getByRole('columnheader', { name: '岗位用例' })).toBeInTheDocument()
    expect(within(installSkillTable).getByRole('columnheader', { name: '生产用' })).toBeInTheDocument()
    expect(within(installSkillTable).getByRole('columnheader', { name: '测试用' })).toBeInTheDocument()
    const weeklyReportRow = within(installSkillTable).getByText('项目周报').closest('tr') as HTMLTableRowElement
    expect(weeklyReportRow).not.toBeNull()
    expect(within(weeklyReportRow).getByText('project-manager-weekly-report')).toBeInTheDocument()
    expect(within(weeklyReportRow).getByText('test-project-manager-weekly-report')).toBeInTheDocument()
  })

  it('shows 未设置 for empty summary groups when no values are selected', async () => {
    mockControls.stateOverride = {
      ...fixtures.onboardingState,
      selected_base_skill_ids: [],
      role_use_case_contents: fixtures.onboardingState.role_use_case_contents.map((useCase) => ({
        ...useCase,
        description: '',
        info_sources: '',
        rules: '',
      })),
      selected_agent_ids: [],
      selected_install_skill_ids: [],
      selected_install_skill_ids_initialized: true,
    }

    render(<App />)

    expect(await waitForOnboardingHome()).toBeInTheDocument()

    const summary = screen.getByRole('region', { name: '已设置内容' })
    expect(within(summary).getByText('公司 IT 工具')).toBeInTheDocument()
    expect(within(summary).getAllByText('未设置').length).toBeGreaterThanOrEqual(3)
    const installSkillsGroup = within(summary)
      .getByText('安装技能')
      .closest('.onboarding-home-summary__group') as HTMLElement
    const installSkillTable = within(installSkillsGroup).getByRole('table', { name: '安装技能汇总' })
    expect(within(installSkillTable).getAllByText('未安装').length).toBeGreaterThan(0)
  })

  it('opens 公司 IT 工具 as a direct editor without a second-level entry card', async () => {
    const user = userEvent.setup()

    render(<App />)

    expect(await waitForOnboardingHome()).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '选择公司 IT 工具' }))

    expect(await screen.findByRole('checkbox', { name: 'Jira' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '选择公司 IT 工具' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '选择公司 IT 工具' })).not.toBeInTheDocument()
    expect(screen.queryByText('公司 IT 工具', { selector: 'label' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '公司 IT 工具' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Wiki 系统' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '问题管理系统' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '通信系统' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Jira' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Confluence' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: '腾讯企业邮箱' })).toBeInTheDocument()
    expect(screen.queryByText('二级入口说明')).not.toBeInTheDocument()
    expect(
      screen.queryByText('先选择“选择公司 IT 工具”，再进入对应的编辑界面。')
    ).not.toBeInTheDocument()
  })

  it('shows Confluence and Jira URL fields in 公司 IT 工具 and keeps Tencent Exmail credentials to username/password only', async () => {
    mockControls.stateOverride = {
      ...fixtures.onboardingState,
      selected_base_skill_ids: ['jira', 'confluence', 'mail'],
      selected_install_skill_ids: ['jira', 'confluence', 'mail'],
    }
    const user = userEvent.setup()

    render(<App />)

    expect(await waitForOnboardingHome()).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '选择公司 IT 工具' }))

    expect(screen.getByLabelText('Confluence URL')).toBeInTheDocument()
    expect(screen.getByLabelText('Jira URL')).toBeInTheDocument()
    expect(screen.getByLabelText('腾讯企业邮箱用户名')).toBeInTheDocument()
    expect(screen.getByLabelText('腾讯企业邮箱密码 / 授权码')).toBeInTheDocument()
    expect(screen.queryByLabelText('Mail SMTP Host')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Mail 发件邮箱')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '返回首页' }))
    await user.click(screen.getByRole('button', { name: '安装到 AI 工具' }))

    expect(await waitForInstallModule()).toBeInTheDocument()
    expect(screen.queryByText('账号凭证')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Confluence URL')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Jira URL')).not.toBeInTheDocument()
  })

  it('shows one test button per selected infrastructure service', async () => {
    mockControls.stateOverride = {
      ...fixtures.onboardingState,
      selected_base_skill_ids: ['jira', 'confluence'],
      selected_install_skill_ids: ['jira', 'confluence'],
    }

    const user = userEvent.setup()

    render(<App />)

    expect(await waitForOnboardingHome()).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '选择公司 IT 工具' }))

    expect(screen.getAllByText('Jira').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Confluence').length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: '测试连接' })).toHaveLength(2)
  })

  it('runs automatic connection tests after saving completed credentials', async () => {
    mockControls.stateOverride = {
      ...fixtures.onboardingState,
      selected_base_skill_ids: ['jira'],
      selected_install_skill_ids: ['jira'],
      credential_values: {
        jiraUrl: 'https://jira.example.com',
        jiraUsername: 'jira.user',
        jiraPassword: '',
      },
    }

    const user = userEvent.setup()

    render(<App />)

    expect(await waitForOnboardingHome()).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '选择公司 IT 工具' }))
    await user.clear(screen.getByLabelText('Jira 密码 / API Token'))
    await user.type(screen.getByLabelText('Jira 密码 / API Token'), 'jira-secret')

    expect(getConnectionTestCalls()).toHaveLength(0)

    await user.click(screen.getByRole('button', { name: '保存设置' }))

    await act(async () => {
      await Promise.resolve()
    })

    expect(getSetStateCalls()).toHaveLength(1)
    expect(getCredentialSyncCalls()).toHaveLength(1)
    expect(getConnectionTestCalls()).toHaveLength(1)
    const [, payload] = getConnectionTestCalls()[0] as [
      string,
      { input: { service_id: string; trigger: string } },
    ]
    expect(payload.input.service_id).toBe('jira')
    expect(payload.input.trigger).toBe('automatic')
  })

  it('runs a manual connection test for the selected service', async () => {
    mockControls.stateOverride = {
      ...fixtures.onboardingState,
      selected_base_skill_ids: ['jira'],
      selected_install_skill_ids: ['jira'],
      credential_values: {
        jiraUrl: 'https://jira.example.com',
        jiraUsername: 'jira.user',
        jiraPassword: 'jira-secret',
      },
    }

    const user = userEvent.setup()

    render(<App />)

    expect(await waitForOnboardingHome()).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '选择公司 IT 工具' }))
    await user.click(screen.getByRole('button', { name: '测试连接' }))

    expect(getConnectionTestCalls().length).toBeGreaterThan(0)
    const [, payload] = getConnectionTestCalls().at(-1) as [
      string,
      { input: { service_id: string; trigger: string } },
    ]
    expect(payload.input.service_id).toBe('jira')
    expect(payload.input.trigger).toBe('manual')
  })

  it('shows success and failure results inline with status symbols and error details', async () => {
    mockControls.stateOverride = {
      ...fixtures.onboardingState,
      selected_base_skill_ids: ['jira', 'confluence'],
      selected_install_skill_ids: ['jira', 'confluence'],
      credential_values: {
        jiraUrl: 'https://jira.example.com',
        jiraUsername: 'jira.user',
        jiraPassword: 'jira-secret',
        confluenceUrl: 'https://wiki.example.com',
        confluenceUsername: 'wiki.user',
        confluencePassword: 'wiki-secret',
      },
    }
    mockControls.connectionTestResults = {
      jira: {
        success: true,
        summary: 'Jira 连接成功',
        details: '',
      },
      confluence: {
        success: false,
        summary: 'Confluence 连接失败',
        details: 'HTTP 401: invalid token',
      },
    }

    const user = userEvent.setup()

    render(<App />)

    expect(await waitForOnboardingHome()).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '选择公司 IT 工具' }))
    await user.click(screen.getAllByRole('button', { name: '测试连接' })[0])
    await user.click(screen.getAllByRole('button', { name: '测试连接' })[1])

    expect(await screen.findByText('✅ 成功')).toBeInTheDocument()
    expect(await screen.findByText('❌ 失败')).toBeInTheDocument()
    expect(screen.getByText('HTTP 401: invalid token')).toBeInTheDocument()
  })

  it('loads a hidden legacy role state without exposing hidden role options in the work module', async () => {
    mockControls.stateOverride = {
      ...fixtures.onboardingState,
      selected_role_id: 'product-manager',
      role_use_case_contents: [
        {
          role_id: 'product-manager',
          use_case_id: 'daily-log',
          use_case_name: '记录日志',
          description: '记录需求和评审进展。',
          info_sources: 'Confluence',
          rules: '按会后更新',
        },
        {
          role_id: 'product-manager',
          use_case_id: 'planning',
          use_case_name: '记录计划',
          description: '维护版本计划。',
          info_sources: 'Jira',
          rules: '按周整理',
        },
      ],
      selected_install_skill_ids: [
        'jira',
        'confluence',
        'product-manager-daily-log',
        'test-product-manager-daily-log',
        'product-manager-planning',
        'test-product-manager-planning',
      ],
    }

    const user = userEvent.setup()

    render(<App />)

    expect(await waitForOnboardingHome()).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '已设置内容' })).toHaveTextContent('产品经理')

    await user.click(screen.getByRole('button', { name: '配置要交给 AI 的工作' }))

    expect(await waitForUseCasesModule()).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '项目经理' })).not.toBeChecked()
    expect(screen.queryByRole('radio', { name: '产品经理' })).not.toBeInTheDocument()
  })

  it('saves role changes without persisting unrelated unsaved company IT tool edits', async () => {
    mockControls.stateOverride = {
      ...fixtures.onboardingState,
      selected_role_id: 'product-manager',
      selected_base_skill_ids: ['jira'],
      role_use_case_contents: [
        {
          role_id: 'product-manager',
          use_case_id: 'daily-log',
          use_case_name: '记录日志',
          description: '记录需求和评审进展。',
          info_sources: 'Confluence',
          rules: '按会后更新',
        },
        {
          role_id: 'product-manager',
          use_case_id: 'planning',
          use_case_name: '记录计划',
          description: '维护版本计划。',
          info_sources: 'Jira',
          rules: '按周整理',
        },
      ],
      selected_install_skill_ids: [
        'jira',
        'product-manager-daily-log',
        'test-product-manager-daily-log',
        'product-manager-planning',
        'test-product-manager-planning',
      ],
      selected_install_skill_ids_initialized: true,
    }

    const user = userEvent.setup()

    render(<App />)

    expect(await waitForOnboardingHome()).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '选择公司 IT 工具' }))
    await user.click(screen.getByRole('checkbox', { name: 'Confluence' }))

    expect(getSetStateCalls()).toHaveLength(0)

    await user.click(screen.getByRole('button', { name: '返回首页' }))
    await user.click(screen.getByRole('button', { name: '配置要交给 AI 的工作' }))

    expect(await waitForUseCasesModule()).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: '项目经理' }))
    await user.click(screen.getByRole('button', { name: '保存岗位' }))

    expect(getSetStateCalls()).toHaveLength(1)

    const [, payload] = getSetStateCalls()[0] as [string, { state: OnboardingState }]
    expect(payload.state.selected_role_id).toBe('project-manager')
    expect(payload.state.selected_base_skill_ids).toEqual(['jira'])
    expect(payload.state.selected_install_skill_ids).toContain('jira')
    expect(payload.state.selected_install_skill_ids).not.toContain('confluence')
    expect(payload.state.selected_install_skill_ids).toContain(
      'project-manager-daily-log'
    )
    expect(payload.state.selected_install_skill_ids).not.toContain(
      'product-manager-daily-log'
    )
  })

  it('keeps unsaved local work edits visible after a successful role save', async () => {
    mockControls.stateOverride = {
      ...fixtures.onboardingState,
      selected_role_id: 'product-manager',
      selected_base_skill_ids: ['jira'],
      role_use_case_contents: [
        {
          role_id: 'product-manager',
          use_case_id: 'daily-log',
          use_case_name: '记录日志',
          description: '记录需求和评审进展。',
          info_sources: 'Confluence',
          rules: '按会后更新',
        },
        {
          role_id: 'product-manager',
          use_case_id: 'planning',
          use_case_name: '记录计划',
          description: '维护版本计划。',
          info_sources: 'Jira',
          rules: '按周整理',
        },
      ],
      selected_install_skill_ids: [
        'jira',
        'product-manager-daily-log',
        'test-product-manager-daily-log',
        'product-manager-planning',
        'test-product-manager-planning',
      ],
      selected_install_skill_ids_initialized: true,
    }

    const temporaryEdit = '临时未保存的工作说明'
    const user = userEvent.setup()

    render(<App />)

    expect(await waitForOnboardingHome()).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '配置要交给 AI 的工作' }))

    expect(await waitForUseCasesModule()).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: '项目经理' }))
    await user.click(screen.getByRole('tab', { name: '选择工作' }))

    const descriptionInput = screen.getByLabelText('用例描述') as HTMLTextAreaElement
    await user.clear(descriptionInput)
    await user.type(descriptionInput, temporaryEdit)

    await user.click(screen.getByRole('tab', { name: '选择岗位' }))
    await user.click(screen.getByRole('button', { name: '保存岗位' }))

    expect(getSetStateCalls()).toHaveLength(1)
    const [, payload] = getSetStateCalls()[0] as [string, { state: OnboardingState }]
    expect(
      payload.state.role_use_case_contents.some((record) =>
        record.description.includes(temporaryEdit)
      )
    ).toBe(false)
    await user.click(screen.getByRole('tab', { name: '选择工作' }))
    expect((screen.getByLabelText('用例描述') as HTMLTextAreaElement).value).toContain(temporaryEdit)
  })

  it('falls back to an empty onboarding role state when loading onboarding state fails', async () => {
    mockControls.stateOverride = null
    const user = userEvent.setup()

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
          throw new Error('Tauri backend unavailable')
        case 'set_onboarding_state':
          return { success: payload?.state }
        case 'get_onboarding_install_preview':
          return { success: { ...fixtures.onboardingPreview, selected_install_skill_ids: payload?.state?.selected_install_skill_ids ?? [], selected_agent_ids: payload?.state?.selected_agent_ids ?? [] } }
        case 'stage_onboarding_generated_packages':
          return { success: { production: null, test: null } }
        case 'sync_onboarding_installation':
          return { success: fixtures.onboardingSyncResult }
        default:
          return { success: null }
      }
    })

    render(<App />)

    expect(await waitForOnboardingHome()).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '配置要交给 AI 的工作' }))

    expect(await waitForUseCasesModule()).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '配置要交给 AI 的工作' })).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '选择岗位', selected: true })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '选择工作', selected: false })).toBeInTheDocument()
    expect(screen.queryByText('先选岗位，再看这个岗位下可以交给 AI 的工作。')).not.toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '项目经理' })).not.toBeChecked()
    await user.click(screen.getByRole('tab', { name: '选择工作' }))
    expect(screen.queryByRole('button', { name: '需求评估' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '记录计划' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '记录日志' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '项目周报' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('用例描述')).not.toBeInTheDocument()
    expect(screen.getByText('当前岗位没有可配置的工作。')).toBeInTheDocument()
  })

  it('shows a failure banner when saving base skill changes fails', async () => {
    const user = userEvent.setup()

    render(<App />)

    expect(await waitForOnboardingHome()).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '选择公司 IT 工具' }))
    await user.click(screen.getByRole('checkbox', { name: 'Confluence' }))

    expect(getSetStateCalls()).toHaveLength(0)

    mockControls.saveError = '保存失败：网络异常'
    await user.click(screen.getByRole('button', { name: '保存设置' }))

    expect(getSetStateCalls()).toHaveLength(1)
    expect(await screen.findByText('保存失败：网络异常')).toBeInTheDocument()
  })

  it('saving base skill changes persists the selected company IT tools', async () => {
    const user = userEvent.setup()

    render(<App />)

    expect(await waitForOnboardingHome()).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '选择公司 IT 工具' }))

    const confluenceCheckbox = screen.getByRole('checkbox', { name: 'Confluence' })
    expect(confluenceCheckbox).toBeChecked()

    await user.click(confluenceCheckbox)

    expect(getSetStateCalls()).toHaveLength(0)

    await user.click(screen.getByRole('button', { name: '保存设置' }))

    expect(getSetStateCalls()).toHaveLength(1)

    const [, payload] = getSetStateCalls()[0] as [string, { state: OnboardingState }]
    expect(payload.state.selected_base_skill_ids).toEqual(['jira'])
    expect(payload.state.selected_install_skill_ids).toContain('jira')
    expect(payload.state.selected_install_skill_ids).not.toContain('confluence')
    expect(await screen.findByText('保存成功')).toBeInTheDocument()
  })

  it('saving company IT tool credentials syncs them immediately after state save', async () => {
    mockControls.stateOverride = {
      ...fixtures.onboardingState,
      credential_values: {
        jiraUrl: 'https://jira.example.com',
        jiraUsername: 'jira.user',
        jiraPassword: 'jira-secret',
        confluenceUrl: 'https://wiki.example.com',
        confluenceUsername: 'wiki.user',
        confluencePassword: 'wiki-secret',
      },
    }
    const user = userEvent.setup()

    render(<App />)

    expect(await waitForOnboardingHome()).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '选择公司 IT 工具' }))
    await user.clear(screen.getByLabelText('Jira URL'))
    await user.type(screen.getByLabelText('Jira URL'), 'https://jira-next.example.com')

    expect(getSetStateCalls()).toHaveLength(0)
    expect(getCredentialSyncCalls()).toHaveLength(0)

    await user.click(screen.getByRole('button', { name: '保存设置' }))

    expect(getSetStateCalls()).toHaveLength(1)
    expect(getCredentialSyncCalls()).toHaveLength(1)

    const [, payload] = getCredentialSyncCalls()[0] as [string, { state: OnboardingState }]
    expect(payload.state.credential_values.jiraUrl).toEqual('https://jira-next.example.com')
    expect(await screen.findByText('保存成功')).toBeInTheDocument()
  })

  it('treats credential edits as basic-module changes instead of install changes', async () => {
    mockControls.stateOverride = {
      ...fixtures.onboardingState,
      credential_values: {
        jiraUrl: 'https://jira.example.com',
        jiraUsername: 'jira.user',
        jiraPassword: 'jira-secret',
        confluenceUrl: 'https://wiki.example.com',
        confluenceUsername: 'wiki.user',
        confluencePassword: 'wiki-secret',
      },
    }
    const user = userEvent.setup()

    render(<App />)

    expect(await waitForOnboardingHome()).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '选择公司 IT 工具' }))
    await user.clear(screen.getByLabelText('Jira URL'))
    await user.type(screen.getByLabelText('Jira URL'), 'https://jira-next.example.com')

    expect(screen.getByRole('button', { name: '保存设置' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: '返回首页' }))
    await user.click(screen.getByRole('button', { name: '安装到 AI 工具' }))

    expect(await waitForInstallModule()).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '保存设置' })).toBeDisabled()
  })

  it('shows a use-case list first, marks configured items, and saves only on demand', async () => {
    const user = userEvent.setup()

    render(<App />)

    expect(await waitForOnboardingHome()).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '配置要交给 AI 的工作' }))

    expect(await waitForUseCasesModule()).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '配置要交给 AI 的工作' })).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '选择岗位', selected: true })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '保存岗位' })).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: '选择工作' }))
    const requirementAssessmentItem = screen.getByRole('button', { name: '需求评估' })
    const planningItem = screen.getByRole('button', { name: '记录计划' })
    const dailyLogItem = screen.getByRole('button', { name: '记录日志' })
    const weeklyReportItem = screen.getByRole('button', { name: '项目周报' })

    expect(within(requirementAssessmentItem).queryByText('已设置')).not.toBeInTheDocument()
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

  it('treats a prefilled description plus SOP as enough to mark a use case configured', async () => {
    mockControls.stateOverride = {
      ...fixtures.onboardingState,
      role_use_case_contents: fixtures.onboardingState.role_use_case_contents.map((useCase) => ({
        ...useCase,
        info_sources: '',
      })),
    }

    const user = userEvent.setup()

    render(<App />)

    expect(await waitForOnboardingHome()).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '配置要交给 AI 的工作' }))

    await user.click(screen.getByRole('tab', { name: '选择工作' }))
    const planningItem = await screen.findByRole('button', { name: '记录计划' })
    const dailyLogItem = screen.getByRole('button', { name: '记录日志' })
    const weeklyReportItem = screen.getByRole('button', { name: '项目周报' })

    expect(within(planningItem).getByText('已设置')).toBeInTheDocument()
    expect(within(dailyLogItem).getByText('已设置')).toBeInTheDocument()
    expect(within(weeklyReportItem).getByText('已设置')).toBeInTheDocument()
  })

  it('auto-saves install changes before syncing and keeps sync results inside the module', async () => {
    const user = userEvent.setup()

    render(<App />)

    expect(await waitForOnboardingHome()).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '安装到 AI 工具' }))

    expect(await waitForInstallModule()).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '安装到 AI 工具' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '公司 IT 工具' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Codex' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Claude Code' })).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: 'Jira' }))

    expect(getSetStateCalls()).toHaveLength(0)
    expect(screen.getByRole('button', { name: '保存设置' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '开始同步安装' }))

    expect(getSetStateCalls()).toHaveLength(1)
    expect(getSyncCalls()).toHaveLength(1)
    expect(screen.queryByText('请先保存当前安装设置。')).not.toBeInTheDocument()
    expect(await screen.findByText('保存成功')).toBeInTheDocument()

    expect(await screen.findByRole('heading', { name: '同步结果' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Codex' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Claude Code' })).toBeInTheDocument()
    expect(screen.getAllByText('新增技能').length).toBeGreaterThan(0)
    expect(screen.getAllByText('移除技能').length).toBeGreaterThan(0)
    expect(screen.getAllByText('未变化技能').length).toBeGreaterThan(0)
    expect(screen.getByText('claude-code sync failed')).toBeInTheDocument()
    expect(screen.queryByLabelText('Jira 用户名')).not.toBeInTheDocument()
  })

  it('shows official product links inside the agent selection cards', async () => {
    const user = userEvent.setup()

    render(<App />)

    expect(await waitForOnboardingHome()).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '安装到 AI 工具' }))

    expect(await waitForInstallModule()).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Codex 官网' })).toHaveAttribute(
      'href',
      'https://openai.com/codex'
    )
    expect(screen.getByRole('link', { name: 'Claude Code 官网' })).toHaveAttribute(
      'href',
      'https://www.anthropic.com/claude-code'
    )
    expect(screen.getByRole('link', { name: 'WorkBuddy 官网' })).toHaveAttribute(
      'href',
      'https://susu3621.github.io/skills-for-no-engineer/'
    )
  })

  it('lets users add a custom use case from 选择工作 and carries it into install skills', async () => {
    const user = userEvent.setup()
    const customUseCaseName = '客户回访'
    const generatedSkillIds = buildGeneratedSkillIdsForRoleUseCase(
      'project-manager',
      customUseCaseName
    )

    render(<App />)

    expect(await waitForOnboardingHome()).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '配置要交给 AI 的工作' }))
    await user.click(screen.getByRole('tab', { name: '选择工作' }))
    await user.click(screen.getByRole('button', { name: '新增用例' }))
    await user.type(screen.getByLabelText('新用例名称'), customUseCaseName)
    await user.click(screen.getByRole('button', { name: '添加用例' }))

    expect(screen.getByRole('button', { name: customUseCaseName })).toBeInTheDocument()
    expect((screen.getByLabelText('用例描述') as HTMLTextAreaElement).value).toBe('')

    await user.click(screen.getByRole('button', { name: '保存设置' }))

    expect(getSetStateCalls()).toHaveLength(1)
    const [, payload] = getSetStateCalls()[0] as [string, { state: OnboardingState }]
    expect(payload.state.role_use_case_contents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role_id: 'project-manager',
          use_case_id: customUseCaseName,
          use_case_name: customUseCaseName,
        }),
      ])
    )

    await user.click(screen.getByRole('button', { name: '返回首页' }))
    await user.click(screen.getByRole('button', { name: '安装到 AI 工具' }))

    const table = await screen.findByRole('table', { name: '岗位生成技能列表' })
    const customRow = within(table).getByText(customUseCaseName).closest('tr') as HTMLTableRowElement
    expect(customRow).not.toBeNull()
    expect(within(customRow).getByText(generatedSkillIds.production_skill_id)).toBeInTheDocument()
    expect(within(customRow).getByText(generatedSkillIds.test_skill_id)).toBeInTheDocument()
  })

  it('renders generated install skills as one row per use case with production and test columns', async () => {
    const user = userEvent.setup()

    render(<App />)

    expect(await waitForOnboardingHome()).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '安装到 AI 工具' }))

    const table = await screen.findByRole('table', { name: '岗位生成技能列表' })
    expect(within(table).getByRole('columnheader', { name: '岗位用例' })).toBeInTheDocument()
    expect(within(table).getByRole('columnheader', { name: '生产用' })).toBeInTheDocument()
    expect(within(table).getByRole('columnheader', { name: '测试用' })).toBeInTheDocument()

    expect(within(table).getByText('记录日志')).toBeInTheDocument()
    const planningRow = within(table).getByText('记录计划').closest('tr') as HTMLTableRowElement
    expect(planningRow).not.toBeNull()
    expect(within(table).getByText('项目周报')).toBeInTheDocument()
    expect(within(planningRow).getByText('project-manager-planning')).toBeInTheDocument()
    expect(within(planningRow).getByText('test-project-manager-planning')).toBeInTheDocument()
  })
})
