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
  it('guides a project manager through the 7-page flow and finishes with a completion screen', async () => {
    const user = userEvent.setup()

    render(<App />)

    expect(
      screen.getByRole('heading', { name: /给项目经理的周报准备助手/i })
    ).toBeInTheDocument()

    await user.click(screen.getByLabelText('项目经理'))
    await user.click(screen.getByRole('button', { name: '下一步' }))

    expect(
      screen.getByRole('heading', { name: /连接你已经在用的基础工具/i })
    ).toBeInTheDocument()

    await user.click(screen.getByLabelText('Jira'))
    await user.click(screen.getByLabelText('Confluence'))
    await user.click(screen.getByRole('button', { name: '下一步' }))

    expect(
      screen.getByRole('heading', { name: /目前已支持的用例/i })
    ).toBeInTheDocument()

    await user.click(screen.getByLabelText('发送周报'))
    await user.click(screen.getByRole('button', { name: '下一步' }))

    await user.type(
      screen.getByLabelText('项目清单来源链接'),
      'https://pm.example.com/projects'
    )
    await user.click(screen.getByRole('button', { name: '下一步' }))

    await user.type(
      screen.getByLabelText('周报规则或模板'),
      '请使用公司模板，并按风险、里程碑、资源状态三个部分组织。'
    )
    await user.click(screen.getByRole('button', { name: '下一步' }))

    expect(
      screen.getByRole('heading', { name: /补充账号与凭证/i })
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Jira 用户名')).toBeInTheDocument()
    expect(screen.getByLabelText('Jira 密码 / API Token')).toBeInTheDocument()
    expect(screen.getByLabelText('Confluence 用户名')).toBeInTheDocument()
    expect(screen.getByLabelText('Confluence 密码 / API Token')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Jira 用户名'), 'pm.jira')
    await user.type(screen.getByLabelText('Jira 密码 / API Token'), 'jira-secret')
    await user.type(screen.getByLabelText('Confluence 用户名'), 'pm.wiki')
    await user.type(
      screen.getByLabelText('Confluence 密码 / API Token'),
      'confluence-secret'
    )
    await user.click(screen.getByRole('button', { name: '完成设置' }))

    expect(screen.getByRole('heading', { name: '设置完成' })).toBeInTheDocument()
    expect(
      screen.getByText(/现在可以打开 WorkBuddy 来使用发送周报能力。/i)
    ).toBeInTheDocument()
    expect(screen.getByText('项目经理')).toBeInTheDocument()
    expect(screen.getByText('Jira、Confluence')).toBeInTheDocument()
  })

  it('shows credential fields only for the selected base skills', async () => {
    const user = userEvent.setup()

    render(<App />)

    await user.click(screen.getByLabelText('项目经理'))
    await user.click(screen.getByRole('button', { name: '下一步' }))
    await user.click(screen.getByLabelText('Jira'))
    await user.click(screen.getByRole('button', { name: '下一步' }))
    await user.click(screen.getByLabelText('发送周报'))
    await user.click(screen.getByRole('button', { name: '下一步' }))
    await user.type(
      screen.getByLabelText('项目清单来源链接'),
      'https://pm.example.com/projects'
    )
    await user.click(screen.getByRole('button', { name: '下一步' }))
    await user.type(screen.getByLabelText('周报规则或模板'), '沿用标准模板')
    await user.click(screen.getByRole('button', { name: '下一步' }))

    expect(screen.getByLabelText('Jira 用户名')).toBeInTheDocument()
    expect(screen.getByLabelText('Jira 密码 / API Token')).toBeInTheDocument()
    expect(screen.queryByLabelText('Confluence 用户名')).not.toBeInTheDocument()
    expect(
      screen.queryByLabelText('Confluence 密码 / API Token')
    ).not.toBeInTheDocument()
  })
})
