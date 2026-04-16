import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { act } from 'react'
import userEvent from '@testing-library/user-event'
import App from '../../App'
import {
  buildGeneratedSkillIdsForRoleUseCase,
  getOnboardingUseCaseOptionById,
} from '../../content/workbuddy'
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
    linux_devices: [],
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

type EnvironmentCheckFixture = {
  status: string
  summary: string
  details: string
  requirements: Array<{
    id: string
    label: string
    required: boolean
    status: string
    details: string | null
  }>
  missing_requirement_ids: string[]
  install_supported: boolean
  install_support_message: string
}

const mockControls = vi.hoisted(() => ({
  saveError: null as string | null,
  stateOverride: null as OnboardingState | null,
  configOverride: null as
    | null
    | {
        preferred_locale: string
        onboarding_guides: Record<string, { completed: boolean }>
      },
  connectionTestResults: {} as Record<
    string,
    { success: boolean; summary: string; details: string }
  >,
  environmentCheckResults: {} as Record<string, EnvironmentCheckFixture>,
  environmentCheckSequences: {} as Record<string, EnvironmentCheckFixture[]>,
  environmentInstallResults: {} as Record<
    string,
    {
      success: boolean
      summary: string
      details: string
      installed_requirement_ids: string[]
    }
  >,
  environmentInstallProgressEvents: {} as Record<
    string,
    Array<{
      status: string
      progress_percent: number
      step: string
      log_line: string | null
    }>
  >,
  eventHandlers: new Map<string, (event: { payload: unknown }) => void>(),
}))

const invokeMock = vi.hoisted(() => vi.fn())

vi.mock('@tauri-apps/api/core', () => ({
  invoke: invokeMock,
}))

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(async (eventName: string, handler: (event: { payload: unknown }) => void) => {
    mockControls.eventHandlers.set(eventName, handler)
    return () => {
      if (mockControls.eventHandlers.get(eventName) === handler) {
        mockControls.eventHandlers.delete(eventName)
      }
    }
  }),
}))

beforeEach(() => {
  mockControls.saveError = null
  mockControls.stateOverride = null
  mockControls.configOverride = null
  mockControls.connectionTestResults = {}
  mockControls.environmentCheckResults = {}
  mockControls.environmentCheckSequences = {}
  mockControls.environmentInstallResults = {}
  mockControls.environmentInstallProgressEvents = {}
  mockControls.eventHandlers.clear()
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
        return {
          success:
            mockControls.configOverride ?? {
              preferred_locale: 'zh-CN',
              onboarding_guides: {
                'onboarding-home': { completed: true },
                'onboarding-basic': { completed: true },
                'onboarding-use-cases': { completed: true },
                'onboarding-install': { completed: true },
              },
            },
        }
      case 'update_config':
        {
          const currentConfig =
            mockControls.configOverride ?? {
              preferred_locale: 'zh-CN',
              onboarding_guides: {
                'onboarding-home': { completed: true },
                'onboarding-basic': { completed: true },
                'onboarding-use-cases': { completed: true },
                'onboarding-install': { completed: true },
              },
            }

          mockControls.configOverride = {
            preferred_locale: payload?.preferredLocale ?? currentConfig.preferred_locale,
            onboarding_guides: payload?.onboardingGuides ?? currentConfig.onboarding_guides,
          }

          return { success: mockControls.configOverride }
        }
      case 'get_app_build_info':
        return { currentVersion: '0.2.0', displayVersion: 'dd40e57' }
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
      case 'check_onboarding_skill_environment':
        {
          const serviceId = payload?.input?.service_id ?? 'jira'
          const sequence = mockControls.environmentCheckSequences[serviceId]
          const configuredResult =
            (sequence?.length
              ? sequence.shift() ?? sequence[sequence.length - 1]
              : undefined) ??
            mockControls.environmentCheckResults[serviceId] ?? {
              status: 'ready',
              summary: '环境已就绪',
              details: '',
              requirements: [
                {
                  id: 'python3',
                  label: 'Python 3',
                  required: true,
                  status: 'ready',
                  details: 'Python 3.12.0',
                },
              ],
              missing_requirement_ids: [],
              install_supported: true,
              install_support_message: '可自动安装缺失环境',
            }

          return {
            success: {
              service_id: serviceId,
              platform: 'macos',
              status: configuredResult.status,
              summary: configuredResult.summary,
              details: configuredResult.details,
              requirements: configuredResult.requirements,
              missing_requirement_ids: configuredResult.missing_requirement_ids,
              install_supported: configuredResult.install_supported,
              install_support_message: configuredResult.install_support_message,
              trigger: payload?.input?.trigger ?? 'automatic',
              tested_fingerprint: payload?.input?.tested_fingerprint ?? 'fingerprint',
            },
          }
        }
      case 'install_onboarding_skill_environment':
        {
          const serviceId = payload?.input?.service_id ?? 'jira'
          const installId = payload?.input?.install_id ?? `install-${serviceId}`
          const listener = mockControls.eventHandlers.get('onboarding-environment-install-progress')
          const progressEvents = mockControls.environmentInstallProgressEvents[serviceId] ?? []

          for (const event of progressEvents) {
            await Promise.resolve()
            listener?.({
              payload: {
                install_id: installId,
                service_id: serviceId,
                status: event.status,
                progress_percent: event.progress_percent,
                step: event.step,
                log_line: event.log_line,
              },
            })
          }

          const configuredResult = mockControls.environmentInstallResults[serviceId] ?? {
            success: true,
            summary: '安装完成',
            details: '',
            installed_requirement_ids: [],
          }

          return {
            success: {
              install_id: installId,
              service_id: serviceId,
              success: configuredResult.success,
              summary: configuredResult.summary,
              details: configuredResult.details,
              installed_requirement_ids: configuredResult.installed_requirement_ids,
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

function getConfigUpdateCalls() {
  return invokeMock.mock.calls.filter(([command]) => command === 'update_config')
}

function getCredentialSyncCalls() {
  return invokeMock.mock.calls.filter(([command]) => command === 'sync_onboarding_credentials')
}

function getConnectionTestCalls() {
  return invokeMock.mock.calls.filter(([command]) => command === 'test_onboarding_connection')
}

function getEnvironmentCheckCalls() {
  return invokeMock.mock.calls.filter(([command]) => command === 'check_onboarding_skill_environment')
}

function getEnvironmentInstallCalls() {
  return invokeMock.mock.calls.filter(
    ([command]) => command === 'install_onboarding_skill_environment'
  )
}

function getInstallPreviewCalls() {
  return invokeMock.mock.calls.filter(([command]) => command === 'get_onboarding_install_preview')
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

function getUseCaseQuestionLabel(useCaseId: string, index = 0) {
  const question = getOnboardingUseCaseOptionById(useCaseId, 'zh-CN')?.structured_questions[index]

  if (!question) {
    throw new Error(`Missing structured question ${index} for use case ${useCaseId}`)
  }

  return question.label
}

function buildStructuredQuestionAnswers(useCaseId: string, answers: Record<string, string>) {
  const questions = getOnboardingUseCaseOptionById(useCaseId, 'zh-CN')?.structured_questions

  if (!questions) {
    throw new Error(`Missing structured questions for use case ${useCaseId}`)
  }

  return questions.map((question) => ({
    ...question,
    answer: answers[question.id] ?? '',
    locked: true,
  }))
}

describe('OnboardingShell', () => {
  it('auto-opens the homepage first-run guide and does not persist completion on early close', async () => {
    const user = userEvent.setup()
    mockControls.configOverride = {
      preferred_locale: 'zh-CN',
      onboarding_guides: {
        'onboarding-home': { completed: false },
        'onboarding-basic': { completed: true },
        'onboarding-use-cases': { completed: true },
        'onboarding-install': { completed: true },
      },
    }

    render(<App />)

    expect(await screen.findByText('第 1 步 / 共 3 步')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '先选公司 IT 工具' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '关闭' }))

    expect(screen.queryByText('第 1 步 / 共 3 步')).not.toBeInTheDocument()
    expect(getConfigUpdateCalls()).toHaveLength(0)
  })

  it('blocks homepage actions while the homepage first-run guide is active', async () => {
    const user = userEvent.setup()
    mockControls.configOverride = {
      preferred_locale: 'zh-CN',
      onboarding_guides: {
        'onboarding-home': { completed: false },
        'onboarding-basic': { completed: true },
        'onboarding-use-cases': { completed: true },
        'onboarding-install': { completed: true },
      },
    }

    render(<App />)

    const basicEntry = await screen.findByRole('button', { name: '选择公司 IT 工具' })
    await expect(user.click(basicEntry)).rejects.toThrow(/pointer-events/i)

    expect(screen.getByRole('heading', { name: '先选公司 IT 工具' })).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'Jira' })).not.toBeInTheDocument()
  })

  it('marks the homepage first-run guide complete only after the final step', async () => {
    const user = userEvent.setup()
    mockControls.configOverride = {
      preferred_locale: 'zh-CN',
      onboarding_guides: {
        'onboarding-home': { completed: false },
        'onboarding-basic': { completed: true },
        'onboarding-use-cases': { completed: true },
        'onboarding-install': { completed: true },
      },
    }

    render(<App />)

    expect(await screen.findByText('第 1 步 / 共 3 步')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '下一步' }))
    expect(screen.getByText('第 2 步 / 共 3 步')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '下一步' }))
    expect(screen.getByText('第 3 步 / 共 3 步')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '下一步' }))

    await waitFor(() => {
      expect(getConfigUpdateCalls()).toHaveLength(1)
    })

    const [, payload] = getConfigUpdateCalls()[0]
    expect(payload?.onboardingGuides?.['onboarding-home']).toEqual({ completed: true })
    expect(screen.queryByText('第 3 步 / 共 3 步')).not.toBeInTheDocument()
  })

  it('auto-opens the 公司 IT 工具 first-run guide on first entry', async () => {
    const user = userEvent.setup()
    mockControls.configOverride = {
      preferred_locale: 'zh-CN',
      onboarding_guides: {
        'onboarding-home': { completed: true },
        'onboarding-basic': { completed: false },
        'onboarding-use-cases': { completed: true },
        'onboarding-install': { completed: true },
      },
    }

    render(<App />)
    await waitForOnboardingHome()

    await user.click(screen.getByRole('button', { name: '选择公司 IT 工具' }))

    expect(
      await screen.findByRole('heading', { name: '先选你们公司正在使用的 IT 工具' })
    ).toBeInTheDocument()
  })

  it('auto-opens the 工作配置 first-run guide on first entry', async () => {
    const user = userEvent.setup()
    mockControls.configOverride = {
      preferred_locale: 'zh-CN',
      onboarding_guides: {
        'onboarding-home': { completed: true },
        'onboarding-basic': { completed: true },
        'onboarding-use-cases': { completed: false },
        'onboarding-install': { completed: true },
      },
    }

    render(<App />)
    await waitForOnboardingHome()

    await user.click(screen.getByRole('button', { name: '配置要交给 AI 的工作' }))

    expect(await screen.findByRole('heading', { name: '先选岗位' })).toBeInTheDocument()
  })

  it('auto-opens the 安装 first-run guide on first entry', async () => {
    const user = userEvent.setup()
    mockControls.configOverride = {
      preferred_locale: 'zh-CN',
      onboarding_guides: {
        'onboarding-home': { completed: true },
        'onboarding-basic': { completed: true },
        'onboarding-use-cases': { completed: true },
        'onboarding-install': { completed: false },
      },
    }

    render(<App />)
    await waitForOnboardingHome()

    await user.click(screen.getByRole('button', { name: '安装到 AI 工具' }))

    expect(await screen.findByRole('heading', { name: '先选要安装到的 AI 工具' })).toBeInTheDocument()
  })

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
      linux_devices: [],
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
      linux_devices: [],
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
    expect(screen.getByRole('radio', { name: '质量经理' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'IT经理' })).toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: '研发经理' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '保存岗位' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '需求评估' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('用例描述')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '选择岗位' })).not.toBeInTheDocument()
    expect(screen.queryByText('先选岗位，再看这个岗位下可以交给 AI 的工作。')).not.toBeInTheDocument()
    expect(screen.queryByText('选择岗位', { selector: 'label' })).not.toBeInTheDocument()
  })

  it('shows the work list and editor after switching to the 工作 tab', async () => {
    const user = userEvent.setup()
    const requirementAssessmentQuestionLabel = getUseCaseQuestionLabel('requirement-assessment')

    render(<App />)

    expect(await waitForOnboardingHome()).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '配置要交给 AI 的工作' }))
    await user.click(screen.getByRole('tab', { name: '选择工作' }))

    expect(screen.getByRole('tab', { name: '选择岗位', selected: false })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '选择工作', selected: true })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '需求评估' })).toBeInTheDocument()
    expect(screen.getByText('系统内置说明')).toBeInTheDocument()
    expect(screen.getByText('你需要填写的问题')).toBeInTheDocument()
    expect(screen.getByLabelText(requirementAssessmentQuestionLabel)).toBeInTheDocument()
    expect(screen.queryByLabelText('用例说明')).not.toBeInTheDocument()
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
    expect(within(useCasesGroup).getByText('记录日志')).toBeInTheDocument()
    expect(within(useCasesGroup).getByText('记录计划')).toBeInTheDocument()
    expect(within(useCasesGroup).queryByText('项目周报')).not.toBeInTheDocument()
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
    expect(screen.getByRole('heading', { name: '版本管理' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '主机与运维' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '通信系统' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Jira' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Confluence' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Gerrit' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'SVN' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Linux' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: '腾讯企业邮箱' })).toBeInTheDocument()
    expect(screen.queryByText('二级入口说明')).not.toBeInTheDocument()
    expect(
      screen.queryByText('先选择“选择公司 IT 工具”，再进入对应的编辑界面。')
    ).not.toBeInTheDocument()
  })

  it('renders company IT tool cards with a separate title line and read-write descriptions', async () => {
    const user = userEvent.setup()

    render(<App />)

    expect(await waitForOnboardingHome()).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '选择公司 IT 工具' }))

    const confluenceCard = screen.getByRole('checkbox', { name: 'Confluence' }).closest('label')
    const gerritCard = screen.getByRole('checkbox', { name: 'Gerrit' }).closest('label')
    const svnCard = screen.getByRole('checkbox', { name: 'SVN' }).closest('label')

    expect(confluenceCard?.querySelector('.field-option__content')).not.toBeNull()
    expect(confluenceCard?.querySelector('.field-option__title')?.textContent).toBe('Confluence')
    expect(confluenceCard?.querySelector('.field-option__hint')?.textContent).toBe(
      '读取并写入周报模板、项目文档和会议纪要'
    )
    expect(gerritCard?.querySelector('.field-option__hint')?.textContent).toBe(
      '读取并写入代码评审、提交状态和变更信息'
    )
    expect(svnCard?.querySelector('.field-option__hint')?.textContent).toBe(
      '读取并写入版本库目录、历史提交和工作副本状态'
    )
  })

  it('shows Confluence, Jira, Gerrit, and SVN credential fields in 公司 IT 工具 and keeps Tencent Exmail credentials to username/password only', async () => {
    mockControls.stateOverride = {
      ...fixtures.onboardingState,
      selected_base_skill_ids: ['jira', 'confluence', 'gerrit', 'svn', 'mail'],
      selected_install_skill_ids: ['jira', 'confluence', 'gerrit', 'svn', 'mail'],
      svn_repositories: [
        {
          id: 'svn-repository-1',
          name: '',
          url: '',
          username: '',
          password: '',
        },
      ],
    }
    const user = userEvent.setup()

    render(<App />)

    expect(await waitForOnboardingHome()).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '选择公司 IT 工具' }))

    expect(screen.getByLabelText('Confluence URL')).toBeInTheDocument()
    expect(screen.getByLabelText('Jira URL')).toBeInTheDocument()
    expect(screen.getByLabelText('连接方式')).toBeInTheDocument()
    expect(screen.getByLabelText('Gerrit URL')).toBeInTheDocument()
    expect(screen.getByLabelText('Gerrit 用户名')).toBeInTheDocument()
    expect(screen.getByLabelText('Gerrit 密码 / HTTP 密码')).toBeInTheDocument()
    expect(screen.getByLabelText('仓库名称')).toBeInTheDocument()
    expect(screen.getByLabelText('SVN URL')).toBeInTheDocument()
    expect(screen.getByLabelText('SVN 用户名')).toBeInTheDocument()
    expect(screen.getByLabelText('SVN 密码')).toBeInTheDocument()
    expect(screen.getByLabelText('腾讯企业邮箱用户名')).toBeInTheDocument()
    expect(screen.getByLabelText('腾讯企业邮箱密码 / 授权码')).toBeInTheDocument()
    expect(screen.queryByLabelText('Gerrit SSH 主机')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Gerrit SSH 端口')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Gerrit SSH 用户名')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Mail SMTP Host')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Mail 发件邮箱')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '返回首页' }))
    await user.click(screen.getByRole('button', { name: '安装到 AI 工具' }))

    expect(await waitForInstallModule()).toBeInTheDocument()
    expect(screen.queryByText('账号凭证')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Confluence URL')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Jira URL')).not.toBeInTheDocument()
  })

  it('switches Gerrit credential fields when auth mode changes', async () => {
    mockControls.stateOverride = {
      ...fixtures.onboardingState,
      selected_base_skill_ids: ['gerrit'],
      selected_install_skill_ids: ['gerrit'],
      credential_values: {
        gerritAuthMode: 'http',
      },
    }

    const user = userEvent.setup()

    render(<App />)

    expect(await waitForOnboardingHome()).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '选择公司 IT 工具' }))

    expect(screen.getByLabelText('Gerrit URL')).toBeInTheDocument()
    expect(screen.queryByLabelText('Gerrit SSH 主机')).not.toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('连接方式'), 'ssh')

    expect(screen.queryByLabelText('Gerrit URL')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Gerrit SSH 主机')).toBeInTheDocument()
    expect(screen.getByLabelText('Gerrit SSH 端口')).toBeInTheDocument()
    expect(screen.getByLabelText('Gerrit SSH 用户名')).toBeInTheDocument()
    expect(screen.queryByLabelText('Gerrit 密码 / HTTP 密码')).not.toBeInTheDocument()
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

  it('renders Linux as a multi-device editor and runs an automatic environment check after selection', async () => {
    mockControls.stateOverride = {
      ...fixtures.onboardingState,
      selected_base_skill_ids: [],
      selected_install_skill_ids: [],
      credential_values: {},
    }
    mockControls.environmentCheckResults = {
      linux: {
        status: 'missing',
        summary: '缺少环境：Python 3、Paramiko',
        details: '未检测到 Paramiko',
        requirements: [
          {
            id: 'python3',
            label: 'Python 3',
            required: true,
            status: 'ready',
            details: 'Python 3.12.0',
          },
          {
            id: 'paramiko',
            label: 'Paramiko',
            required: true,
            status: 'missing',
            details: '未安装',
          },
        ],
        missing_requirement_ids: ['paramiko'],
        install_supported: true,
        install_support_message: '可自动安装缺失环境',
      },
    }

    const user = userEvent.setup()

    render(<App />)

    expect(await waitForOnboardingHome()).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '选择公司 IT 工具' }))
    await user.click(screen.getByRole('checkbox', { name: 'Linux' }))

    await waitFor(() => expect(getEnvironmentCheckCalls()).toHaveLength(1))

    expect(screen.getByRole('button', { name: '新增设备' })).toBeInTheDocument()
    expect(screen.getByLabelText('设备名称')).toBeInTheDocument()
    expect(screen.getByLabelText('IP / 主机地址')).toBeInTheDocument()
    expect(screen.getByLabelText('用户名')).toBeInTheDocument()
    expect(screen.getByLabelText('密码')).toBeInTheDocument()
    expect(screen.getByText('缺少环境：Python 3、Paramiko')).toBeInTheDocument()

    const [, payload] = getEnvironmentCheckCalls()[0] as [
      string,
      { input: { service_id: string; trigger: string } },
    ]
    expect(payload.input.service_id).toBe('linux')
    expect(payload.input.trigger).toBe('automatic')
  })

  it('shows the environment as pending while the automatic Linux check is still running', async () => {
    mockControls.stateOverride = {
      ...fixtures.onboardingState,
      selected_base_skill_ids: [],
      selected_install_skill_ids: [],
      credential_values: {},
    }

    const defaultInvoke = invokeMock.getMockImplementation()
    let resolveEnvironmentCheck: (() => void) | null = null

    invokeMock.mockImplementation((command: string, payload?: any) => {
      if (command === 'check_onboarding_skill_environment' && payload?.input?.service_id === 'linux') {
        return new Promise((resolve) => {
          resolveEnvironmentCheck = () =>
            resolve({
              success: {
                service_id: 'linux',
                platform: 'macos',
                status: 'missing',
                summary: '缺少环境：Python 3、Paramiko',
                details: '未检测到 Paramiko',
                requirements: [
                  {
                    id: 'python3',
                    label: 'Python 3',
                    required: true,
                    status: 'ready',
                    details: 'Python 3.12.0',
                  },
                  {
                    id: 'paramiko',
                    label: 'Paramiko',
                    required: true,
                    status: 'missing',
                    details: '未安装',
                  },
                ],
                missing_requirement_ids: ['paramiko'],
                install_supported: true,
                install_support_message: '可自动安装缺失环境',
                trigger: payload?.input?.trigger ?? 'automatic',
                tested_fingerprint: payload?.input?.tested_fingerprint ?? 'fingerprint',
              },
            })
        })
      }

      return defaultInvoke?.(command, payload)
    })

    const user = userEvent.setup()

    render(<App />)

    expect(await waitForOnboardingHome()).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '选择公司 IT 工具' }))
    await user.click(screen.getByRole('checkbox', { name: 'Linux' }))

    expect(screen.getByText('检测中...')).toBeInTheDocument()
    expect(resolveEnvironmentCheck).not.toBeNull()

    await act(async () => {
      resolveEnvironmentCheck?.()
      await Promise.resolve()
    })

    expect(await screen.findByText('缺少环境：Python 3、Paramiko')).toBeInTheDocument()
  })

  it('shows a module-level hint while environment checks are pending', async () => {
    mockControls.stateOverride = {
      ...fixtures.onboardingState,
      selected_base_skill_ids: [],
      selected_install_skill_ids: [],
      credential_values: {},
    }

    const defaultInvoke = invokeMock.getMockImplementation()

    invokeMock.mockImplementation((command: string, payload?: any) => {
      if (command === 'check_onboarding_skill_environment' && payload?.input?.service_id === 'linux') {
        return new Promise(() => {})
      }

      return defaultInvoke?.(command, payload)
    })

    const user = userEvent.setup()

    render(<App />)

    expect(await waitForOnboardingHome()).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '选择公司 IT 工具' }))
    await user.click(screen.getByRole('checkbox', { name: 'Linux' }))

    expect(screen.getByText('正在检测所需环境，请稍候...')).toBeInTheDocument()
  })

  it('persists Linux devices as structured records when saving base skills', async () => {
    mockControls.stateOverride = {
      ...fixtures.onboardingState,
      selected_base_skill_ids: [],
      selected_install_skill_ids: [],
      credential_values: {},
    }

    const user = userEvent.setup()

    render(<App />)

    expect(await waitForOnboardingHome()).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '选择公司 IT 工具' }))
    await user.click(screen.getByRole('checkbox', { name: 'Linux' }))
    await user.clear(screen.getByLabelText('设备名称'))
    await user.type(screen.getByLabelText('设备名称'), 'Build Server')
    await user.clear(screen.getByLabelText('IP / 主机地址'))
    await user.type(screen.getByLabelText('IP / 主机地址'), '192.168.9.20')
    await user.clear(screen.getByLabelText('用户名'))
    await user.type(screen.getByLabelText('用户名'), 'ops')
    await user.clear(screen.getByLabelText('密码'))
    await user.type(screen.getByLabelText('密码'), 'linux-secret')
    await user.click(screen.getByRole('button', { name: '保存设置' }))

    await act(async () => {
      await Promise.resolve()
    })

    const [, payload] = getSetStateCalls()[0] as [
      string,
      {
        state: {
          selected_base_skill_ids: string[]
          linux_devices?: Array<{
            name: string
            host: string
            username: string
            password: string
          }>
        }
      },
    ]

    expect(payload.state.selected_base_skill_ids).toContain('linux')
    expect(payload.state.linux_devices).toEqual([
      expect.objectContaining({
        name: 'Build Server',
        host: '192.168.9.20',
        username: 'ops',
        password: 'linux-secret',
      }),
    ])
  })

  it('persists multiple SVN repositories as structured records when saving base skills', async () => {
    mockControls.stateOverride = {
      ...fixtures.onboardingState,
      selected_base_skill_ids: [],
      selected_install_skill_ids: [],
      credential_values: {},
    } as any

    const user = userEvent.setup()

    render(<App />)

    expect(await waitForOnboardingHome()).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '选择公司 IT 工具' }))
    await user.click(screen.getByRole('checkbox', { name: 'SVN' }))

    expect(screen.getAllByLabelText('仓库名称')).toHaveLength(1)

    await user.type(screen.getByLabelText('仓库名称'), 'Project Repo')
    await user.clear(screen.getByLabelText('SVN URL'))
    await user.type(screen.getByLabelText('SVN URL'), 'https://svn.example.com/repos/project')
    await user.clear(screen.getByLabelText('SVN 用户名'))
    await user.type(screen.getByLabelText('SVN 用户名'), 'svn.user')
    await user.clear(screen.getByLabelText('SVN 密码'))
    await user.type(screen.getByLabelText('SVN 密码'), 'svn-secret')

    await user.click(screen.getByRole('button', { name: '新增仓库' }))

    const repoNameInputs = screen.getAllByLabelText('仓库名称')
    const repoUrlInputs = screen.getAllByLabelText('SVN URL')
    const repoUsernameInputs = screen.getAllByLabelText('SVN 用户名')
    const repoPasswordInputs = screen.getAllByLabelText('SVN 密码')

    await user.type(repoNameInputs[1], 'Ops Repo')
    await user.clear(repoUrlInputs[1])
    await user.type(repoUrlInputs[1], 'https://svn.example.com/repos/ops')
    await user.clear(repoUsernameInputs[1])
    await user.type(repoUsernameInputs[1], 'ops.user')
    await user.clear(repoPasswordInputs[1])
    await user.type(repoPasswordInputs[1], 'ops-secret')

    await user.click(screen.getByRole('button', { name: '保存设置' }))

    await act(async () => {
      await Promise.resolve()
    })

    const [, payload] = getSetStateCalls()[0] as [
      string,
      {
        state: {
          selected_base_skill_ids: string[]
          svn_repositories?: Array<{
            name: string
            url: string
            username: string
            password: string
          }>
        }
      },
    ]

    expect(payload.state.selected_base_skill_ids).toContain('svn')
    expect(payload.state.svn_repositories).toEqual([
      expect.objectContaining({
        name: 'Project Repo',
        url: 'https://svn.example.com/repos/project',
        username: 'svn.user',
        password: 'svn-secret',
      }),
      expect.objectContaining({
        name: 'Ops Repo',
        url: 'https://svn.example.com/repos/ops',
        username: 'ops.user',
        password: 'ops-secret',
      }),
    ])
  })

  it('runs an automatic environment check when a base skill is selected and renders the environment panel beside credentials', async () => {
    mockControls.stateOverride = {
      ...fixtures.onboardingState,
      selected_base_skill_ids: [],
      selected_install_skill_ids: [],
      credential_values: {},
    }
    mockControls.environmentCheckResults = {
      jira: {
        status: 'missing',
        summary: '缺少环境：Python 3',
        details: '未检测到 python3',
        requirements: [
          {
            id: 'python3',
            label: 'Python 3',
            required: true,
            status: 'missing',
            details: '未安装',
          },
        ],
        missing_requirement_ids: ['python3'],
        install_supported: true,
        install_support_message: '可自动安装缺失环境',
      },
    }

    const user = userEvent.setup()

    render(<App />)

    expect(await waitForOnboardingHome()).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '选择公司 IT 工具' }))
    await user.click(screen.getByRole('checkbox', { name: 'Jira' }))

    await waitFor(() => expect(getEnvironmentCheckCalls()).toHaveLength(1))

    const [, payload] = getEnvironmentCheckCalls()[0] as [
      string,
      { input: { service_id: string; trigger: string } },
    ]
    expect(payload.input.service_id).toBe('jira')
    expect(payload.input.trigger).toBe('automatic')
    expect(screen.getByText('运行环境')).toBeInTheDocument()
    expect(screen.getByText('缺少环境：Python 3')).toBeInTheDocument()
    expect(screen.getByText('未检测到 python3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '自动安装缺失环境' })).toBeInTheDocument()
  })

  it('renders real-time install progress and logs in the environment panel', async () => {
    mockControls.stateOverride = {
      ...fixtures.onboardingState,
      selected_base_skill_ids: ['svn'],
      selected_install_skill_ids: ['svn'],
      credential_values: {
        svnUrl: 'https://svn.example.com/repos/project',
        svnUsername: 'svn.user',
        svnPassword: 'svn-secret',
      },
    }
    mockControls.environmentCheckResults = {
      svn: {
        status: 'missing',
        summary: '缺少环境：Python 3、SVN',
        details: '需要先安装运行环境',
        requirements: [
          {
            id: 'python3',
            label: 'Python 3',
            required: true,
            status: 'missing',
            details: '未安装',
          },
          {
            id: 'svn',
            label: 'SVN',
            required: true,
            status: 'missing',
            details: '未安装',
          },
        ],
        missing_requirement_ids: ['python3', 'svn'],
        install_supported: true,
        install_support_message: '可自动安装缺失环境',
      },
    }
    mockControls.environmentInstallProgressEvents = {
      svn: [
        {
          status: 'running',
          progress_percent: 40,
          step: '正在安装 Python 3',
          log_line: 'winget install Python.Python.3.12',
        },
        {
          status: 'running',
          progress_percent: 80,
          step: '正在安装 SVN',
          log_line: 'winget install TortoiseSVN.TortoiseSVN --custom ADDLOCAL=ALL',
        },
      ],
    }
    mockControls.environmentInstallResults = {
      svn: {
        success: true,
        summary: '环境安装完成',
        details: '',
        installed_requirement_ids: ['python3', 'svn'],
      },
    }

    const user = userEvent.setup()

    render(<App />)

    expect(await waitForOnboardingHome()).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '选择公司 IT 工具' }))

    expect(await screen.findByRole('button', { name: '自动安装缺失环境' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '自动安装缺失环境' }))

    await waitFor(() => expect(getEnvironmentInstallCalls()).toHaveLength(1))
    expect(await screen.findByText('正在安装 SVN')).toBeInTheDocument()
    expect(screen.getByText('80%')).toBeInTheDocument()
    expect(screen.getByText('winget install Python.Python.3.12')).toBeInTheDocument()
    expect(
      screen.getByText('winget install TortoiseSVN.TortoiseSVN --custom ADDLOCAL=ALL')
    ).toBeInTheDocument()
    expect(screen.getByText('环境安装完成')).toBeInTheDocument()
  })

  it('re-runs the environment check after install and refreshes the panel to ready', async () => {
    mockControls.stateOverride = {
      ...fixtures.onboardingState,
      selected_base_skill_ids: ['svn'],
      selected_install_skill_ids: ['svn'],
      credential_values: {
        svnUrl: 'https://svn.example.com/repos/project',
        svnUsername: 'svn.user',
        svnPassword: 'svn-secret',
      },
    }
    mockControls.environmentCheckSequences = {
      svn: [
        {
          status: 'missing',
          summary: '缺少环境：Python 3、SVN',
          details: '需要先安装运行环境',
          requirements: [
            {
              id: 'python3',
              label: 'Python 3',
              required: true,
              status: 'missing',
              details: '未安装',
            },
            {
              id: 'svn',
              label: 'SVN',
              required: true,
              status: 'missing',
              details: '未安装',
            },
          ],
          missing_requirement_ids: ['python3', 'svn'],
          install_supported: true,
          install_support_message: '可自动安装缺失环境',
        },
        {
          status: 'ready',
          summary: '环境已就绪',
          details: '可通过 winget 自动安装缺失环境。',
          requirements: [
            {
              id: 'python3',
              label: 'Python 3',
              required: true,
              status: 'ready',
              details: 'Python 3.12.1',
            },
            {
              id: 'svn',
              label: 'SVN',
              required: true,
              status: 'ready',
              details: 'svn, version 1.14.5',
            },
          ],
          missing_requirement_ids: [],
          install_supported: false,
          install_support_message: '可通过 winget 自动安装缺失环境',
        },
      ],
    }
    mockControls.environmentInstallResults = {
      svn: {
        success: true,
        summary: '环境已就绪',
        details: '可通过 winget 自动安装缺失环境。',
        installed_requirement_ids: ['python3', 'svn'],
      },
    }

    const user = userEvent.setup()

    render(<App />)

    expect(await waitForOnboardingHome()).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '选择公司 IT 工具' }))
    expect(await screen.findByRole('button', { name: '自动安装缺失环境' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '自动安装缺失环境' }))

    await waitFor(() => expect(getEnvironmentInstallCalls()).toHaveLength(1))
    await waitFor(() => expect(getEnvironmentCheckCalls()).toHaveLength(2))
    await waitFor(() => {
      expect(screen.getAllByText('环境已就绪').length).toBeGreaterThan(0)
    })
    expect(screen.getByText('Python 3.12.1')).toBeInTheDocument()
    expect(screen.getByText('svn, version 1.14.5')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '自动安装缺失环境' })).not.toBeInTheDocument()
  })

  it('does not run automatic connection tests after saving completed credentials', async () => {
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
    expect(getConnectionTestCalls()).toHaveLength(0)
    expect(screen.getByText('未测试')).toBeInTheDocument()
    expect(screen.getByText('填写完成后可手动点击测试连接。')).toBeInTheDocument()
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
    const latestConnectionTestCall =
      getConnectionTestCalls()[getConnectionTestCalls().length - 1]
    const [, payload] = latestConnectionTestCall as [
      string,
      { input: { service_id: string; trigger: string } },
    ]
    expect(payload.input.service_id).toBe('jira')
    expect(payload.input.trigger).toBe('manual')
  })

  it('runs a manual connection test for an individual linux device', async () => {
    mockControls.stateOverride = {
      ...fixtures.onboardingState,
      selected_base_skill_ids: ['linux'],
      selected_install_skill_ids: ['linux'],
      linux_devices: [
        {
          id: 'linux-device-1',
          name: 'Build Server',
          host: '192.168.9.20',
          username: 'ops',
          password: 'linux-secret',
        },
      ],
    }

    const user = userEvent.setup()

    render(<App />)

    expect(await waitForOnboardingHome()).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '选择公司 IT 工具' }))

    const deviceNameInput = screen.getByDisplayValue('Build Server')
    const deviceCard = deviceNameInput.closest('.onboarding-linux-device-card')
    expect(deviceCard).not.toBeNull()

    await user.click(within(deviceCard as HTMLElement).getByRole('button', { name: '测试连接' }))

    expect(getConnectionTestCalls().length).toBeGreaterThan(0)
    const latestConnectionTestCall =
      getConnectionTestCalls()[getConnectionTestCalls().length - 1]
    const [, payload] = latestConnectionTestCall as [
      string,
      {
        input: {
          service_id: string
          trigger: string
          credential_values: Record<string, string>
        }
      },
    ]
    expect(payload.input.service_id).toBe('linux')
    expect(payload.input.trigger).toBe('manual')
    expect(payload.input.credential_values).toEqual({
      linuxDeviceName: 'Build Server',
      linuxHost: '192.168.9.20',
      linuxUsername: 'ops',
      linuxPassword: 'linux-secret',
    })
  })

  it('runs a manual connection test for an individual SVN repository', async () => {
    mockControls.stateOverride = {
      ...fixtures.onboardingState,
      selected_base_skill_ids: ['svn'],
      selected_install_skill_ids: ['svn'],
      credential_values: {},
      svn_repositories: [
        {
          id: 'svn-repository-1',
          name: 'Project Repo',
          url: 'https://svn.example.com/repos/project',
          username: 'svn.user',
          password: 'svn-secret',
        },
      ],
    } as any

    const user = userEvent.setup()

    render(<App />)

    expect(await waitForOnboardingHome()).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '选择公司 IT 工具' }))

    const repoNameInput = screen.getByDisplayValue('Project Repo')
    const repoCard = repoNameInput.closest('.onboarding-svn-repository-card')
    expect(repoCard).not.toBeNull()

    await user.click(within(repoCard as HTMLElement).getByRole('button', { name: '测试连接' }))

    expect(getConnectionTestCalls().length).toBeGreaterThan(0)
    const latestConnectionTestCall =
      getConnectionTestCalls()[getConnectionTestCalls().length - 1]
    const [, payload] = latestConnectionTestCall as [
      string,
      {
        input: {
          service_id: string
          trigger: string
          credential_values: Record<string, string>
        }
      },
    ]
    expect(payload.input.service_id).toBe('svn')
    expect(payload.input.trigger).toBe('manual')
    expect(payload.input.credential_values).toEqual({
      svnRepositoryName: 'Project Repo',
      svnUrl: 'https://svn.example.com/repos/project',
      svnUsername: 'svn.user',
      svnPassword: 'svn-secret',
    })
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
    const requirementAssessmentQuestionLabel = getUseCaseQuestionLabel('requirement-assessment')
    const user = userEvent.setup()

    render(<App />)

    expect(await waitForOnboardingHome()).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '配置要交给 AI 的工作' }))

    expect(await waitForUseCasesModule()).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: '项目经理' }))
    await user.click(screen.getByRole('tab', { name: '选择工作' }))
    await user.click(screen.getByRole('button', { name: '需求评估' }))

    const answerInput = screen.getByLabelText(requirementAssessmentQuestionLabel) as HTMLInputElement
    await user.clear(answerInput)
    await user.type(answerInput, temporaryEdit)

    await user.click(screen.getByRole('tab', { name: '选择岗位' }))
    await user.click(screen.getByRole('button', { name: '保存岗位' }))

    expect(getSetStateCalls()).toHaveLength(1)
    const [, payload] = getSetStateCalls()[0] as [string, { state: OnboardingState }]
    expect(
      payload.state.role_use_case_contents.some((record) =>
        (record.questions ?? []).some((question) => question.answer.includes(temporaryEdit))
      )
    ).toBe(false)
    await user.click(screen.getByRole('tab', { name: '选择工作' }))
    expect(
      (screen.getByLabelText(requirementAssessmentQuestionLabel) as HTMLInputElement).value
    ).toContain(temporaryEdit)
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
          return {
            success: {
              preferred_locale: 'zh-CN',
              onboarding_guides: {
                'onboarding-home': { completed: true },
                'onboarding-basic': { completed: true },
                'onboarding-use-cases': { completed: true },
                'onboarding-install': { completed: true },
              },
            },
          }
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

  it('shows a home-level hint while background environment checks are pending', async () => {
    mockControls.stateOverride = {
      ...fixtures.onboardingState,
      selected_base_skill_ids: ['linux'],
      selected_install_skill_ids: ['linux'],
      credential_values: {},
      linux_devices: [],
    }

    const defaultInvoke = invokeMock.getMockImplementation()

    invokeMock.mockImplementation((command: string, payload?: any) => {
      if (command === 'check_onboarding_skill_environment' && payload?.input?.service_id === 'linux') {
        return new Promise(() => {})
      }

      return defaultInvoke?.(command, payload)
    })

    render(<App />)

    expect(await waitForOnboardingHome()).toBeInTheDocument()
    expect(await screen.findByText('正在检测所需环境，请稍候...')).toBeInTheDocument()
  })

  it('does not refresh the install preview when only credential values change', async () => {
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
    await waitFor(() => expect(getInstallPreviewCalls().length).toBeGreaterThan(0))

    invokeMock.mockClear()

    await user.click(screen.getByRole('button', { name: '选择公司 IT 工具' }))

    const jiraUrlField = await screen.findByLabelText('Jira URL')
    await user.clear(jiraUrlField)
    await user.type(jiraUrlField, 'https://jira.changed.example.com')

    await act(async () => {
      await Promise.resolve()
    })

    expect(getInstallPreviewCalls()).toHaveLength(0)
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
    const requirementAssessmentQuestionLabel = getUseCaseQuestionLabel('requirement-assessment')

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
    expect(within(weeklyReportItem).queryByText('已设置')).not.toBeInTheDocument()

    const answerInput = screen.getByLabelText(requirementAssessmentQuestionLabel)
    await user.clear(answerInput)
    await user.type(answerInput, 'https://wiki.example.com/pre-sales')

    expect(getSetStateCalls()).toHaveLength(0)

    await user.click(screen.getByRole('button', { name: '保存设置' }))

    expect(getSetStateCalls()).toHaveLength(1)
    expect(await screen.findByText('保存成功')).toBeInTheDocument()
  })

  it('treats a built-in use case with all required answers as configured', async () => {
    mockControls.stateOverride = {
      ...fixtures.onboardingState,
      role_use_case_contents: fixtures.onboardingState.role_use_case_contents.map((useCase) => ({
        ...useCase,
        ...(useCase.use_case_id === 'weekly-report'
          ? {
              info_sources: '',
              rules: '',
              questions: buildStructuredQuestionAnswers('weekly-report', {
                'project-list-source': 'https://wiki.example.com/projects',
                'project-info-navigation': 'https://wiki.example.com/project-navigation',
                'weekly-report-sop': 'https://wiki.example.com/weekly-report-sop',
              }),
            }
          : {}),
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
    expect((screen.getByLabelText('用例说明') as HTMLTextAreaElement).value).toBe('')
    expect(screen.getByText('先新增一个问题。')).toBeInTheDocument()

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
