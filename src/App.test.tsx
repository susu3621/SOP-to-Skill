import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

describe('desktop configurator shell', () => {
  it('guides a user through the WorkBuddy wizard and shows a simulated result', async () => {
    const user = userEvent.setup()

    render(<App />)

    expect(
      screen.getByRole('heading', { name: /skill configurator/i })
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /开始配置/i }))
    await user.click(screen.getByRole('button', { name: /选择 workbuddy/i }))
    await user.click(screen.getByRole('button', { name: /下一步/i }))

    await user.click(screen.getByLabelText(/项目协作/i))
    await user.click(screen.getByRole('button', { name: /下一步/i }))

    await user.type(
      screen.getByLabelText(/工作目录/i),
      '/Users/demo/workbuddy-project'
    )
    await user.click(screen.getByRole('button', { name: /下一步/i }))

    expect(screen.getByRole('heading', { name: /配置摘要/i })).toBeInTheDocument()
    expect(screen.getByText('目标程序')).toBeInTheDocument()
    expect(screen.getByText(/项目协作/i)).toBeInTheDocument()
    expect(screen.getByText('/Users/demo/workbuddy-project')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /生成配置预览/i }))

    expect(
      screen.getByRole('heading', { name: /已生成模拟配置结果/i })
    ).toBeInTheDocument()
    expect(screen.getByText(/workbuddy 将使用以下配置摘要/i)).toBeInTheDocument()
    expect(screen.getByText('/Users/demo/workbuddy-project')).toBeInTheDocument()
  })

  it('marks future integrations as coming soon', async () => {
    const user = userEvent.setup()

    render(<App />)

    await user.click(screen.getByRole('button', { name: /开始配置/i }))

    expect(screen.getByRole('button', { name: /codex 即将支持/iu })).toBeDisabled()
    expect(
      screen.getByRole('button', { name: /claude code 即将支持/iu })
    ).toBeDisabled()
  })
})
