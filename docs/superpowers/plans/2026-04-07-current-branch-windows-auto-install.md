# Current-Branch Windows Auto Install Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable `npm run build:desktop:all` to produce a current-branch smoke-build artifact through `workflow_dispatch`, then use a local-only helper to copy the resulting Windows installer to `192.168.9.12`, install it silently, and launch the app successfully.

**Architecture:** Keep the repository's committed changes focused on build orchestration and workflow gating. Manual dispatches explicitly request `release_build=false`, the GitHub workflow treats those dispatches like artifact-only smoke builds, and the Windows installation itself is handled by temporary local scripts that never enter git.

**Tech Stack:** GitHub Actions, Node.js CommonJS, Vitest, Bash, Expect, PowerShell, OpenSSH

---

## File Map

- Modify: `scripts/build-desktop-all.test.ts`
  Lock the local workflow dispatch contract to a smoke-build input.
- Modify: `scripts/lib/build-desktop-all.cjs`
  Pass the manual-dispatch workflow input expected by the workflow.
- Modify: `.github/workflows/build-desktop.yml`
  Add `workflow_dispatch.inputs.release_build` and gate release-only signing steps on that input.
- Modify: `scripts/verify-desktop-scaffold.sh`
  Assert the new workflow-dispatch smoke-build contract.
- Modify: `README.md`
  Explain that manual dispatches default to artifact-only builds and release builds still require secrets.
- Create: `docs/superpowers/plans/2026-04-07-current-branch-windows-auto-install.md`
  Record the implementation plan.

### Task 1: Pin Local Workflow Dispatch To Smoke Build

**Files:**
- Modify: `scripts/build-desktop-all.test.ts`
- Modify: `scripts/lib/build-desktop-all.cjs`

- [ ] **Step 1: Write the failing test**

Update the existing dispatch test so it expects the explicit workflow input:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- scripts/build-desktop-all.test.ts`
Expected: FAIL because `buildWorkflowRunArgs` still returns only `--ref <branch>`.

- [ ] **Step 3: Write minimal implementation**

Update `scripts/lib/build-desktop-all.cjs`:

```js
function buildWorkflowRunArgs({ workflowFile, branch }) {
  return ['workflow', 'run', workflowFile, '--ref', branch, '-f', 'release_build=false'];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- scripts/build-desktop-all.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/build-desktop-all.test.ts scripts/lib/build-desktop-all.cjs
git commit -m "fix: dispatch smoke desktop builds explicitly"
```

### Task 2: Make `workflow_dispatch` Support Smoke Builds

**Files:**
- Modify: `scripts/verify-desktop-scaffold.sh`
- Modify: `.github/workflows/build-desktop.yml`

- [ ] **Step 1: Write the failing verifier checks**

Add checks that require a manual-dispatch smoke-build input and release-only gating:

```bash
rg -n 'workflow_dispatch:' .github/workflows/build-desktop.yml
rg -n 'release_build:' .github/workflows/build-desktop.yml
rg -n 'default:\s*false' .github/workflows/build-desktop.yml
rg -n "inputs\.release_build" .github/workflows/build-desktop.yml
! rg -n "if: github\.event_name == 'workflow_dispatch' \|\| startsWith\(github\.ref, 'refs/tags/v'\)" .github/workflows/build-desktop.yml
```

- [ ] **Step 2: Run verifier to confirm it fails**

Run: `npm run verify:desktop`
Expected: FAIL because the workflow still treats every `workflow_dispatch` as a release path.

- [ ] **Step 3: Write minimal workflow implementation**

Update `.github/workflows/build-desktop.yml` so the workflow dispatch has a boolean input and only the release path consumes secrets:

```yaml
on:
  push:
  workflow_dispatch:
    inputs:
      release_build:
        description: Create a signed release build
        required: false
        default: false
        type: boolean
```

Use the input in release-only conditions:

```yaml
if: (github.event_name == 'workflow_dispatch' && inputs.release_build) || startsWith(github.ref, 'refs/tags/v')
```

And use the inverse for smoke builds:

```yaml
if: github.event_name == 'push' || (github.event_name == 'workflow_dispatch' && !inputs.release_build)
```

- [ ] **Step 4: Run verifier to confirm it passes**

Run: `npm run verify:desktop`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/build-desktop.yml scripts/verify-desktop-scaffold.sh
git commit -m "fix: allow workflow dispatch desktop smoke builds"
```

### Task 3: Document The New Manual-Build Contract

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Write the documentation change**

Update the `README.md` desktop build section so it says:

```md
- `npm run build:desktop:all` triggers `build-desktop.yml` with `release_build=false`, waits for the smoke build to finish, and downloads both platform installers.
- Formal release builds still require `workflow_dispatch` with `release_build=true` or a `v*` tag, plus the signing secrets listed below.
```

- [ ] **Step 2: Run the focused verification**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Run the full repository test suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: clarify smoke desktop dispatch builds"
```

### Task 4: Run Local-Only Windows Deployment

**Files:**
- Local-only: temporary shell / Expect helper under a temp directory
- Local-only: temporary PowerShell installer script under a temp directory

- [ ] **Step 1: Build and download the current-branch artifacts**

Run: `npm run build:desktop:all`
Expected: PASS and `artifacts/desktop/<run-id>/windows/` contains a `.exe` installer.

- [ ] **Step 2: Generate a temporary local deployment helper**

Create a temporary shell helper that:

```bash
set -euo pipefail
installer_path="$1"
remote_dir='C:\Users\juns\AppData\Local\Temp\skill-configurator-deploy'
```

and uses `expect`-wrapped `scp` / `ssh` commands with the provided password.

- [ ] **Step 3: Generate a temporary PowerShell script for remote install**

The script should:

```powershell
$installer = $args[0]
Start-Process -FilePath $installer -ArgumentList '/S' -Wait -PassThru
$candidates = @(
  "$env:LOCALAPPDATA\Programs\Skill Configurator\Skill Configurator.exe",
  "$env:ProgramFiles\Skill Configurator\Skill Configurator.exe",
  "$env:ProgramFiles(x86)\Skill Configurator\Skill Configurator.exe"
)
```

Then resolve the executable path, launch it, wait briefly, and fail if no process remains alive.

- [ ] **Step 4: Execute deployment against `192.168.9.12`**

Run the temporary helper with the downloaded `.exe`.
Expected: PASS and the remote script prints the resolved executable path plus a running process id.

- [ ] **Step 5: Verify app launch**

Run a final remote check:

```powershell
Get-Process | Where-Object { $_.ProcessName -like 'Skill Configurator*' -or $_.Path -like '*Skill Configurator.exe' }
```

Expected: PASS with at least one running process.

## Self-Review

- Spec coverage: the plan covers workflow gating, local dispatch behavior, docs, and the remote install loop.
- Placeholder scan: no TBD or deferred implementation markers remain.
- Type consistency: `release_build` is used consistently across the local dispatch contract and workflow conditions.
