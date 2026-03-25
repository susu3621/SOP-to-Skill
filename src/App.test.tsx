import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

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
      default:
        return { success: null }
    }
  }),
}))

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(async () => () => {}),
}))

describe('workbuddy weekly report onboarding demo', () => {
  it('guides a project manager through the 8-page flow and finishes with a completion screen', async () => {
    const user = userEvent.setup()

    render(<App />)

    expect(
      screen.getByRole('heading', { name: /先选择你要使用的 Agent 应用/i })
    ).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: 'WorkBuddy' }))
    await user.click(screen.getByRole('checkbox', { name: 'Claude Code' }))
    await user.click(screen.getByRole('button', { name: '下一步' }))

    expect(screen.getByRole('heading', { name: /选择你的岗位/i })).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: '项目经理' }))
    await user.click(screen.getByRole('button', { name: '下一步' }))

    expect(
      screen.getByRole('heading', { name: /连接你已经在用的基础工具/i })
    ).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: 'Jira' }))
    await user.click(screen.getByRole('checkbox', { name: '销售易' }))
    await user.click(screen.getByRole('checkbox', { name: 'Notion' }))
    await user.click(screen.getByRole('button', { name: '下一步' }))

    expect(screen.getByRole('heading', { name: /岗位用例/i })).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: '项目周报' }))
    await user.click(screen.getByRole('button', { name: '下一步' }))

    await user.type(
      screen.getByLabelText('基础信息来源'),
      'Jira 项目看板、Confluence 项目主页、销售易商机页。'
    )
    await user.click(screen.getByRole('button', { name: '下一步' }))

    await user.type(
      screen.getByLabelText('用例规则或模板'),
      '请使用公司模板，并按风险、里程碑、资源状态三个部分组织。'
    )
    await user.click(screen.getByRole('button', { name: '下一步' }))

    expect(
      screen.getByRole('heading', { name: /补充账号与凭证/i })
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Jira 用户名')).toBeInTheDocument()
    expect(screen.getByLabelText('Jira 密码 / API Token')).toBeInTheDocument()
    expect(screen.getByLabelText('销售易 用户名')).toBeInTheDocument()
    expect(screen.getByLabelText('销售易 密码')).toBeInTheDocument()
    expect(screen.getByLabelText('Notion 用户邮箱')).toBeInTheDocument()
    expect(screen.getByLabelText('Notion 密码 / Integration Token')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Jira 用户名'), 'pm.jira')
    await user.type(screen.getByLabelText('Jira 密码 / API Token'), 'jira-secret')
    await user.type(screen.getByLabelText('销售易 用户名'), 'sales.owner')
    await user.type(screen.getByLabelText('销售易 密码'), 'sales-secret')
    await user.type(screen.getByLabelText('Notion 用户邮箱'), 'pm.wiki@example.com')
    await user.type(screen.getByLabelText('Notion 密码 / Integration Token'), 'notion-secret')
    await user.click(screen.getByRole('button', { name: '完成设置' }))

    expect(screen.getByRole('heading', { name: '设置完成' })).toBeInTheDocument()
    expect(
      screen.getByText(/现在可以在你选中的 Agent 应用里继续使用所选的岗位用例能力。/i)
    ).toBeInTheDocument()
    expect(screen.getAllByText('WorkBuddy、Claude Code').length).toBeGreaterThan(0)
    expect(screen.getAllByText('项目经理').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Jira、销售易、Notion').length).toBeGreaterThan(0)
  })

  it('shows credential fields only for the selected base skills', async () => {
    const user = userEvent.setup()

    render(<App />)

    await user.click(screen.getByRole('checkbox', { name: 'Codex' }))
    await user.click(screen.getByRole('button', { name: '下一步' }))
    await user.click(screen.getByRole('radio', { name: '项目经理' }))
    await user.click(screen.getByRole('button', { name: '下一步' }))
    await user.click(screen.getByRole('checkbox', { name: '禅道' }))
    await user.click(screen.getByRole('button', { name: '下一步' }))
    await user.click(screen.getByRole('radio', { name: '项目周报' }))
    await user.click(screen.getByRole('button', { name: '下一步' }))
    await user.type(
      screen.getByLabelText('基础信息来源'),
      '禅道项目列表、项目例会纪要目录。'
    )
    await user.click(screen.getByRole('button', { name: '下一步' }))
    await user.type(screen.getByLabelText('用例规则或模板'), '沿用标准模板')
    await user.click(screen.getByRole('button', { name: '下一步' }))

    expect(screen.getByLabelText('禅道 用户名')).toBeInTheDocument()
    expect(screen.getByLabelText('禅道 密码')).toBeInTheDocument()
    expect(screen.queryByLabelText('Jira 用户名')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('销售易 用户名')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Notion 用户邮箱')).not.toBeInTheDocument()
  })
})
