# Local Desktop Build Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add native local desktop packaging commands for macOS and Windows that validate key prerequisites, run `tauri build`, and copy the final installer into `artifacts/desktop/local/` without changing the existing GitHub Actions release flow.

**Architecture:** Keep remote multi-platform packaging in `scripts/build-desktop-all.cjs` and add a separate local build library plus thin entry scripts. Write the local Node logic behind a mockable system abstraction so unit tests can cover OS gating, prerequisite checks, bundle discovery, and output copying without running real desktop packaging.

**Tech Stack:** Node.js CommonJS scripts, npm scripts, Vitest node tests, existing Tauri CLI wrapper, shell verification script, Markdown docs

---

### Task 1: Lock the local build contract in tests

**Files:**
- Create: `scripts/build-desktop-local.test.ts`
- Reference: `scripts/lib/build-desktop-all.cjs`

- [ ] **Step 1: Write failing tests for platform gating and prerequisite checks**

```ts
await expect(runBuildDesktopLocal({ targetPlatform: 'macos', system: fakeLinuxSystem })).rejects.toThrow(
  /macOS/i,
)

await expect(runBuildDesktopLocal({ targetPlatform: 'windows', system: fakeWindowsWithoutNsis })).rejects.toThrow(
  /NSIS/i,
)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- scripts/build-desktop-local.test.ts`
Expected: FAIL because `scripts/lib/build-desktop-local.cjs` does not exist yet.

- [ ] **Step 3: Add failing tests for output layout and artifact copy contract**

```ts
expect(buildLocalArtifactLayout({ repoRoot: '/repo', platform: 'macos' })).toEqual({
  baseDir: '/repo/artifacts/desktop/local',
  platformDir: '/repo/artifacts/desktop/local/macos',
})

expect(copies).toEqual([
  {
    from: '/repo/src-tauri/target/release/bundle/dmg/sop-to-skill_0.1.0_aarch64.dmg',
    to: '/repo/artifacts/desktop/local/macos/sop-to-skill_0.1.0_aarch64.dmg',
  },
])
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm test -- scripts/build-desktop-local.test.ts`
Expected: FAIL with missing exports or missing implementation.

- [ ] **Step 5: Commit**

```bash
git add scripts/build-desktop-local.test.ts
git commit -m "test: define local desktop build contract"
```

### Task 2: Implement the shared local desktop build library

**Files:**
- Create: `scripts/lib/build-desktop-local.cjs`
- Test: `scripts/build-desktop-local.test.ts`

- [ ] **Step 1: Implement layout, prerequisite, and artifact-discovery helpers**

```js
function buildLocalArtifactLayout({ repoRoot, platform }) {
  const baseDir = path.join(repoRoot, 'artifacts', 'desktop', 'local');
  return {
    baseDir,
    platformDir: path.join(baseDir, platform),
  };
}

function getBundleGlobForPlatform(platform) {
  if (platform === 'macos') {
    return path.join('src-tauri', 'target', 'release', 'bundle', 'dmg');
  }

  return path.join('src-tauri', 'target', 'release', 'bundle', 'nsis');
}
```

- [ ] **Step 2: Implement the main orchestration function with a mockable system layer**

```js
async function runBuildDesktopLocal({ targetPlatform, system = createNodeSystem() }) {
  system.assertSupportedPlatform(targetPlatform);
  system.ensureTool('cargo');

  if (targetPlatform === 'macos') {
    system.assertMacPrerequisites();
  } else {
    system.assertWindowsPrerequisites();
  }

  const repoRoot = system.getRepoRoot();
  const layout = buildLocalArtifactLayout({ repoRoot, platform: targetPlatform });
  system.runTauriBuild(repoRoot);
  const installerPath = system.findInstaller({ repoRoot, platform: targetPlatform });
  system.resetDir(layout.platformDir);
  system.copyFile(installerPath, path.join(layout.platformDir, path.basename(installerPath)));
}
```

- [ ] **Step 3: Run the focused tests**

Run: `npm test -- scripts/build-desktop-local.test.ts`
Expected: PASS

- [ ] **Step 4: Refine error messages so missing prerequisites include setup guidance**

```js
throw new Error('Xcode Command Line Tools are required. Run `xcode-select --install` and retry.');
throw new Error('NSIS is required for Windows packaging. Install NSIS and make sure `makensis` is on PATH.');
```

- [ ] **Step 5: Re-run the focused tests**

Run: `npm test -- scripts/build-desktop-local.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/build-desktop-local.cjs scripts/build-desktop-local.test.ts
git commit -m "feat: add local desktop build library"
```

### Task 3: Add CLI entrypoints and npm scripts

**Files:**
- Create: `scripts/build-desktop-local.cjs`
- Modify: `package.json`
- Test: `scripts/build-desktop-local.test.ts`

- [ ] **Step 1: Add the thin CLI wrapper**

```js
#!/usr/bin/env node
const { runBuildDesktopLocal } = require('./lib/build-desktop-local.cjs');

const targetPlatform = process.argv[2];

runBuildDesktopLocal({ targetPlatform }).catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
```

- [ ] **Step 2: Add npm scripts for macOS and Windows**

```json
"build:local:mac": "node scripts/build-desktop-local.cjs macos",
"build:local:win": "node scripts/build-desktop-local.cjs windows"
```

- [ ] **Step 3: Extend or add tests for CLI argument forwarding if needed**

```ts
expect(invocations).toEqual([{ targetPlatform: 'macos' }])
```

- [ ] **Step 4: Run the focused tests**

Run: `npm test -- scripts/build-desktop-local.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/build-desktop-local.cjs package.json scripts/build-desktop-local.test.ts
git commit -m "feat: add local desktop build npm scripts"
```

### Task 4: Update local build docs and desktop verification

**Files:**
- Modify: `LOCAL_BUILD.md`
- Modify: `LOCAL_BUILD_CN.md`
- Modify: `scripts/verify-desktop-scaffold.sh`

- [ ] **Step 1: Update the local build guides to use the new commands**

```md
- `npm run build:local:mac`
- `npm run build:local:win`
- local artifacts are copied into `artifacts/desktop/local/{macos|windows}/`
```

- [ ] **Step 2: Clarify prerequisite wording**

```md
- macOS local packaging requires Xcode Command Line Tools
- Windows local packaging requires NSIS in `PATH`
- GitHub Actions remains the path for CI and formal release builds
```

- [ ] **Step 3: Extend the desktop scaffold verifier**

```bash
test -f scripts/build-desktop-local.cjs
test -f scripts/lib/build-desktop-local.cjs
test -f scripts/build-desktop-local.test.ts
rg -n '"build:local:mac"' package.json
rg -n '"build:local:win"' package.json
rg -n 'artifacts/desktop/local' LOCAL_BUILD.md
rg -n 'artifacts/desktop/local' LOCAL_BUILD_CN.md
```

- [ ] **Step 4: Run desktop scaffold verification**

Run: `npm run verify:desktop`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add LOCAL_BUILD.md LOCAL_BUILD_CN.md scripts/verify-desktop-scaffold.sh
git commit -m "docs: document local desktop build mode"
```

### Task 5: Run full verification and prepare final delivery

**Files:**
- Modify: any files touched in Tasks 1-4 if verification exposes regressions

- [ ] **Step 1: Run the local build script tests**

Run: `npm test -- scripts/build-desktop-local.test.ts scripts/build-desktop-all.test.ts`
Expected: PASS

- [ ] **Step 2: Run broader repository checks that cover the changed surfaces**

Run: `npm test -- scripts/build-desktop-local.test.ts scripts/build-desktop-all.test.ts src/App.test.tsx src/content/workbuddy.test.ts`
Expected: PASS

- [ ] **Step 3: Run desktop scaffold verification**

Run: `npm run verify:desktop`
Expected: PASS

- [ ] **Step 4: Inspect final worktree**

Run: `git status --short`
Expected: only intended files are modified

- [ ] **Step 5: Commit**

```bash
git add package.json LOCAL_BUILD.md LOCAL_BUILD_CN.md scripts/build-desktop-local.cjs scripts/lib/build-desktop-local.cjs scripts/build-desktop-local.test.ts scripts/verify-desktop-scaffold.sh
git commit -m "feat: add local desktop build mode"
```
