# Desktop Cross-Platform Build Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one repository command that yields both macOS and Windows desktop build artifacts by keeping local `tauri build` platform-native and orchestrating Windows packaging through the existing GitHub Actions workflow.

**Architecture:** Put all GitHub dispatch/download logic in a testable CommonJS module under `scripts/lib/`, expose it through a thin Node CLI entrypoint, split Tauri bundle targets into platform overlay config files, and make the desktop workflow upload only explicit `desktop-macos` and `desktop-windows` artifacts that the script downloads into an ignored `artifacts/desktop/<run-id>/` directory.

**Tech Stack:** Node.js 20, CommonJS scripts, GitHub CLI, GitHub Actions, Tauri v2, Vitest, Bash verification script

---

## File Map

- Modify: `.github/workflows/build-desktop.yml`
  Make the matrix upload explicit `desktop-macos` / `desktop-windows` artifacts and stop relying on implicit `tauri-action` workflow artifact uploads.
- Modify: `.gitignore`
  Ignore downloaded orchestration output under `artifacts/desktop/`.
- Modify: `package.json`
  Add `build:desktop:all` pointing at the Node CLI entrypoint.
- Modify: `README.md`
  Document local single-platform builds, the new orchestrated dual-platform build flow, and the `gh` prerequisite.
- Create: `scripts/lib/build-desktop-all.cjs`
  Hold exported orchestration helpers and the main `runBuildDesktopAll` function so Vitest can mock Git/GitHub/FS interactions.
- Create: `scripts/build-desktop-all.cjs`
  Thin CLI wrapper that invokes `runBuildDesktopAll`.
- Create: `scripts/build-desktop-all.test.ts`
  Node-environment tests for dispatch args, run selection, artifact layout, manifest writing, and missing-artifact failures.
- Modify: `scripts/verify-desktop-scaffold.sh`
  Assert the new script/config files exist and the workflow contains the explicit artifact contract.
- Modify: `src-tauri/tauri.conf.json`
  Keep only shared bundle config and remove direct target selection.
- Create: `src-tauri/tauri.macos.conf.json`
  Set macOS-only `bundle.targets` to `["app"]`.
- Create: `src-tauri/tauri.windows.conf.json`
  Set Windows-only `bundle.targets` to `["nsis"]`.

### Task 1: Add Failing Tests For Workflow Dispatch And Run Selection

**Files:**
- Create: `scripts/build-desktop-all.test.ts`
- Create: `scripts/lib/build-desktop-all.cjs`

- [ ] **Step 1: Write the failing test**

Create `scripts/build-desktop-all.test.ts` with Node-environment tests that load `./lib/build-desktop-all.cjs` via `createRequire` and cover the smallest orchestration contracts first:

```ts
// @vitest-environment node

import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

function loadBuildDesktopAll() {
  return require('./lib/build-desktop-all.cjs') as {
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
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- scripts/build-desktop-all.test.ts`

Expected: FAIL because `scripts/lib/build-desktop-all.cjs` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create `scripts/lib/build-desktop-all.cjs` exporting the smallest tested helpers first:

```js
function buildWorkflowRunArgs({ workflowFile, branch }) {
  return ['workflow', 'run', workflowFile, '--ref', branch];
}

function selectWorkflowRun(runs, { workflowName, branch, expectedHeadSha, triggerTime }) {
  const match = runs.find((run) => {
    return (
      run.workflowName === workflowName &&
      run.event === 'workflow_dispatch' &&
      run.headBranch === branch &&
      run.headSha === expectedHeadSha &&
      run.createdAt >= triggerTime
    );
  });

  if (!match) {
    throw new Error(`No workflow run matched ${workflowName} for ${branch} @ ${expectedHeadSha}`);
  }

  return match.id;
}

module.exports = {
  buildWorkflowRunArgs,
  selectWorkflowRun,
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- scripts/build-desktop-all.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/build-desktop-all.test.ts scripts/lib/build-desktop-all.cjs
git commit -m "test: cover desktop build workflow selection"
```

### Task 2: Add Failing Tests For Artifact Layout, Manifest Writing, And Missing Artifact Failures

**Files:**
- Modify: `scripts/build-desktop-all.test.ts`
- Modify: `scripts/lib/build-desktop-all.cjs`

- [ ] **Step 1: Write the failing test**

Extend `scripts/build-desktop-all.test.ts` with tests for the download contract and manifest shape:

```ts
it('builds the default artifact layout under artifacts/desktop/<run-id>', () => {
  const { buildArtifactLayout } = loadBuildDesktopAll()

  expect(buildArtifactLayout({ repoRoot: '/repo', runId: 42 })).toEqual({
    baseDir: '/repo/artifacts/desktop/42',
    macosDir: '/repo/artifacts/desktop/42/macos',
    windowsDir: '/repo/artifacts/desktop/42/windows',
    manifestPath: '/repo/artifacts/desktop/42/manifest.json',
  })
})

it('fails when desktop-macos or desktop-windows is missing from the run artifacts', () => {
  const { assertRequiredArtifacts } = loadBuildDesktopAll()

  expect(() =>
    assertRequiredArtifacts([{ name: 'desktop-macos' }]),
  ).toThrow(/desktop-windows/)
})

it('writes a manifest with both the matched remote build sha and the local head sha', () => {
  const { buildManifest } = loadBuildDesktopAll()

  expect(
    buildManifest({
      workflowFile: 'build-desktop.yml',
      runId: 42,
      branch: 'feat/desktop-windows-build',
      buildCommitSha: 'remote-sha',
      localHeadSha: 'local-sha',
      downloadedAt: '2026-03-28T10:05:00Z',
      layout: {
        macosDir: '/repo/artifacts/desktop/42/macos',
        windowsDir: '/repo/artifacts/desktop/42/windows',
      },
    }),
  ).toMatchObject({
    workflowFile: 'build-desktop.yml',
    runId: 42,
    branch: 'feat/desktop-windows-build',
    buildCommitSha: 'remote-sha',
    localHeadSha: 'local-sha',
    artifacts: {
      macos: { name: 'desktop-macos', path: '/repo/artifacts/desktop/42/macos' },
      windows: { name: 'desktop-windows', path: '/repo/artifacts/desktop/42/windows' },
    },
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- scripts/build-desktop-all.test.ts`

Expected: FAIL because the new helpers and manifest logic do not exist yet.

- [ ] **Step 3: Write minimal implementation**

Expand `scripts/lib/build-desktop-all.cjs` with download-layout helpers only:

```js
const path = require('node:path');

function buildArtifactLayout({ repoRoot, runId }) {
  const baseDir = path.join(repoRoot, 'artifacts', 'desktop', String(runId));
  return {
    baseDir,
    macosDir: path.join(baseDir, 'macos'),
    windowsDir: path.join(baseDir, 'windows'),
    manifestPath: path.join(baseDir, 'manifest.json'),
  };
}

function assertRequiredArtifacts(artifacts) {
  const names = new Set(artifacts.map((artifact) => artifact.name));
  for (const required of ['desktop-macos', 'desktop-windows']) {
    if (!names.has(required)) {
      throw new Error(`Missing required artifact: ${required}`);
    }
  }
}

function buildManifest({ workflowFile, runId, branch, buildCommitSha, localHeadSha, downloadedAt, layout }) {
  return {
    workflowFile,
    runId,
    branch,
    buildCommitSha,
    localHeadSha,
    downloadedAt,
    artifacts: {
      macos: { name: 'desktop-macos', path: layout.macosDir },
      windows: { name: 'desktop-windows', path: layout.windowsDir },
    },
  };
}

module.exports = {
  ...module.exports,
  buildArtifactLayout,
  assertRequiredArtifacts,
  buildManifest,
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- scripts/build-desktop-all.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/build-desktop-all.test.ts scripts/lib/build-desktop-all.cjs
git commit -m "feat: add desktop build artifact helpers"
```

### Task 3: Add Failing Tests For Preflight Validation And Full Orchestration

**Files:**
- Modify: `scripts/build-desktop-all.test.ts`
- Modify: `scripts/lib/build-desktop-all.cjs`
- Create: `scripts/build-desktop-all.cjs`
- Modify: `package.json`
- Modify: `.gitignore`

- [ ] **Step 1: Write the failing test**

Extend `scripts/build-desktop-all.test.ts` with an injectable system adapter so the orchestrator can be driven deterministically without live GitHub calls:

```ts
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
        artifacts: [{ name: 'desktop-macos' }, { name: 'desktop-windows' }],
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- scripts/build-desktop-all.test.ts`

Expected: FAIL because `runBuildDesktopAll` and the injected system contract do not exist yet.

- [ ] **Step 3: Write minimal implementation**

Add a real orchestrator built around an injectable adapter, then expose it through the CLI wrapper:

```js
async function runBuildDesktopAll({ system = createNodeSystem() } = {}) {
  system.ensureTool('gh');
  system.ensureTool('git');
  system.ensureTool('npm');
  system.assertGitHubAuth();

  const repoRoot = system.getRepoRoot();
  const branch = system.getCurrentBranch();
  const localHeadSha = system.getHeadSha();
  const remoteHeadSha = system.getRemoteBranchSha(branch);

  if (!remoteHeadSha) {
    throw new Error(`Remote branch not found: ${branch}`);
  }

  if (!system.remoteWorkflowExists({ branch, workflowFile: 'build-desktop.yml' })) {
    throw new Error(`Workflow build-desktop.yml is missing on origin/${branch}`);
  }

  const triggerTime = system.now();
  system.triggerWorkflow({ workflowFile: 'build-desktop.yml', branch });

  const runId = selectWorkflowRun(system.listWorkflowRuns(), {
    workflowName: 'Build Desktop Scaffold',
    branch,
    expectedHeadSha: remoteHeadSha,
    triggerTime,
  });

  const result = system.waitForRunCompletion({ runId });
  if (result.conclusion !== 'success') {
    throw new Error(`Workflow run ${runId} finished with ${result.conclusion}`);
  }

  assertRequiredArtifacts(result.artifacts);

  const layout = buildArtifactLayout({ repoRoot, runId });
  system.ensureDir(layout.macosDir);
  system.ensureDir(layout.windowsDir);
  system.downloadArtifact({ runId, artifactName: 'desktop-macos', outputDir: layout.macosDir });
  system.downloadArtifact({ runId, artifactName: 'desktop-windows', outputDir: layout.windowsDir });
  system.writeJson(layout.manifestPath, buildManifest({
    workflowFile: 'build-desktop.yml',
    runId,
    branch,
    buildCommitSha: remoteHeadSha,
    localHeadSha,
    downloadedAt: system.now(),
    layout,
  }));
}

function createNodeSystem() {
  return {
    now: () => new Date().toISOString(),
    ensureTool(name) { /* call `command -v` / `where` through child_process */ },
    assertGitHubAuth() { /* run `gh auth status` and throw on non-zero exit */ },
    getRepoRoot() { /* read via `git rev-parse --show-toplevel` */ },
    getCurrentBranch() { /* read via `git branch --show-current` */ },
    getHeadSha() { /* read via `git rev-parse HEAD` */ },
    getRemoteBranchSha(branch) { /* read via `git ls-remote --heads origin <branch>` */ },
    remoteWorkflowExists({ branch, workflowFile }) { /* verify `git show origin/<branch>:.github/workflows/<file>` succeeds */ },
    triggerWorkflow({ workflowFile, branch }) { /* run `gh workflow run <file> --ref <branch>` */ },
    listWorkflowRuns() { /* run `gh run list --workflow build-desktop.yml --json ...` */ },
    waitForRunCompletion({ runId }) { /* poll `gh run view <id> --json ...` until terminal */ },
    ensureDir(dir) { /* mkdir -p */ },
    downloadArtifact({ runId, artifactName, outputDir }) { /* run `gh run download` */ },
    writeJson(path, value) { /* fs.writeFileSync(JSON.stringify(...)) */ },
  };
}
```

Create `scripts/build-desktop-all.cjs`:

```js
#!/usr/bin/env node
const { runBuildDesktopAll } = require('./lib/build-desktop-all.cjs');

runBuildDesktopAll().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
```

Wire the entrypoint and output root:

- add `"build:desktop:all": "node scripts/build-desktop-all.cjs"` to `package.json`
- add `artifacts/desktop/` to `.gitignore`

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- scripts/build-desktop-all.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/build-desktop-all.test.ts scripts/lib/build-desktop-all.cjs scripts/build-desktop-all.cjs package.json .gitignore
git commit -m "feat: add desktop build orchestration flow"
```

### Task 4: Add Failing Verification For Tauri Overlay Activation And Explicit Workflow Artifacts

**Files:**
- Modify: `scripts/verify-desktop-scaffold.sh`
- Modify: `.github/workflows/build-desktop.yml`
- Modify: `src-tauri/tauri.conf.json`
- Create: `src-tauri/tauri.macos.conf.json`
- Create: `src-tauri/tauri.windows.conf.json`

- [ ] **Step 1: Write the failing test**

Update `scripts/verify-desktop-scaffold.sh` so it now asserts the new config/workflow contract before running the existing test/build commands:

```bash
test -f src-tauri/tauri.macos.conf.json
test -f src-tauri/tauri.windows.conf.json
test -f scripts/build-desktop-all.cjs
rg -n 'desktop-macos' .github/workflows/build-desktop.yml
rg -n 'desktop-windows' .github/workflows/build-desktop.yml
! rg -n 'uploadWorkflowArtifacts:\\s*true' .github/workflows/build-desktop.yml
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash scripts/verify-desktop-scaffold.sh`

Expected: FAIL because the overlay files do not exist and the workflow still relies on implicit Tauri artifact uploads.

- [ ] **Step 3: Write minimal implementation**

Split target selection into platform overlays and make the workflow upload explicit artifact names.

Update `src-tauri/tauri.conf.json` so `bundle.targets` is removed and only shared bundle keys remain:

```json
"bundle": {
  "active": true,
  "category": "DeveloperTool",
  "shortDescription": "Guided desktop shell for configuring skills.",
  "longDescription": "A desktop configurator scaffold that guides non-technical users through step-by-step skill setup flows.",
  "icon": [
    "icons/32x32.png",
    "icons/128x128.png",
    "icons/128x128@2x.png",
    "icons/icon.icns",
    "icons/icon.ico"
  ]
}
```

Create `src-tauri/tauri.macos.conf.json`:

```json
{
  "bundle": {
    "targets": ["app"]
  }
}
```

Create `src-tauri/tauri.windows.conf.json`:

```json
{
  "bundle": {
    "targets": ["nsis"]
  }
}
```

Refactor `.github/workflows/build-desktop.yml` to make artifact upload explicit:

```yaml
on:
  push:
  workflow_dispatch:

strategy:
  fail-fast: false
  matrix:
    include:
      - os: macos-latest
        artifact_name: desktop-macos
        bundle_path: src-tauri/target/release/bundle/macos/**
      - os: windows-latest
        artifact_name: desktop-windows
        bundle_path: src-tauri/target/release/bundle/nsis/**

- uses: tauri-apps/tauri-action@v1
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  with:
    uploadWorkflowArtifacts: false

- uses: actions/upload-artifact@v4
  with:
    name: ${{ matrix.artifact_name }}
    path: ${{ matrix.bundle_path }}
    if-no-files-found: error
```

Do not preserve the current branch whitelist under `on.push.branches`. The workflow should run on normal push events for the repository's active branches instead of staying restricted to the old scaffold-only branch list.

- [ ] **Step 4: Run test to verify it passes**

Run: `bash scripts/verify-desktop-scaffold.sh`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/verify-desktop-scaffold.sh .github/workflows/build-desktop.yml src-tauri/tauri.conf.json src-tauri/tauri.macos.conf.json src-tauri/tauri.windows.conf.json
git commit -m "feat: add platform-specific desktop build config"
```

### Task 5: Add README Coverage And End-To-End Verification

**Files:**
- Modify: `README.md`
- Modify: `scripts/lib/build-desktop-all.cjs`
- Modify: `scripts/build-desktop-all.test.ts`
- Modify: `scripts/verify-desktop-scaffold.sh`
- Modify: any files changed in Tasks 1-3 if verification exposes gaps

- [ ] **Step 1: Write the failing test**

No new unit-test file is required here. Use repository verification as the gate: first update `README.md` in memory or as a draft, then run the existing verification commands and note any mismatches between the documented command names, generated files, and actual behavior.

- [ ] **Step 2: Run verification to expose any remaining gaps**

Run: `npm run test -- scripts/build-desktop-all.test.ts`

Expected: PASS before touching docs.

Run: `bash scripts/verify-desktop-scaffold.sh`

Expected: PASS before touching docs.

- [ ] **Step 3: Write minimal implementation**

Update `README.md` with:

- `gh` as a prerequisite for the dual-platform orchestration command
- the difference between `npm run tauri:build` and `npm run build:desktop:all`
- the output directory contract under `artifacts/desktop/<run-id>/`

If Step 2 exposed command-name mismatches or missing paths, fix those issues in the touched files before running the full verification sweep.

- [ ] **Step 4: Run full verification**

Run: `npm run test`

Expected: PASS with all tests green.

Run: `npm run build`

Expected: PASS

Run: `bash scripts/verify-desktop-scaffold.sh`

Expected: PASS

Run: `npm run tauri:build`

Expected: PASS on macOS and produce a macOS app bundle under `src-tauri/target/release/bundle/macos/`.

Run: `gh auth status`

Expected: PASS if GitHub CLI is authenticated for remote smoke testing.

If `gh auth status` passes and the branch has been pushed, run: `npm run build:desktop:all`

Expected: PASS and download both platform artifacts into `artifacts/desktop/<run-id>/` with `manifest.json` alongside `macos/` and `windows/`.

- [ ] **Step 5: Commit**

```bash
git add README.md scripts/build-desktop-all.test.ts scripts/lib/build-desktop-all.cjs scripts/verify-desktop-scaffold.sh package.json .gitignore .github/workflows/build-desktop.yml src-tauri/tauri.conf.json src-tauri/tauri.macos.conf.json src-tauri/tauri.windows.conf.json
git commit -m "feat: add desktop cross-platform build flow"
```
