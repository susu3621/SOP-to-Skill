import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import type {
  InstalledSkillInfo,
  OnboardingAgentSyncResult,
  OnboardingBatchSyncResult,
  OnboardingEditableUseCaseRecord,
  OnboardingGeneratedSkillIds,
  OnboardingInstallCandidateGroup,
  OnboardingInstallPreview,
  OnboardingState,
} from './types'

function createDeferred() {
  let resolve!: () => void
  const promise = new Promise<void>((nextResolve) => {
    resolve = nextResolve
  })

  return { promise, resolve }
}

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
    uninstallSkillCalls: [] as Array<{ skillId: string; appId: string }>,
    exportCurrentLogCalls: 0,
    exportCurrentLogResult: {
      success: '/Users/juns/Desktop/sop-to-skill-log-2026-04-13-153000.log',
    } as { success?: string; error?: string },
    selectedDirectory: '/Users/shared/wiki',
    targetApps: [] as Array<{
      id: string
      name: string
      description: string
      status: string
    }>,
    preferredLocale: 'zh-CN' as 'zh-CN' | 'en-US',
    onboardingGuides: {
      'onboarding-home': { completed: true },
      'onboarding-basic': { completed: true },
      'onboarding-use-cases': { completed: true },
      'onboarding-install': { completed: true },
    } as Record<string, { completed: boolean }>,
    onboardingGuideUpdateGate: null as null | ReturnType<typeof createDeferred>,
    syncOnboardingInstallationHook: null as null | (() => void | Promise<void>),
    updatedLocales: [] as Array<'zh-CN' | 'en-US'>,
    trayNavigateHandler: null as null | ((event: { payload: string }) => void),
    skills: [] as Array<Record<string, unknown>>,
    installed: [] as InstalledSkillInfo[],
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
        return { success: fixtures.runtime.installed }
      case 'get_target_apps':
        return fixtures.runtime.targetApps
      case 'uninstall_skill':
        fixtures.runtime.uninstallSkillCalls.push({
          skillId: payload?.skillId,
          appId: payload?.appId,
        })
        fixtures.runtime.installed = fixtures.runtime.installed.filter(
          (skill) =>
            !(skill.skill_id === payload?.skillId && skill.app_id === payload?.appId)
        )
        const stillInstalled = fixtures.runtime.installed.some(
          (skill) => skill.skill_id === payload?.skillId
        )
        fixtures.runtime.skills = fixtures.runtime.skills
          .map((skill) => {
            if (skill.id !== payload?.skillId) {
              return skill
            }

            if (stillInstalled) {
              return skill
            }

            if (skill.can_install === false) {
              return null
            }

            return {
              ...skill,
              is_installed: false,
              installed_version: null,
              update_status: 'not-installed',
            }
          })
          .filter(Boolean) as Array<Record<string, unknown>>
        return { success: true }
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
      case 'select_directory':
        return fixtures.runtime.selectedDirectory
      case 'get_config':
        return {
          success: {
            preferred_locale: fixtures.runtime.preferredLocale,
            onboarding_guides: fixtures.runtime.onboardingGuides,
          },
        }
      case 'update_config':
        if (payload?.preferredLocale) {
          fixtures.runtime.preferredLocale = payload.preferredLocale
          fixtures.runtime.updatedLocales.push(payload.preferredLocale)
        }
        if (payload?.onboardingGuides) {
          if (fixtures.runtime.onboardingGuideUpdateGate) {
            await fixtures.runtime.onboardingGuideUpdateGate.promise
          }
          fixtures.runtime.onboardingGuides = payload.onboardingGuides
        }
        return {
          success: {
            preferred_locale: fixtures.runtime.preferredLocale,
            onboarding_guides: fixtures.runtime.onboardingGuides,
          },
        }
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
        if (fixtures.runtime.syncOnboardingInstallationHook) {
          await fixtures.runtime.syncOnboardingInstallationHook()
        }
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

  async function openSkillManagementFromMoreMenu(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: '更多操作' }))
    const moreMenuPanel = document.querySelector('.header-menu__panel')
    expect(moreMenuPanel).not.toBeNull()
    await user.click(within(moreMenuPanel as HTMLElement).getByRole('button', { name: 'Skill管理' }))
  }

  beforeEach(() => {
    fixtures.runtime.appUpdate = null
    fixtures.runtime.buildInfo = {
      currentVersion: '0.2.0',
      displayVersion: 'dd40e57',
    }
    fixtures.runtime.installAppUpdateCalls = 0
    fixtures.runtime.uninstallSkillCalls = []
    fixtures.runtime.exportCurrentLogCalls = 0
    fixtures.runtime.exportCurrentLogResult = {
      success: '/Users/juns/Desktop/sop-to-skill-log-2026-04-13-153000.log',
    }
    fixtures.runtime.selectedDirectory = '/Users/shared/wiki'
    fixtures.runtime.targetApps = []
    fixtures.runtime.preferredLocale = 'zh-CN'
    fixtures.runtime.onboardingGuides = {
      'onboarding-home': { completed: true },
      'onboarding-basic': { completed: true },
      'onboarding-use-cases': { completed: true },
      'onboarding-install': { completed: true },
    }
    fixtures.runtime.onboardingGuideUpdateGate = null
    fixtures.runtime.syncOnboardingInstallationHook = null
    fixtures.runtime.updatedLocales = []
    fixtures.runtime.trayNavigateHandler = null
    fixtures.runtime.skills = []
    fixtures.runtime.installed = []
  })

  it('opens the onboarding home menu instead of the legacy long-form shell', async () => {
    render(<App />)

    expect(await waitForOnboardingHome()).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        name: 'SOP 交给 AI 执行，省下时间去做真正有价值的事。',
      })
    ).toBeInTheDocument()
    expect(screen.getByText(/先绑定公司 IT 工具、岗位工作和 SOP，再把可执行 Skill 安装到 Codex、/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '检查更新' })).toBeInTheDocument()
    expect(document.querySelector('.shell__home')).toBeNull()
    const mastheadFooter = document.querySelector('.masthead__footer')
    expect(mastheadFooter).not.toBeNull()
    expect(within(mastheadFooter as HTMLElement).getByRole('button', { name: '返回首页' })).toBeInTheDocument()
    expect(within(mastheadFooter as HTMLElement).getByRole('button', { name: '更多操作' })).toBeInTheDocument()
    const headerNav = document.querySelector('.header-nav')
    expect(headerNav).not.toBeNull()
    expect(within(headerNav as HTMLElement).queryByRole('button', { name: '返回首页' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Skill管理' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '更多操作' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '已安装' })).not.toBeInTheDocument()
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
    const subtitle = document.querySelector('.masthead__subtitle')
    expect(subtitle).not.toBeNull()
    expect(window.getComputedStyle(subtitle as HTMLElement).whiteSpace).toBe('nowrap')
    expect(screen.getByText('Claude Code 或 WorkBuddy')).toHaveClass('masthead__subtitle-nowrap')
  })

  it('uses skill management wording in the empty skill management state', async () => {
    const user = userEvent.setup()
    render(<App />)

    await waitForOnboardingHome()
    await openSkillManagementFromMoreMenu(user)

    expect(screen.getByRole('heading', { name: 'Skill管理' })).toBeInTheDocument()
    expect(
      screen.getByText(
        '暂无可用 Skill。请将 Skill 目录包放到仓库的 `skills/` 目录，或应用数据目录中的 `skills/` 目录。'
      )
    ).toBeInTheDocument()
  })

  it('keeps installed-skill navigation out of the more menu', async () => {
    const user = userEvent.setup()
    render(<App />)

    await waitForOnboardingHome()
    await user.click(screen.getByRole('button', { name: '更多操作' }))
    const moreMenuPanel = document.querySelector('.header-menu__panel')
    expect(moreMenuPanel).not.toBeNull()
    expect(
      within(moreMenuPanel as HTMLElement).queryByRole('button', { name: '已安装 Skill' })
    ).not.toBeInTheDocument()
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
    await openSkillManagementFromMoreMenu(user)

    expect(screen.getByText('Gerrit')).toBeInTheDocument()
    expect(screen.getByText('SVN')).toBeInTheDocument()
    expect(screen.getAllByText('版本管理').length).toBeGreaterThan(0)
  })

  it('shows installed-state badges inside the skill management card grid', async () => {
    fixtures.runtime.skills = [
      {
        id: 'jira',
        name: {
          'zh-CN': 'Jira',
          'en-US': 'Jira',
        },
        description: {
          'zh-CN': '问题管理',
          'en-US': 'Issue tracking',
        },
        version: '1.0.0',
        category: 'version-management',
        author: null,
        targets: ['codex'],
        variables: [],
        is_installed: true,
        installed_version: '1.0.0',
        update_status: 'up-to-date',
        can_install: true,
      },
      {
        id: 'svn',
        name: {
          'zh-CN': 'SVN',
          'en-US': 'SVN',
        },
        description: {
          'zh-CN': '版本库',
          'en-US': 'Repository',
        },
        version: '1.0.0',
        category: 'version-management',
        author: null,
        targets: ['codex'],
        variables: [],
        is_installed: false,
        installed_version: null,
        update_status: 'not-installed',
        can_install: true,
      },
    ]
    const user = userEvent.setup()

    render(<App />)

    await waitForOnboardingHome()
    await openSkillManagementFromMoreMenu(user)

    const grid = document.querySelector('.skills-grid')
    expect(grid).not.toBeNull()
    expect(within(grid as HTMLElement).getByText('已安装')).toBeInTheDocument()
    expect(within(grid as HTMLElement).getByText('未安装')).toBeInTheDocument()
  })

  it('shows installed-only local skills in skill management and deletes them from detail', async () => {
    fixtures.runtime.skills = [
      {
        id: 'project-manager-weekly-report',
        name: {
          'zh-CN': '项目周报 Skill',
          'en-US': 'Weekly Report Skill',
        },
        description: {
          'zh-CN': '本地生成并已安装的项目周报 Skill',
          'en-US': 'A locally generated and installed weekly report skill.',
        },
        version: 'local',
        category: null,
        author: null,
        targets: ['codex'],
        variables: [],
        is_installed: true,
        installed_version: 'local',
        update_status: 'unknown',
        can_install: false,
      },
    ]
    fixtures.runtime.installed = [
      {
        skill_id: 'project-manager-weekly-report',
        app_id: 'codex',
        app_name: 'Codex',
        installed_version: 'local',
        installed_at: '2026-04-17T14:00:00Z',
        output_path: '~/.codex/skills/project-manager-weekly-report',
      },
    ]
    const user = userEvent.setup()

    render(<App />)

    await waitForOnboardingHome()
    await openSkillManagementFromMoreMenu(user)
    await user.click(screen.getByText('项目周报 Skill'))

    expect(
      screen.getByRole('heading', { name: '项目周报 Skill' })
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '重新安装' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '删除 Skill' }))

    expect(fixtures.runtime.uninstallSkillCalls).toEqual([
      { skillId: 'project-manager-weekly-report', appId: 'codex' },
    ])
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Skill管理' })).toBeInTheDocument()
    })
    expect(screen.getByText('暂无可用 Skill。请将 Skill 目录包放到仓库的 `skills/` 目录，或应用数据目录中的 `skills/` 目录。')).toBeInTheDocument()
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
    expect(document.querySelector('.shell__home')).toBeNull()
    const mastheadFooter = document.querySelector('.masthead__footer')
    expect(mastheadFooter).not.toBeNull()
    expect(within(mastheadFooter as HTMLElement).getByRole('button', { name: 'Back to home' })).toBeInTheDocument()
    expect(within(mastheadFooter as HTMLElement).getByRole('button', { name: 'More actions' })).toBeInTheDocument()
    const headerNav = document.querySelector('.header-nav')
    expect(headerNav).not.toBeNull()
    expect(within(headerNav as HTMLElement).queryByRole('button', { name: 'Back to home' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Skill Management' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'More actions' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Company IT Tools' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Configure AI Work' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Install into AI Tool' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '选择公司 IT 工具' })).not.toBeInTheDocument()
    const subtitle = document.querySelector('.masthead__subtitle')
    expect(subtitle).not.toBeNull()
    expect(window.getComputedStyle(subtitle as HTMLElement).whiteSpace).toBe('nowrap')
    expect(screen.getByText('Claude Code, or WorkBuddy')).toHaveClass('masthead__subtitle-nowrap')
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
    await user.click(screen.getByRole('button', { name: '更多操作' }))
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

  it('shows secondary navigation and locale actions inside the more menu', async () => {
    const user = userEvent.setup()
    render(<App />)

    await waitForOnboardingHome()

    await user.click(screen.getByRole('button', { name: '更多操作' }))
    const moreMenuPanel = document.querySelector('.header-menu__panel')
    expect(moreMenuPanel).not.toBeNull()

    expect(within(moreMenuPanel as HTMLElement).getByRole('button', { name: '查看引导' })).toBeInTheDocument()
    expect(within(moreMenuPanel as HTMLElement).getByRole('button', { name: 'Skill管理' })).toBeInTheDocument()
    expect(
      within(moreMenuPanel as HTMLElement).queryByRole('button', { name: '已安装 Skill' })
    ).not.toBeInTheDocument()
    expect(within(moreMenuPanel as HTMLElement).getByRole('button', { name: '导出日志' })).toBeInTheDocument()
    expect(within(moreMenuPanel as HTMLElement).getByRole('button', { name: '中文' })).toBeInTheDocument()
    expect(within(moreMenuPanel as HTMLElement).getByRole('button', { name: 'English' })).toBeInTheDocument()
  })

  it('opens the skill management page from the more menu entry', async () => {
    const user = userEvent.setup()
    render(<App />)

    await waitForOnboardingHome()
    await openSkillManagementFromMoreMenu(user)

    expect(screen.getByRole('heading', { name: 'Skill管理' })).toBeInTheDocument()
  })

  it('replays the floating first-run guide flow from the more menu view-guide action', async () => {
    const user = userEvent.setup()
    render(<App />)

    await waitForOnboardingHome()
    await openSkillManagementFromMoreMenu(user)
    expect(screen.getByRole('heading', { name: 'Skill管理' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '更多操作' }))
    await user.click(screen.getByRole('button', { name: '查看引导' }))

    expect(await waitForOnboardingHome()).toBeInTheDocument()
    expect(screen.getByText('第 1 步 / 共 3 步')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '先选公司 IT 工具' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '下一步' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '开始设置' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '下一步' }))

    expect(screen.getByText('第 2 步 / 共 3 步')).toBeInTheDocument()
    expect(fixtures.runtime.onboardingGuides).toEqual({
      'onboarding-home': { completed: false },
      'onboarding-basic': { completed: false },
      'onboarding-use-cases': { completed: false },
      'onboarding-install': { completed: false },
    })
  })

  it('keeps the completed home guide hidden when returning from skill management before config persistence finishes', async () => {
    const user = userEvent.setup()
    const pendingGuideUpdate = createDeferred()
    fixtures.runtime.onboardingGuides = {
      'onboarding-home': { completed: false },
      'onboarding-basic': { completed: true },
      'onboarding-use-cases': { completed: true },
      'onboarding-install': { completed: true },
    }
    fixtures.runtime.onboardingGuideUpdateGate = pendingGuideUpdate

    render(<App />)

    expect(await screen.findByText('第 1 步 / 共 3 步')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '下一步' }))
    await user.click(screen.getByRole('button', { name: '下一步' }))
    await user.click(screen.getByRole('button', { name: '下一步' }))

    await waitFor(() => {
      expect(screen.queryByText('第 3 步 / 共 3 步')).not.toBeInTheDocument()
    })

    await openSkillManagementFromMoreMenu(user)
    expect(screen.getByRole('heading', { name: 'Skill管理' })).toBeInTheDocument()

    const mastheadFooter = document.querySelector('.masthead__footer')
    expect(mastheadFooter).not.toBeNull()
    await user.click(within(mastheadFooter as HTMLElement).getByRole('button', { name: '返回首页' }))

    expect(await waitForOnboardingHome()).toBeInTheDocument()
    expect(screen.queryByText('第 1 步 / 共 3 步')).not.toBeInTheDocument()

    await act(async () => {
      pendingGuideUpdate.resolve()
      await pendingGuideUpdate.promise
    })
  })

  it('refreshes installed and generated skills after onboarding sync so skill management shows them', async () => {
    const user = userEvent.setup()
    fixtures.runtime.skills = []
    fixtures.runtime.installed = []
    fixtures.runtime.syncOnboardingInstallationHook = () => {
      fixtures.runtime.skills = [
        {
          id: 'project-manager-weekly-report',
          name: {
            'zh-CN': '项目周报 Skill',
            'en-US': 'Weekly Report Skill',
          },
          description: {
            'zh-CN': '本地生成并已安装的项目周报 Skill',
            'en-US': 'A locally generated and installed weekly report skill.',
          },
          version: 'local',
          category: null,
          author: null,
          targets: ['codex'],
          variables: [],
          is_installed: true,
          installed_version: 'local',
          update_status: 'unknown',
          can_install: false,
        },
      ]
      fixtures.runtime.installed = [
        {
          skill_id: 'project-manager-weekly-report',
          app_id: 'codex',
          app_name: 'Codex',
          installed_version: 'local',
          installed_at: '2026-04-17T18:00:00Z',
          output_path: '~/.codex/skills/project-manager-weekly-report',
        },
      ]
    }

    render(<App />)

    expect(await waitForOnboardingHome()).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '安装到 AI 工具' }))
    await user.click(screen.getByRole('button', { name: '开始同步安装' }))

    expect(await screen.findByText('同步完成')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Skill管理 (1)' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Skill管理 (1)' }))

    expect(await screen.findByRole('heading', { name: 'Skill管理' })).toBeInTheDocument()
    expect(screen.getByText('项目周报 Skill')).toBeInTheDocument()
  })

  it('renders the current version before the update action in the header', async () => {
    render(<App />)

    await waitForOnboardingHome()

    const updateArea = document.querySelector('.masthead__update')
    expect(updateArea).not.toBeNull()

    const version = within(updateArea as HTMLElement).getByText('当前版本 dd40e57')
    const button = within(updateArea as HTMLElement).getByRole('button', { name: '检查更新' })

    expect(version.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('shows an export-log action inside the more menu', async () => {
    const user = userEvent.setup()
    render(<App />)

    await waitForOnboardingHome()

    await user.click(screen.getByRole('button', { name: '更多操作' }))

    expect(screen.getByRole('button', { name: '导出日志' })).toBeInTheDocument()
  })

  it('exports the current log file from the header and shows success feedback', async () => {
    const user = userEvent.setup()
    render(<App />)

    await waitForOnboardingHome()
    await user.click(screen.getByRole('button', { name: '更多操作' }))
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
    await user.click(screen.getByRole('button', { name: '更多操作' }))
    await user.click(screen.getByRole('button', { name: '导出日志' }))

    expect(fixtures.runtime.exportCurrentLogCalls).toBe(1)
    expect(await screen.findByText('导出日志失败：当前没有可导出的日志文件。')).toBeInTheDocument()
  })

  it('shows a contextual masthead return-home action when onboarding sub-pages are open', async () => {
    const user = userEvent.setup()
    render(<App />)

    await waitForOnboardingHome()
    await user.click(screen.getByRole('button', { name: '选择公司 IT 工具' }))

    const mastheadFooter = document.querySelector('.masthead__footer')
    expect(mastheadFooter).not.toBeNull()
    expect(
      within(mastheadFooter as HTMLElement).getByRole('button', { name: '返回首页' })
    ).toBeInTheDocument()

    await user.click(within(mastheadFooter as HTMLElement).getByRole('button', { name: '返回首页' }))

    expect(await waitForOnboardingHome()).toBeInTheDocument()
  })

  it('deletes an installed skill from skill management using the existing uninstall flow', async () => {
    fixtures.runtime.skills = [
      {
        id: 'jira',
        name: {
          'zh-CN': 'Jira',
          'en-US': 'Jira',
        },
        description: {
          'zh-CN': '问题管理',
          'en-US': 'Issue tracking',
        },
        version: '1.0.0',
        category: 'version-management',
        author: null,
        targets: ['codex'],
        variables: [],
        is_installed: true,
        installed_version: '1.0.0',
        update_status: 'up-to-date',
        can_install: true,
      },
    ]
    fixtures.runtime.installed = [
      {
        skill_id: 'jira',
        app_id: 'codex',
        app_name: 'Codex',
        installed_version: '1.0.0',
        installed_at: '2026-04-17T14:00:00Z',
        output_path: '~/.codex/skills/jira',
      },
    ]
    const user = userEvent.setup()
    render(<App />)

    await waitForOnboardingHome()
    await openSkillManagementFromMoreMenu(user)
    await user.click(screen.getByText('Jira'))

    await user.click(screen.getByRole('button', { name: '删除 Skill' }))

    expect(fixtures.runtime.uninstallSkillCalls).toEqual([{ skillId: 'jira', appId: 'codex' }])
    await waitFor(() => {
      expect(screen.getByText('未安装')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: '安装' })).toBeInTheDocument()
  })

  it('lets users choose a folder for path variables in the install wizard', async () => {
    fixtures.runtime.targetApps = [
      {
        id: 'codex',
        name: 'Codex',
        description: 'Install into Codex',
        status: 'available',
      },
    ]
    fixtures.runtime.skills = [
      {
        id: 'local-filesystem',
        name: {
          'zh-CN': '本地文件系统',
          'en-US': 'Local Filesystem',
        },
        description: {
          'zh-CN': '读取并写入本机目录中的 SOP、项目文档和会议纪要',
          'en-US': 'Read and write SOPs, project docs, and meeting notes.',
        },
        version: '1.0.0',
        category: 'host-ops',
        author: null,
        targets: ['codex'],
        variables: [
          {
            id: 'localFilesystemPath',
            label: {
              'zh-CN': '本地文件路径',
              'en-US': 'Local Filesystem Path',
            },
            var_type: 'path',
            required: true,
            placeholder: {
              'zh-CN': '/Users/shared/wiki',
              'en-US': '/Users/shared/wiki',
            },
            options: [],
          },
        ],
        is_installed: false,
        installed_version: null,
        update_status: 'not-installed',
        can_install: true,
      },
    ]
    const user = userEvent.setup()

    render(<App />)

    await waitForOnboardingHome()
    await openSkillManagementFromMoreMenu(user)
    await user.click(screen.getByText('本地文件系统'))
    await user.click(screen.getByRole('button', { name: '安装' }))
    await user.click(screen.getByRole('button', { name: '下一步' }))

    const pathInput = screen.getByLabelText('本地文件路径')
    expect(pathInput).toHaveAttribute('readonly')

    await user.click(screen.getByRole('button', { name: '选择文件夹' }))

    expect(pathInput).toHaveValue('/Users/shared/wiki')
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
