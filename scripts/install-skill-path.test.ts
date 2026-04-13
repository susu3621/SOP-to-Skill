// @vitest-environment node

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

function resolveWindowsBashCommand() {
  const candidates = [
    'C:\\Program Files\\Git\\bin\\bash.exe',
    'C:\\Program Files\\Git\\usr\\bin\\bash.exe',
  ]
  const gitLookup = execFileSync('where', ['git'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  })
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean)

  for (const gitPath of gitLookup) {
    const gitDir = path.dirname(gitPath)
    candidates.unshift(path.resolve(gitDir, '..', 'usr', 'bin', 'bash.exe'))
    candidates.unshift(path.resolve(gitDir, '..', 'bin', 'bash.exe'))
  }

  const bashPath = candidates.find((candidate) => fs.existsSync(candidate))
  if (!bashPath) {
    throw new Error('Git Bash is required on Windows to execute install-skill.sh.')
  }

  return bashPath
}

function toRenderedPath(value: string) {
  if (process.platform !== 'win32') {
    return value
  }

  return value.replace(/\\/g, '/').replace(/^([A-Za-z]):\//, (_, driveLetter: string) => {
    return `/${driveLetter.toLowerCase()}/`
  })
}

function runShellScript(scriptPath: string, args: string[]) {
  if (process.platform === 'win32') {
    const toShellPath = (value: string) =>
      value.replace(/\\/g, '/').replace(/^([A-Za-z]):\//, (_, driveLetter: string) => {
        return `/${driveLetter.toLowerCase()}/`
      })

    return execFileSync(resolveWindowsBashCommand(), [toShellPath(scriptPath), ...args.map(toShellPath)], {
      cwd: process.cwd(),
      env: process.env,
    })
  }

  return execFileSync(scriptPath, args, {
    cwd: process.cwd(),
    env: process.env,
  })
}

describe('install-skill.sh custom target root', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-install-root-'))
  })

  afterEach(() => {
    fs.rmSync(tempDir, { force: true, recursive: true })
  })

  it('installs and uninstalls a skill inside a provided target root', () => {
    const installScript = path.resolve('scripts/install-skill.sh')
    const uninstallScript = path.resolve('scripts/uninstall-skill.sh')
    const customCodexRoot = path.join(tempDir, '.codex', 'skills')

    runShellScript(installScript, ['jira', 'codex', customCodexRoot])

    const installedSkillDir = path.join(customCodexRoot, 'jira')
    const installedSkillMd = fs.readFileSync(path.join(installedSkillDir, 'SKILL.md'), 'utf8')

    expect(fs.existsSync(installedSkillDir)).toBe(true)
    expect(installedSkillMd).toContain(toRenderedPath(installedSkillDir))
    expect(installedSkillMd).toContain(toRenderedPath(path.join(installedSkillDir, 'scripts')))

    runShellScript(uninstallScript, ['jira', 'codex', customCodexRoot])

    expect(fs.existsSync(installedSkillDir)).toBe(false)
  })

  it('supports workbuddy as a custom installation target root', () => {
    const installScript = path.resolve('scripts/install-skill.sh')
    const uninstallScript = path.resolve('scripts/uninstall-skill.sh')
    const customWorkbuddyRoot = path.join(tempDir, '.workbuddy', 'skills')

    runShellScript(installScript, ['mail', 'workbuddy', customWorkbuddyRoot])

    const installedSkillDir = path.join(customWorkbuddyRoot, 'mail')
    const installedSkillMd = fs.readFileSync(path.join(installedSkillDir, 'SKILL.md'), 'utf8')

    expect(fs.existsSync(installedSkillDir)).toBe(true)
    expect(installedSkillMd).toContain(toRenderedPath(installedSkillDir))
    expect(installedSkillMd).toContain(toRenderedPath(path.join(installedSkillDir, 'scripts')))

    runShellScript(uninstallScript, ['mail', 'workbuddy', customWorkbuddyRoot])

    expect(fs.existsSync(installedSkillDir)).toBe(false)
  })

  it('treats uninstalling an already-missing target as a no-op', () => {
    const uninstallScript = path.resolve('scripts/uninstall-skill.sh')
    const customWorkbuddyRoot = path.join(tempDir, '.workbuddy', 'skills')

    expect(() => {
      runShellScript(uninstallScript, ['confluence', 'workbuddy', customWorkbuddyRoot])
    }).not.toThrow()
  })
})
