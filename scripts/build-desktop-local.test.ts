// @vitest-environment node

import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

function loadBuildDesktopLocal() {
  return require('./lib/build-desktop-local.cjs') as {
    buildLocalArtifactLayout: (input: { platform: 'macos' | 'windows'; repoRoot: string }) => {
      baseDir: string
      platformDir: string
    }
    runBuildDesktopLocal: (input: {
      targetPlatform: 'macos' | 'windows'
      system?: {
        assertMacPrerequisites?: () => void
        assertWindowsPrerequisites?: () => void
        copyFile?: (from: string, to: string) => void
        ensureTool?: (tool: string) => void
        findInstaller?: (input: { platform: 'macos' | 'windows'; repoRoot: string }) => string
        getPlatform?: () => string
        getRepoRoot?: () => string
        resetDir?: (dir: string) => void
        runTauriBuild?: (repoRoot: string) => void
      }
    }) => Promise<void>
  }
}

describe('local desktop build mode', () => {
  it('builds the default local artifact layout under artifacts/desktop/local/<platform>', () => {
    const { buildLocalArtifactLayout } = loadBuildDesktopLocal()

    expect(buildLocalArtifactLayout({ repoRoot: '/repo', platform: 'macos' })).toEqual({
      baseDir: path.join('/repo', 'artifacts', 'desktop', 'local'),
      platformDir: path.join('/repo', 'artifacts', 'desktop', 'local', 'macos'),
    })

    expect(buildLocalArtifactLayout({ repoRoot: '/repo', platform: 'windows' })).toEqual({
      baseDir: path.join('/repo', 'artifacts', 'desktop', 'local'),
      platformDir: path.join('/repo', 'artifacts', 'desktop', 'local', 'windows'),
    })
  })

  it('fails when the macOS local build runs on a non-macOS machine', async () => {
    const { runBuildDesktopLocal } = loadBuildDesktopLocal()

    await expect(
      runBuildDesktopLocal({
        targetPlatform: 'macos',
        system: {
          getPlatform: () => 'linux',
        },
      }),
    ).rejects.toThrow(/macOS/i)
  })

  it('fails when the Windows local build runs on a non-Windows machine', async () => {
    const { runBuildDesktopLocal } = loadBuildDesktopLocal()

    await expect(
      runBuildDesktopLocal({
        targetPlatform: 'windows',
        system: {
          getPlatform: () => 'darwin',
        },
      }),
    ).rejects.toThrow(/Windows/i)
  })

  it('fails with setup guidance when NSIS is missing for the Windows build', async () => {
    const { runBuildDesktopLocal } = loadBuildDesktopLocal()

    await expect(
      runBuildDesktopLocal({
        targetPlatform: 'windows',
        system: {
          getPlatform: () => 'win32',
          ensureTool() {},
          assertWindowsPrerequisites() {
            throw new Error('NSIS is required for Windows packaging. Install NSIS and make sure `makensis` is on PATH.')
          },
        },
      }),
    ).rejects.toThrow(/NSIS/i)
  })

  it('runs the macOS happy path and copies the dmg into artifacts/desktop/local/macos', async () => {
    const { runBuildDesktopLocal } = loadBuildDesktopLocal()
    const calls: Array<{ kind: string; value: string }> = []

    await runBuildDesktopLocal({
      targetPlatform: 'macos',
      system: {
        getPlatform: () => 'darwin',
        ensureTool(tool: string) {
          calls.push({ kind: 'tool', value: tool })
        },
        assertMacPrerequisites() {
          calls.push({ kind: 'prereq', value: 'macos' })
        },
        getRepoRoot: () => '/repo',
        runTauriBuild(repoRoot: string) {
          calls.push({ kind: 'build', value: repoRoot })
        },
        findInstaller() {
          return '/repo/src-tauri/target/release/bundle/dmg/sop-to-skill_0.1.0_aarch64.dmg'
        },
        resetDir(dir: string) {
          calls.push({ kind: 'reset', value: dir })
        },
        copyFile(from: string, to: string) {
          calls.push({ kind: 'copy', value: `${from} -> ${to}` })
        },
      },
    })

    expect(calls).toEqual([
      { kind: 'tool', value: 'cargo' },
      { kind: 'prereq', value: 'macos' },
      { kind: 'build', value: '/repo' },
      { kind: 'reset', value: '/repo/artifacts/desktop/local/macos' },
      {
        kind: 'copy',
        value:
          '/repo/src-tauri/target/release/bundle/dmg/sop-to-skill_0.1.0_aarch64.dmg -> /repo/artifacts/desktop/local/macos/sop-to-skill_0.1.0_aarch64.dmg',
      },
    ])
  })
})
