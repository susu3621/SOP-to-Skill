import { render, screen } from '@testing-library/react'
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
    currentVersion: '0.1.0',
    version: '0.2.0',
    body: 'Bug fixes and bundled skill updates.',
    date: '2026-04-02T00:00:00Z',
  }

  const runtime = {
    appUpdate: null as null | typeof appUpdate,
    installAppUpdateCalls: 0,
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
  invoke: vi.fn(async (command: string) => {
    switch (command) {
      case 'list_skills':
        return { success: [] }
      case 'list_installed':
        return { success: [] }
      case 'get_target_apps':
        return []
      case 'check_app_update':
        return fixtures.runtime.appUpdate
      case 'install_app_update':
        fixtures.runtime.installAppUpdateCalls += 1
        return true
      case 'get_config':
        return { success: { preferred_locale: 'zh-CN' } }
      case 'get_onboarding_state':
        return { success: fixtures.onboardingState }
      case 'set_onboarding_state':
        return { success: fixtures.onboardingState }
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
  listen: vi.fn(async () => () => {}),
}))

describe('onboarding shell smoke coverage', () => {
  beforeEach(() => {
    fixtures.runtime.appUpdate = null
    fixtures.runtime.installAppUpdateCalls = 0
  })

  it('opens the onboarding home menu instead of the legacy long-form shell', async () => {
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'SOP to Skill' })).toBeInTheDocument()
    expect(
      screen.getByText('把团队 SOP 整理成可复用、可安装的 AI Skills。')
    ).toBeInTheDocument()
    expect(document.title).toBe('SOP to Skill')
    expect(
      screen.queryByText('AI 时代先受益的，是每天被重复工作困住的人。')
    ).not.toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: '开始设置' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '检查更新' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '设置' })).not.toBeInTheDocument()
    expect(screen.queryByText('界面 Demo，暂不接入真实发送能力')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '基础信息设置' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '用例配置' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '安装技能' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '已设置内容' })).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: /Agent、岗位和基础技能/i })
    ).not.toBeInTheDocument()
  })

  it('shows an install action when a newer desktop app update is available', async () => {
    fixtures.runtime.appUpdate = fixtures.appUpdate
    const user = userEvent.setup()

    render(<App />)

    const installButton = await screen.findByRole('button', { name: /下载并安装更新/ })
    expect(screen.getByText('发现新版本 v0.2.0')).toBeInTheDocument()

    await user.click(installButton)

    expect(fixtures.runtime.installAppUpdateCalls).toBe(1)
  })
})
