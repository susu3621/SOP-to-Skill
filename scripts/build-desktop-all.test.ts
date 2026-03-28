// @vitest-environment node

import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

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
})
