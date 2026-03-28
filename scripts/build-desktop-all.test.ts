// @vitest-environment node

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
    ).toEqual(['workflow', 'run', 'build-desktop.yml', '--ref', 'feat/desktop-windows-build'])
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
          getRemoteBranchSha: () => 'remote-sha',
          remoteWorkflowExists: () => false,
        },
      }),
    ).rejects.toThrow(/build-desktop\.yml/)
  })

  it('runs the happy path and downloads both explicit artifacts into separate directories', async () => {
    const { runBuildDesktopAll } = loadBuildDesktopAll()
    const downloads: Array<{ artifactName: string; outputDir: string }> = []
    const writes: Array<{ path: string; value: unknown }> = []

    await runBuildDesktopAll({
      system: {
        now: () => '2026-03-28T10:00:00Z',
        ensureTool() {},
        assertGitHubAuth() {},
        getRepoRoot: () => '/repo',
        getCurrentBranch: () => 'feat/desktop-windows-build',
        getHeadSha: () => 'local-sha',
        getRemoteBranchSha: () => 'remote-sha',
        remoteWorkflowExists: () => true,
        triggerWorkflow() {},
        listWorkflowRuns: () => [
          {
            id: 42,
            workflowName: 'Build Desktop Scaffold',
            event: 'workflow_dispatch',
            headBranch: 'feat/desktop-windows-build',
            headSha: 'remote-sha',
            createdAt: '2026-03-28T10:00:01Z',
          },
        ],
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
        getHeadSha: () => 'local-sha',
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
    expect(listCalls).toBe(0)
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
        getHeadSha: () => 'local-sha',
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
    expect(sleeps).toEqual([1000])
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
})
