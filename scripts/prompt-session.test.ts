// @vitest-environment node

import { createRequire } from 'node:module'
import { PassThrough, Writable } from 'node:stream'

const require = createRequire(import.meta.url)

function flush() {
  return new Promise<void>((resolve) => setImmediate(resolve))
}

function loadPromptSession() {
  return require('./lib/prompt-session.cjs') as {
    createPromptSession: (streams?: {
      input?: NodeJS.ReadableStream
      output?: NodeJS.WritableStream
    }) => {
      close: () => void
      question: (prompt: string, defaultValue?: string) => Promise<string>
      questionHidden: (prompt: string) => Promise<string>
    }
  }
}

function createOutputBuffer() {
  let buffer = ''
  const output = new Writable({
    write(chunk, _encoding, callback) {
      buffer += chunk.toString()
      callback()
    },
  }) as Writable & { isTTY?: boolean }

  output.isTTY = true

  return {
    output,
    read() {
      return buffer
    },
  }
}

describe('createPromptSession', () => {
  it('continues with a text prompt after a hidden prompt without echoing the secret', async () => {
    const { createPromptSession } = loadPromptSession()
    const input = new PassThrough() as PassThrough & { isTTY?: boolean }
    input.isTTY = true

    const { output, read } = createOutputBuffer()
    const prompts = createPromptSession({ input, output })

    const jiraUsername = prompts.question('Jira 用户名', 'your.name@example.com')
    await flush()
    input.write('juns@example.com\n')
    await expect(jiraUsername).resolves.toBe('juns@example.com')

    const jiraPassword = prompts.questionHidden('Jira 密码 / API Token')
    await flush()
    input.write('123456\n')
    await expect(jiraPassword).resolves.toBe('123456')

    const confluenceUsername = prompts.question('Confluence 用户名', 'your.name@example.com')
    await flush()
    input.write('wiki@example.com\n')
    await expect(confluenceUsername).resolves.toBe('wiki@example.com')

    prompts.close()

    expect(read()).toContain('Confluence 用户名')
    expect(read()).not.toContain('123456')
  })
})
