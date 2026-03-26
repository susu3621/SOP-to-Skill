// @vitest-environment node

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

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

    execFileSync(installScript, ['jira', 'codex', customCodexRoot], {
      cwd: process.cwd(),
      env: process.env,
    })

    const installedSkillDir = path.join(customCodexRoot, 'jira')
    const installedSkillMd = fs.readFileSync(path.join(installedSkillDir, 'SKILL.md'), 'utf8')

    expect(fs.existsSync(installedSkillDir)).toBe(true)
    expect(installedSkillMd).toContain(installedSkillDir)
    expect(installedSkillMd).toContain(path.join(installedSkillDir, 'scripts'))

    execFileSync(uninstallScript, ['jira', 'codex', customCodexRoot], {
      cwd: process.cwd(),
      env: process.env,
    })

    expect(fs.existsSync(installedSkillDir)).toBe(false)
  })
})
