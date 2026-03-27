import { render, screen } from '@testing-library/react'
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

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(async (command: string) => {
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

describe('OnboardingShell', () => {
  it('groups agent, role, and base-skill onboarding before any use-case edits', async () => {
    render(<App />)

    expect(
      await screen.findByRole('heading', { name: /Agent、岗位和基础技能/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Codex' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Claude Code' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '项目经理' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Jira' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Confluence' })).toBeInTheDocument()
  })

  it('shows role-scoped editors for every applicable use case and defaults generated packages to checked', async () => {
    render(<App />)

    expect(await screen.findByRole('heading', { name: '记录日志' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '记录日志' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '记录计划' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '项目周报' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: '项目周报 生产包' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: '项目周报 测试包' })).toBeChecked()
  })

  it('removes credential fields for a deselected base skill before sync and surfaces per-agent sync results on completion', async () => {
    const user = userEvent.setup()

    render(<App />)

    expect(await screen.findByRole('heading', { name: /Agent、岗位和基础技能/i })).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: 'Jira' }))

    expect(screen.queryByLabelText('Jira 用户名')).not.toBeInTheDocument()

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
