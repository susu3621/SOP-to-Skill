import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import type {
  OnboardingAgentSyncResult,
  OnboardingBatchSyncResult,
  OnboardingEditableUseCaseRecord,
  OnboardingGeneratedSkillIds,
  OnboardingInstallCandidateGroup,
  OnboardingInstallPreview,
  OnboardingState,
} from './types'

const fixtures = vi.hoisted(() => {
  const roleUseCaseContents: OnboardingEditableUseCaseRecord[] = [
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
    role_use_case_contents: roleUseCaseContents,
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

  const appUpdate = {
    currentVersion: '0.2.0',
    version: '0.2.1',
    body: 'Bug fixes and bundled skill updates.',
    date: '2026-04-02T00:00:00Z',
  }

  const buildInfo = {
    currentVersion: '0.2.0',
    displayVersion: 'dd40e57',
  }

  const runtime = {
    appUpdate: null as null | typeof appUpdate,
    buildInfo: buildInfo as typeof buildInfo,
    installAppUpdateCalls: 0,
    exportCurrentLogCalls: 0,
    exportCurrentLogResult: {
      success: '/Users/juns/Desktop/sop-to-skill-log-2026-04-13-153000.log',
    } as { success?: string; error?: string },
    preferredLocale: 'zh-CN' as 'zh-CN' | 'en-US',
    updatedLocales: [] as Array<'zh-CN' | 'en-US'>,
    trayNavigateHandler: null as null | ((event: { payload: string }) => void),
    skills: [] as Array<Record<string, unknown>>,
  }

  return {
    appUpdate,
    onboardingState,
    onboardingPreview,
    onboardingSyncResult,
    runtime,
  }
})

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(async (command: string, payload?: any) => {
    switch (command) {
      case 'list_skills':
        return { success: fixtures.runtime.skills }
      case 'list_installed':
        return { success: [] }
      case 'get_target_apps':
        return []
      case 'check_app_update':
        return fixtures.runtime.appUpdate
      case 'get_app_build_info':
        return fixtures.runtime.buildInfo
      case 'install_app_update':
        fixtures.runtime.installAppUpdateCalls += 1
        return true
      case 'export_current_log':
        fixtures.runtime.exportCurrentLogCalls += 1
        if (fixtures.runtime.exportCurrentLogResult.error) {
          return { error: fixtures.runtime.exportCurrentLogResult.error }
        }
        return { success: fixtures.runtime.exportCurrentLogResult.success }
      case 'get_config':
        return { success: { preferred_locale: fixtures.runtime.preferredLocale } }
      case 'update_config':
        if (payload?.preferredLocale) {
          fixtures.runtime.preferredLocale = payload.preferredLocale
          fixtures.runtime.updatedLocales.push(payload.preferredLocale)
        }
        return { success: { preferred_locale: fixtures.runtime.preferredLocale } }
      case 'get_data_directory':
        return '~/.sop-to-skill'
      case 'get_onboarding_state':
        return { success: fixtures.onboardingState }
      case 'set_onboarding_state':
        return { success: fixtures.onboardingState }
      case 'test_onboarding_connection':
        return {
          success: {
            service_id: payload?.input?.service_id ?? 'jira',
            success: true,
            status: 'success',
            summary: '连接成功',
            details: 'ok',
            trigger: payload?.input?.trigger ?? 'manual',
            tested_fingerprint: payload?.input?.tested_fingerprint ?? 'fingerprint',
          },
        }
      case 'check_onboarding_skill_environment':
        return {
          success: {
            service_id: payload?.input?.service_id ?? 'jira',
            platform: 'macos',
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
            trigger: payload?.input?.trigger ?? 'automatic',
            tested_fingerprint: payload?.input?.tested_fingerprint ?? 'fingerprint',
          },
        }
      case 'install_onboarding_skill_environment':
        return {
          success: {
            install_id: payload?.input?.install_id ?? 'install-jira',
            service_id: payload?.input?.service_id ?? 'jira',
            success: true,
            summary: '环境安装完成',
            details: '',
            installed_requirement_ids: ['python3'],
          },
        }
      case 'get_onboarding_install_preview':
        return { success: fixtures.onboardingPreview }
      case 'stage_onboarding_generated_packages':
        return { success: { production: null, test: null } }
      case 'sync_onboarding_installation':
        return { success: fixtures.onboardingSyncResult }
      default:
        return { success: null }
    }
  }),
}))

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(async (eventName: string, handler: (event: { payload: string }) => void) => {
    if (eventName === 'tray-navigate') {
      fixtures.runtime.trayNavigateHandler = handler
    }
    return () => {
      if (eventName === 'tray-navigate') {
        fixtures.runtime.trayNavigateHandler = null
      }
    }
  }),
}))

describe('onboarding shell smoke coverage', () => {
  async function waitForOnboardingHome() {
    return screen.findByRole('button', { name: '选择公司 IT 工具' })
  }

  beforeEach(() => {
    fixtures.runtime.appUpdate = null
    fixtures.runtime.buildInfo = {
      currentVersion: '0.2.0',
      displayVersion: 'dd40e57',
    }
    fixtures.runtime.installAppUpdateCalls = 0
    fixtures.runtime.exportCurrentLogCalls = 0
    fixtures.runtime.exportCurrentLogResult = {
      success: '/Users/juns/Desktop/sop-to-skill-log-2026-04-13-153000.log',
    }
    fixtures.runtime.preferredLocale = 'zh-CN'
    fixtures.runtime.updatedLocales = []
    fixtures.runtime.trayNavigateHandler = null
    fixtures.runtime.skills = []
  })

  it('opens the onboarding home menu instead of the legacy long-form shell', async () => {
    render(<App />)

    expect(await waitForOnboardingHome()).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        name: 'SOP 交给 AI 执行，省下时间去做真正有价值的事。',
      })
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        '利用公司的 SOP，快速生成对应的 Skill，让 AI 快速替你完成任务。'
      )
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '检查更新' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '开始设置' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Skill 库' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '已安装' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '设置' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Onboarding' })).not.toBeInTheDocument()
    expect(screen.queryByText('界面 Demo，暂不接入真实发送能力')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '选择公司 IT 工具' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '配置要交给 AI 的工作' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '安装到 AI 工具' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '已设置内容' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '开始设置' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: /Agent、岗位和基础技能/i })
    ).not.toBeInTheDocument()
  })

  it('uses singular Skill wording in the empty skill library state', async () => {
    const user = userEvent.setup()
    render(<App />)

    await waitForOnboardingHome()
    await user.click(screen.getByRole('button', { name: 'Skill 库' }))

    expect(screen.getByRole('heading', { name: '可用 Skill' })).toBeInTheDocument()
    expect(
      screen.getByText(
        '暂无可用 Skill。请将 Skill 目录包放到仓库的 `skills/` 目录，或应用数据目录中的 `skills/` 目录。'
      )
    ).toBeInTheDocument()
  })

  it('uses singular Skill wording in the empty installed state', async () => {
    const user = userEvent.setup()
    render(<App />)

    await waitForOnboardingHome()
    await user.click(screen.getByRole('button', { name: '已安装' }))

    expect(screen.getByRole('heading', { name: '已安装 Skill' })).toBeInTheDocument()
    expect(
      screen.getByText('管理已经安装到各个 AI 工具中的 Skill。')
    ).toBeInTheDocument()
    expect(screen.getByText('暂无已安装 Skill。')).toBeInTheDocument()
  })

  it('shows the version management category for Gerrit and SVN in the skill library', async () => {
    fixtures.runtime.skills = [
      {
        id: 'gerrit',
        name: {
          'zh-CN': 'Gerrit',
          'en-US': 'Gerrit',
        },
        description: {
          'zh-CN': '读取代码评审、提交状态和变更信息',
          'en-US': 'Read code reviews, submit status, and change information.',
        },
        version: '1.0.0',
        category: 'version-management',
        author: null,
        targets: ['codex', 'claude-code', 'workbuddy'],
        variables: [],
        is_installed: false,
        installed_version: null,
        update_status: 'not-installed',
      },
      {
        id: 'svn',
        name: {
          'zh-CN': 'SVN',
          'en-US': 'SVN',
        },
        description: {
          'zh-CN': '读取版本库目录、历史提交和工作副本状态，支持常见 SVN 操作。',
          'en-US': 'Read repository paths, history, and working-copy state, and support common SVN operations.',
        },
        version: '1.0.0',
        category: 'version-management',
        author: null,
        targets: ['codex', 'claude-code', 'workbuddy'],
        variables: [],
        is_installed: false,
        installed_version: null,
        update_status: 'not-installed',
      },
    ]
    const user = userEvent.setup()

    render(<App />)

    await waitForOnboardingHome()
    await user.click(screen.getByRole('button', { name: 'Skill 库' }))

    expect(screen.getByText('Gerrit')).toBeInTheDocument()
    expect(screen.getByText('SVN')).toBeInTheDocument()
    expect(screen.getAllByText('版本管理').length).toBeGreaterThan(0)
  })

  it('shows an install action when a newer desktop app update is available', async () => {
    fixtures.runtime.appUpdate = fixtures.appUpdate
    fixtures.runtime.buildInfo = {
      currentVersion: '0.2.0',
      displayVersion: 'v0.2.0',
    }
    const user = userEvent.setup()

    render(<App />)

    const installButton = await screen.findByRole('button', { name: /下载并安装更新/ })
    expect(screen.getByText('发现新版本 v0.2.1')).toBeInTheDocument()
    expect(await screen.findByText('当前版本 v0.2.0')).toBeInTheDocument()

    await user.click(installButton)

    expect(fixtures.runtime.installAppUpdateCalls).toBe(1)
  })

  it('shows the current build identifier next to the update action for local builds', async () => {
    fixtures.runtime.buildInfo = {
      currentVersion: '0.2.0',
      displayVersion: 'dd40e57',
    }

    render(<App />)

    await waitForOnboardingHome()

    expect(await screen.findByText('当前版本 dd40e57')).toBeInTheDocument()
  })

  it('renders the full app shell in English when the preferred locale is en-US', async () => {
    fixtures.runtime.preferredLocale = 'en-US'

    render(<App />)

    expect(
      await screen.findByRole('heading', {
        name: 'Hand your company SOPs to AI so you can spend time on work that matters.',
      })
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start setup' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Skill Library' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Installed' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Company IT Tools' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Configure AI Work' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Install into AI Tool' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '选择公司 IT 工具' })).not.toBeInTheDocument()
  })

  it('keeps generated onboarding defaults in English after loading the preferred locale', async () => {
    fixtures.runtime.preferredLocale = 'en-US'
    const user = userEvent.setup()

    render(<App />)

    expect(await screen.findByRole('button', { name: 'Configure AI Work' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Configure AI Work' }))
    await user.click(screen.getByRole('tab', { name: 'Choose work' }))

    expect(await screen.findByRole('button', { name: 'Requirement Assessment' })).toBeInTheDocument()
    expect(screen.getByText('Built-in guidance')).toBeInTheDocument()
    expect(screen.getByText('Questions to answer')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Review the incoming requirement, internal technical assets, and boundary constraints to form an initial assessment.'
      )
    ).toBeInTheDocument()
    expect(screen.queryByDisplayValue(/输入（每次执行都需要提供给Skill的信息）/)).not.toBeInTheDocument()
  })

  it('switches locale from the header and persists the selection', async () => {
    const user = userEvent.setup()
    render(<App />)

    await waitForOnboardingHome()
    await user.click(screen.getByRole('button', { name: 'English' }))

    await waitFor(() => {
      expect(
        screen.getByRole('heading', {
          name: 'Hand your company SOPs to AI so you can spend time on work that matters.',
        })
      ).toBeInTheDocument()
    })

    expect(fixtures.runtime.updatedLocales).toEqual(['en-US'])
    expect(screen.getByRole('button', { name: 'Company IT Tools' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '选择公司 IT 工具' })).not.toBeInTheDocument()
  })

  it('groups check updates and locale switching in the same header utility area', async () => {
    render(<App />)

    await waitForOnboardingHome()

    const utility = document.querySelector('.masthead__utility')
    expect(utility).not.toBeNull()
    expect(
      within(utility as HTMLElement).getByRole('button', { name: '检查更新' })
    ).toBeInTheDocument()
    expect(
      within(utility as HTMLElement).getByRole('group', { name: 'Locale switcher' })
    ).toBeInTheDocument()
    expect(
      within(utility as HTMLElement).getByRole('button', { name: '中文' })
    ).toBeInTheDocument()
    expect(
      within(utility as HTMLElement).getByRole('button', { name: 'English' })
    ).toBeInTheDocument()
  })

  it('shows an export-log action in the header utility area', async () => {
    render(<App />)

    await waitForOnboardingHome()

    const utility = document.querySelector('.masthead__utility')
    expect(utility).not.toBeNull()
    expect(
      within(utility as HTMLElement).getByRole('button', { name: '导出日志' })
    ).toBeInTheDocument()
  })

  it('exports the current log file from the header and shows success feedback', async () => {
    const user = userEvent.setup()
    render(<App />)

    await waitForOnboardingHome()
    await user.click(screen.getByRole('button', { name: '导出日志' }))

    expect(fixtures.runtime.exportCurrentLogCalls).toBe(1)
    expect(
      await screen.findByText(
        '日志已导出：/Users/juns/Desktop/sop-to-skill-log-2026-04-13-153000.log'
      )
    ).toBeInTheDocument()
  })

  it('shows export-log errors in the header feedback area', async () => {
    fixtures.runtime.exportCurrentLogResult = {
      error: '当前没有可导出的日志文件。',
    }
    const user = userEvent.setup()

    render(<App />)

    await waitForOnboardingHome()
    await user.click(screen.getByRole('button', { name: '导出日志' }))

    expect(fixtures.runtime.exportCurrentLogCalls).toBe(1)
    expect(await screen.findByText('导出日志失败：当前没有可导出的日志文件。')).toBeInTheDocument()
  })

  it('shows the hidden sop-to-skill data directory path on the update page', async () => {
    render(<App />)

    await waitForOnboardingHome()
    await act(async () => {
      fixtures.runtime.trayNavigateHandler?.({ payload: '/settings' })
    })

    await waitFor(() => {
      expect(screen.getByText('~/.sop-to-skill')).toBeInTheDocument()
    })
  })
})
