// @vitest-environment node

import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { vi } from 'vitest'

const require = createRequire(import.meta.url)

afterEach(() => {
  vi.restoreAllMocks()
})

function loadBuildDesktopAll() {
  return require('./lib/build-desktop-all.cjs') as {
    assertRequiredArtifacts: (artifacts: Array<{ name: string }>) => void
    buildArtifactLayout: (input: { repoRoot: string; runId: number }) => {
      baseDir: string
      macosDir: string
      manifestPath: string
      windowsDir: string
    }
    buildManifest: (input: {
      branch: string
      buildCommitSha: string
      downloadedAt: string
      localHeadSha: string
      layout: {
        macosDir: string
        windowsDir: string
      }
      runId: number
      workflowFile: string
    }) => {
      artifacts: {
        macos: { name: string; path: string }
        windows: { name: string; path: string }
      }
      branch: string
      buildCommitSha: string
      downloadedAt: string
      localHeadSha: string
      runId: number
      workflowFile: string
    }
    buildWorkflowRunArgs: (input: { branch: string; workflowFile: string }) => string[]
    createNodeSystem: () => {
      remoteWorkflowExists: (input: { branch: string; workflowFile: string }) => boolean
      waitForRunCompletion: (input: { runId: number }) => Promise<{
        artifacts?: Array<{ name: string }>
        conclusion: string
      }>
    }
    selectWorkflowRun: (
      runs: Array<{
        createdAt: string
        event: string
        headBranch: string
        headSha: string
        id: number
        workflowName: string
      }>,
      input: {
        branch: string
        expectedHeadSha: string
        triggerTime: string
        workflowName: string
      },
    ) => number
    runBuildDesktopAll: (input?: {
      system?: {
        assertGitHubAuth?: () => void
        now?: () => string
        downloadArtifact?: (input: {
          artifactName: string
          outputDir: string
          runId: number
        }) => void
        ensureDir?: (dir: string) => void
        ensureTool?: (tool: string) => void
        getCurrentBranch?: () => string
        getHeadSha?: () => string
        getRemoteBranchSha?: (branch: string) => string | null
        getRepoRoot?: () => string
        listWorkflowRuns?: () => Array<{
          createdAt: string
          event: string
          headBranch: string
          headSha: string
          id: number
          workflowName: string
        }>
        remoteWorkflowExists?: (input: { branch: string; workflowFile: string }) => boolean
        sleep?: (milliseconds: number) => Promise<void> | void
        triggerWorkflow?: (input: { branch: string; workflowFile: string }) => string | void
        waitForRunCompletion?: (input: { runId: number }) => {
          artifacts?: Array<{ name: string }>
          conclusion: string
          status?: string
        }
        writeJson?: (path: string, value: unknown) => void
      }
    }) => Promise<void>
  }
}

describe('build desktop all workflow dispatch', () => {
  it('builds gh workflow dispatch args with --ref for the current branch', () => {
    const { buildWorkflowRunArgs } = loadBuildDesktopAll()

    expect(
      buildWorkflowRunArgs({ branch: 'feat/desktop-windows-build', workflowFile: 'build-desktop.yml' }),
    ).toEqual([
      'workflow',
      'run',
      'build-desktop.yml',
      '--ref',
      'feat/desktop-windows-build',
      '-f',
      'release_build=false',
    ])
  })

  it('selects only the workflow_dispatch run that matches branch, sha, and trigger time', () => {
    const { selectWorkflowRun } = loadBuildDesktopAll()

    expect(
      selectWorkflowRun(
        [
          {
            id: 11,
            workflowName: 'Build Desktop Scaffold',
            event: 'workflow_dispatch',
            headBranch: 'feat/desktop-windows-build',
            headSha: 'older-sha',
            createdAt: '2026-03-28T09:00:00Z',
          },
          {
            id: 12,
            workflowName: 'Build Desktop Scaffold',
            event: 'workflow_dispatch',
            headBranch: 'feat/desktop-windows-build',
            headSha: 'target-sha',
            createdAt: '2026-03-28T10:00:01Z',
          },
        ],
        {
          branch: 'feat/desktop-windows-build',
          expectedHeadSha: 'target-sha',
          triggerTime: '2026-03-28T10:00:00Z',
          workflowName: 'Build Desktop Scaffold',
        },
      ),
    ).toBe(12)
  })

  it('selects the earliest qualifying run regardless of caller-provided order', () => {
    const { selectWorkflowRun } = loadBuildDesktopAll()

    expect(
      selectWorkflowRun(
        [
          {
            id: 22,
            workflowName: 'Build Desktop Scaffold',
            event: 'workflow_dispatch',
            headBranch: 'feat/desktop-windows-build',
            headSha: 'target-sha',
            createdAt: '2026-03-28T10:00:02Z',
          },
          {
            id: 21,
            workflowName: 'Build Desktop Scaffold',
            event: 'workflow_dispatch',
            headBranch: 'feat/desktop-windows-build',
            headSha: 'target-sha',
            createdAt: '2026-03-28T10:00:01Z',
          },
        ],
        {
          branch: 'feat/desktop-windows-build',
          expectedHeadSha: 'target-sha',
          triggerTime: '2026-03-28T10:00:00Z',
          workflowName: 'Build Desktop Scaffold',
        },
      ),
    ).toBe(21)
  })

  it('breaks ties on createdAt by choosing the smaller workflow run id', () => {
    const { selectWorkflowRun } = loadBuildDesktopAll()

    expect(
      selectWorkflowRun(
        [
          {
            id: 32,
            workflowName: 'Build Desktop Scaffold',
            event: 'workflow_dispatch',
            headBranch: 'feat/desktop-windows-build',
            headSha: 'target-sha',
            createdAt: '2026-03-28T10:00:01Z',
          },
          {
            id: 31,
            workflowName: 'Build Desktop Scaffold',
            event: 'workflow_dispatch',
            headBranch: 'feat/desktop-windows-build',
            headSha: 'target-sha',
            createdAt: '2026-03-28T10:00:01Z',
          },
        ],
        {
          branch: 'feat/desktop-windows-build',
          expectedHeadSha: 'target-sha',
          triggerTime: '2026-03-28T10:00:00Z',
          workflowName: 'Build Desktop Scaffold',
        },
      ),
    ).toBe(31)
  })

  it('builds the default artifact layout under artifacts/desktop/<run-id>', () => {
    const { buildArtifactLayout } = loadBuildDesktopAll()
    const baseDir = path.join('/repo', 'artifacts', 'desktop', '42')

    expect(buildArtifactLayout({ repoRoot: '/repo', runId: 42 })).toEqual({
      baseDir,
      macosDir: path.join(baseDir, 'macos'),
      windowsDir: path.join(baseDir, 'windows'),
      manifestPath: path.join(baseDir, 'manifest.json'),
    })
  })

  it('fails when desktop-macos or desktop-windows is missing from the run artifacts', () => {
    const { assertRequiredArtifacts } = loadBuildDesktopAll()

    expect(() => assertRequiredArtifacts([{ name: 'desktop-macos' }])).toThrow(/desktop-windows/)
  })

  it('writes a manifest with both the matched remote build sha and the local head sha', () => {
    const { buildManifest } = loadBuildDesktopAll()
    const baseDir = path.join('/repo', 'artifacts', 'desktop', '42')
    const macosDir = path.join(baseDir, 'macos')
    const windowsDir = path.join(baseDir, 'windows')

    expect(
      buildManifest({
        workflowFile: 'build-desktop.yml',
        runId: 42,
        branch: 'feat/desktop-windows-build',
        buildCommitSha: 'remote-sha',
        localHeadSha: 'local-sha',
        downloadedAt: '2026-03-28T10:05:00Z',
        layout: {
          macosDir,
          windowsDir,
        },
      }),
    ).toMatchObject({
      workflowFile: 'build-desktop.yml',
      runId: 42,
      branch: 'feat/desktop-windows-build',
      buildCommitSha: 'remote-sha',
      localHeadSha: 'local-sha',
      downloadedAt: '2026-03-28T10:05:00Z',
      artifacts: {
        macos: { name: 'desktop-macos', path: macosDir },
        windows: { name: 'desktop-windows', path: windowsDir },
      },
    })
  })

  it('fails fast when gh is not available', async () => {
    const { runBuildDesktopAll } = loadBuildDesktopAll()

    await expect(
      runBuildDesktopAll({
        system: {
          ensureTool(tool: string) {
            if (tool === 'gh') {
              throw new Error('Missing required tool: gh')
            }
          },
        },
      }),
    ).rejects.toThrow('Missing required tool: gh')
  })

  it('fails when GitHub CLI is not authenticated', async () => {
    const { runBuildDesktopAll } = loadBuildDesktopAll()

    await expect(
      runBuildDesktopAll({
        system: {
          ensureTool() {},
          assertGitHubAuth() {
            throw new Error('GitHub CLI is not authenticated')
          },
        },
      }),
    ).rejects.toThrow('GitHub CLI is not authenticated')
  })

  it('fails when the remote branch is missing', async () => {
    const { runBuildDesktopAll } = loadBuildDesktopAll()

    await expect(
      runBuildDesktopAll({
        system: {
          ensureTool() {},
          assertGitHubAuth() {},
          getRepoRoot: () => '/repo',
          getCurrentBranch: () => 'feat/desktop-windows-build',
          getHeadSha: () => 'local-sha',
          getRemoteBranchSha: () => null,
        },
      }),
    ).rejects.toThrow(/remote branch/i)
  })

  it('fails when the remote branch does not point at the current local HEAD', async () => {
    const { runBuildDesktopAll } = loadBuildDesktopAll()

    await expect(
      runBuildDesktopAll({
        system: {
          ensureTool() {},
          assertGitHubAuth() {},
          getRepoRoot: () => '/repo',
          getCurrentBranch: () => 'feat/desktop-windows-build',
          getHeadSha: () => 'local-sha',
          getRemoteBranchSha: () => 'remote-sha',
        },
      }),
    ).rejects.toThrow(/origin\/feat\/desktop-windows-build/i)
  })

  it('fails when the workflow file is missing on the remote branch', async () => {
    const { runBuildDesktopAll } = loadBuildDesktopAll()

    await expect(
      runBuildDesktopAll({
        system: {
          ensureTool() {},
          assertGitHubAuth() {},
          getRepoRoot: () => '/repo',
          getCurrentBranch: () => 'feat/desktop-windows-build',
          getHeadSha: () => 'local-sha',
          getRemoteBranchSha: () => 'local-sha',
          remoteWorkflowExists: () => false,
        },
      }),
    ).rejects.toThrow(/build-desktop\.yml/)
  })

  it('runs the happy path and downloads both explicit artifacts into separate directories', async () => {
    const { runBuildDesktopAll } = loadBuildDesktopAll()
    const downloads: Array<{ artifactName: string; outputDir: string }> = []
    const writes: Array<{ path: string; value: unknown }> = []
    let listCalls = 0

    await runBuildDesktopAll({
      system: {
        now: () => '2026-03-28T10:00:00Z',
        ensureTool() {},
        assertGitHubAuth() {},
        getRepoRoot: () => '/repo',
        getCurrentBranch: () => 'feat/desktop-windows-build',
        getHeadSha: () => 'remote-sha',
        getRemoteBranchSha: () => 'remote-sha',
        remoteWorkflowExists: () => true,
        triggerWorkflow() {},
        listWorkflowRuns: () => {
          listCalls += 1

          if (listCalls === 1) {
            return []
          }

          return [
            {
              id: 42,
              workflowName: 'Build Desktop Scaffold',
              event: 'workflow_dispatch',
              headBranch: 'feat/desktop-windows-build',
              headSha: 'remote-sha',
              createdAt: '2026-03-28T10:00:01Z',
            },
          ]
        },
        waitForRunCompletion: () => ({
          conclusion: 'success',
          status: 'completed',
        }),
        ensureDir() {},
        downloadArtifact(input: { artifactName: string; outputDir: string }) {
          downloads.push(input)
        },
        writeJson(path: string, value: unknown) {
          writes.push({ path, value })
        },
      },
    })

    expect(downloads).toEqual([
      { artifactName: 'desktop-macos', outputDir: '/repo/artifacts/desktop/42/macos' },
      { artifactName: 'desktop-windows', outputDir: '/repo/artifacts/desktop/42/windows' },
    ])
    expect(writes[0]?.path).toBe('/repo/artifacts/desktop/42/manifest.json')
  })

  it('uses the dispatched run url when gh returns one', async () => {
    const { runBuildDesktopAll } = loadBuildDesktopAll()
    let listCalls = 0
    let waitedRunId: number | undefined

    await runBuildDesktopAll({
      system: {
        now: () => '2026-03-28T10:00:00Z',
        ensureTool() {},
        assertGitHubAuth() {},
        getRepoRoot: () => '/repo',
        getCurrentBranch: () => 'feat/desktop-windows-build',
        getHeadSha: () => 'remote-sha',
        getRemoteBranchSha: () => 'remote-sha',
        remoteWorkflowExists: () => true,
        triggerWorkflow: () => 'https://github.com/acme/repo/actions/runs/77',
        listWorkflowRuns: () => {
          listCalls += 1
          return []
        },
        waitForRunCompletion: ({ runId }) => {
          waitedRunId = runId
          return {
            conclusion: 'success',
            status: 'completed',
          }
        },
        ensureDir() {},
        downloadArtifact() {},
        writeJson() {},
      },
    })

    expect(waitedRunId).toBe(77)
    expect(listCalls).toBe(1)
  })

  it('polls workflow runs until the dispatched run appears', async () => {
    const { runBuildDesktopAll } = loadBuildDesktopAll()
    const sleeps: number[] = []
    let listCalls = 0
    let waitedRunId: number | undefined

    await runBuildDesktopAll({
      system: {
        now: () => '2026-03-28T10:00:00Z',
        ensureTool() {},
        assertGitHubAuth() {},
        getRepoRoot: () => '/repo',
        getCurrentBranch: () => 'feat/desktop-windows-build',
        getHeadSha: () => 'remote-sha',
        getRemoteBranchSha: () => 'remote-sha',
        remoteWorkflowExists: () => true,
        triggerWorkflow: () => 'workflow dispatched',
        listWorkflowRuns: () => {
          listCalls += 1

          if (listCalls === 1) {
            return []
          }

          return [
            {
              id: 42,
              workflowName: 'Build Desktop Scaffold',
              event: 'workflow_dispatch',
              headBranch: 'feat/desktop-windows-build',
              headSha: 'remote-sha',
              createdAt: '2026-03-28T10:00:01Z',
            },
          ]
        },
        sleep(milliseconds: number) {
          sleeps.push(milliseconds)
        },
        waitForRunCompletion: ({ runId }) => {
          waitedRunId = runId
          return {
            conclusion: 'success',
            status: 'completed',
          }
        },
        ensureDir() {},
        downloadArtifact() {},
        writeJson() {},
      },
    })

    expect(listCalls).toBe(2)
    expect(sleeps).toEqual([])
    expect(waitedRunId).toBe(42)
  })

  it('ignores matching workflow runs that already existed before dispatch', async () => {
    const { runBuildDesktopAll } = loadBuildDesktopAll()
    const sleeps: number[] = []
    let listCalls = 0
    let waitedRunId: number | undefined

    await runBuildDesktopAll({
      system: {
        now: () => '2026-03-28T10:00:00Z',
        ensureTool() {},
        assertGitHubAuth() {},
        getRepoRoot: () => '/repo',
        getCurrentBranch: () => 'feat/desktop-windows-build',
        getHeadSha: () => 'remote-sha',
        getRemoteBranchSha: () => 'remote-sha',
        remoteWorkflowExists: () => true,
        triggerWorkflow: () => 'workflow dispatched',
        listWorkflowRuns: () => {
          listCalls += 1

          if (listCalls === 1) {
            return [
              {
                id: 41,
                workflowName: 'Build Desktop Scaffold',
                event: 'workflow_dispatch',
                headBranch: 'feat/desktop-windows-build',
                headSha: 'remote-sha',
                createdAt: '2026-03-28T09:59:59Z',
              },
            ]
          }

          return [
            {
              id: 41,
              workflowName: 'Build Desktop Scaffold',
              event: 'workflow_dispatch',
              headBranch: 'feat/desktop-windows-build',
              headSha: 'remote-sha',
              createdAt: '2026-03-28T09:59:59Z',
            },
            {
              id: 42,
              workflowName: 'Build Desktop Scaffold',
              event: 'workflow_dispatch',
              headBranch: 'feat/desktop-windows-build',
              headSha: 'remote-sha',
              createdAt: '2026-03-28T09:59:58Z',
            },
          ]
        },
        sleep(milliseconds: number) {
          sleeps.push(milliseconds)
        },
        waitForRunCompletion: ({ runId }) => {
          waitedRunId = runId
          return {
            conclusion: 'success',
            status: 'completed',
          }
        },
        ensureDir() {},
        downloadArtifact() {},
        writeJson() {},
      },
    })

    expect(listCalls).toBe(2)
    expect(sleeps).toEqual([])
    expect(waitedRunId).toBe(42)
  })

  it('keeps polling long enough for a delayed workflow run to appear', async () => {
    const { runBuildDesktopAll } = loadBuildDesktopAll()
    const sleeps: number[] = []
    let listCalls = 0
    let waitedRunId: number | undefined

    await runBuildDesktopAll({
      system: {
        now: () => '2026-03-28T10:00:00Z',
        ensureTool() {},
        assertGitHubAuth() {},
        getRepoRoot: () => '/repo',
        getCurrentBranch: () => 'feat/desktop-windows-build',
        getHeadSha: () => 'remote-sha',
        getRemoteBranchSha: () => 'remote-sha',
        remoteWorkflowExists: () => true,
        triggerWorkflow: () => 'workflow dispatched',
        listWorkflowRuns: () => {
          listCalls += 1

          if (listCalls <= 12) {
            return []
          }

          return [
            {
              id: 42,
              workflowName: 'Build Desktop Scaffold',
              event: 'workflow_dispatch',
              headBranch: 'feat/desktop-windows-build',
              headSha: 'remote-sha',
              createdAt: '2026-03-28T10:00:01Z',
            },
          ]
        },
        sleep(milliseconds: number) {
          sleeps.push(milliseconds)
        },
        waitForRunCompletion: ({ runId }) => {
          waitedRunId = runId
          return {
            conclusion: 'success',
            status: 'completed',
          }
        },
        ensureDir() {},
        downloadArtifact() {},
        writeJson() {},
      },
    })

    expect(listCalls).toBe(13)
    expect(sleeps).toHaveLength(11)
    expect(waitedRunId).toBe(42)
  })

  it('checks the workflow on the remote ref via gh workflow view', () => {
    const { createNodeSystem } = loadBuildDesktopAll()
    const childProcess = require('node:child_process') as typeof import('node:child_process')
    const spawnSync = vi.spyOn(childProcess, 'spawnSync').mockReturnValue({
      error: undefined,
      status: 0,
      stdout: 'name: Build Desktop Scaffold\n',
      stderr: '',
    } as ReturnType<typeof childProcess.spawnSync>)

    const system = createNodeSystem()

    expect(
      system.remoteWorkflowExists({
        branch: 'feat/desktop-windows-build',
        workflowFile: 'build-desktop.yml',
      }),
    ).toBe(true)
    expect(spawnSync).toHaveBeenCalledWith(
      'gh',
      ['workflow', 'view', 'build-desktop.yml', '--ref', 'feat/desktop-windows-build', '--yaml'],
      { encoding: 'utf8', stdio: 'pipe' },
    )
  })

  it('waits for completion without requesting unsupported artifact metadata', async () => {
    const { createNodeSystem } = loadBuildDesktopAll()
    const childProcess = require('node:child_process') as typeof import('node:child_process')
    const spawnSync = vi.spyOn(childProcess, 'spawnSync').mockReturnValue({
      error: undefined,
      status: 0,
      stdout: JSON.stringify({
        status: 'completed',
        conclusion: 'success',
      }),
      stderr: '',
    } as ReturnType<typeof childProcess.spawnSync>)

    const system = createNodeSystem()

    await expect(system.waitForRunCompletion({ runId: 42 })).resolves.toEqual({
      conclusion: 'success',
    })
    expect(spawnSync).toHaveBeenCalledWith(
      'gh',
      ['run', 'view', '42', '--json', 'status,conclusion'],
      { encoding: 'utf8', stdio: 'pipe' },
    )
  })

  it('keeps the scaffold verifier checking that shared tauri config does not define bundle targets', () => {
    const script = fs.readFileSync(path.join(process.cwd(), 'scripts/verify-desktop-scaffold.sh'), 'utf8')

    expect(script).toContain("! rg -n '\"targets\"' src-tauri/tauri.conf.json")
  })

  it('pins the desktop workflow to current GitHub-hosted action majors and a published tauri action version', () => {
    const workflow = fs.readFileSync(
      path.join(process.cwd(), '.github/workflows/build-desktop.yml'),
      'utf8',
    )

    expect(workflow).toContain('actions/checkout@v6')
    expect(workflow).toContain('actions/setup-node@v6')
    expect(workflow).not.toContain('actions/checkout@v5')
    expect(workflow).not.toContain('actions/setup-node@v5')
    expect(workflow).not.toContain('actions/checkout@v4')
    expect(workflow).not.toContain('actions/setup-node@v4')
    expect(workflow).toContain('tauri-apps/tauri-action@v0.6.2')
    expect(workflow).not.toContain('tauri-apps/tauri-action@v1')
    expect(workflow).toContain('npm run verify:skills')
    expect(workflow).toContain('uploadWorkflowArtifacts: false')
    expect(workflow).toContain('uploadUpdaterJson: true')
    expect(workflow).toContain('uploadUpdaterSignatures: true')
    expect(workflow).toContain('releaseDraft: false')
    expect(workflow).toContain('tagName:')
    expect(workflow).toContain('args: --config src-tauri/tauri.release.conf.json')
    expect(workflow).toContain('TAURI_SIGNING_PRIVATE_KEY')
    expect(workflow).toContain('TAURI_UPDATER_PUBLIC_KEY')
    expect(workflow).toContain('APPLE_CERTIFICATE')
    expect(workflow).toContain('APPLE_API_ISSUER')
    expect(workflow).toContain('APPLE_API_KEY_PATH')
  })

  it('keeps desktop artifact filenames aligned to sop-to-skill', () => {
    const workflow = fs.readFileSync(
      path.join(process.cwd(), '.github/workflows/build-desktop.yml'),
      'utf8',
    )
    const verifyScript = fs.readFileSync(
      path.join(process.cwd(), 'scripts/verify-desktop-scaffold.sh'),
      'utf8',
    )

    expect(workflow).toContain('target/release/sop-to-skill.exe')
    expect(workflow).toContain('bundle/dmg/sop-to-skill-')
    expect(verifyScript).toContain("rg -n 'target/release/sop-to-skill\\.exe' .github/workflows/build-desktop.yml")
    expect(verifyScript).toContain("test -f scripts/install-sop-to-skill.ps1")
  })

  it('keeps push macOS builds on ad-hoc signing while gating notarization secrets behind workflow_dispatch', () => {
    const workflow = fs.readFileSync(
      path.join(process.cwd(), '.github/workflows/build-desktop.yml'),
      'utf8',
    )

    expect(workflow).toContain("if: matrix.os == 'macos-latest' && github.event_name == 'workflow_dispatch'")
    expect(workflow).toContain("APPLE_SIGNING_IDENTITY: '-'")
  })

  it('exposes a tauri npm script for tauri-action builds', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'),
    ) as {
      scripts?: Record<string, string>
    }

    expect(packageJson.scripts?.tauri).toBe('tauri')
  })
})
