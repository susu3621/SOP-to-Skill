# Desktop Cross-Platform Build Design

## Overview

Extend the existing Tauri desktop scaffold so the project can reliably produce both macOS and Windows desktop installers, while keeping the build flow aligned with the reference repository `lbjlaq/Antigravity-Manager`.

The main design decision is:

- local development machines remain responsible for local validation and optional single-platform builds
- GitHub Actions becomes the authoritative multi-platform build entrypoint
- the repository adds one local script that triggers the desktop build workflow once, waits for completion, and downloads both macOS and Windows artifacts into a predictable local directory

This keeps Windows packaging on a native Windows runner instead of making the local Mac environment carry cross-compilation complexity.

## Approved Product Decisions

- The repository should support both macOS and Windows desktop outputs
- The primary multi-platform build path should match `Antigravity-Manager`: native builds on GitHub Actions runners via a matrix workflow
- A single local script should orchestrate the full process for the developer:
  - trigger the workflow
  - wait for completion
  - download both artifacts
- Windows output may be generated from the pushed branch on GitHub Actions instead of from unpushed local changes
- Local `tauri build` remains available for single-platform builds on the current machine
- Platform-specific bundle settings should be split into Tauri platform config overlays instead of growing one monolithic config file
- The developer-facing orchestration entrypoint must run on both macOS and Windows, so it should use a Node.js script instead of a Bash-only wrapper

## Goals

1. Produce macOS and Windows desktop artifacts from one repository without duplicating application code.
2. Give the developer one command that returns both platform outputs in a local artifacts directory.
3. Keep the build system maintainable by letting each platform build on its native runner.
4. Make artifact names and download locations predictable enough for future automation.

## Non-Goals

- Building Windows installers directly on macOS as the primary supported path
- Introducing code-signing, notarization, or release publishing in this change
- Changing desktop application behavior outside build and packaging flows
- Reworking the entire release pipeline beyond what is needed for desktop artifact generation

## Constraints

### Tauri Packaging Reality

Tauri v2 supports platform-specific configuration overlays such as:

- `tauri.macos.conf.json`
- `tauri.windows.conf.json`

Tauri's Windows installer guidance also makes native Windows builds the normal path for installers, while NSIS cross-compilation exists but is not the most robust default for this repository.

### Repository Reality

The current repository already has:

- a Tauri app under `src-tauri/`
- `bundle.targets` containing both `app` and `nsis`
- a desktop GitHub Actions workflow that already runs on `macos-latest` and `windows-latest`

What is missing is:

- a clear platform-specific configuration split
- an explicit artifact upload contract
- a single orchestration script that gives the developer both outputs in one run

## Architecture

### Build Source of Truth

The build source of truth should be the GitHub Actions workflow `.github/workflows/build-desktop.yml`.

That workflow should:

- validate the web shell first
- build the desktop app on both `macos-latest` and `windows-latest`
- upload explicit artifacts with stable names

Recommended artifact contract:

- `desktop-macos`
- `desktop-windows`

The workflow must use one explicit artifact source. It should not leave Tauri's implicit workflow artifact uploads enabled alongside custom uploads, because that creates multiple competing download sources for the same build.

The workflow should be callable both from:

- normal repository events
- `workflow_dispatch`, so a local script can trigger it on demand

### Local Orchestration Script

Add a repository script:

- `scripts/build-desktop-all.cjs`

This script is the developer-facing "build once, get both platforms" entrypoint. It does not try to build Windows locally. Instead it orchestrates the remote workflow and downloads results.

Recommended flow:

1. Check required tools:
   - `gh`
   - `git`
   - `npm`
2. Resolve:
   - current branch
   - current commit SHA
   - current remote tracking branch SHA
   - workflow file name
3. Validate branch state:
   - branch exists on remote
   - the workflow file exists on the remote branch being built
   - optionally warn if local HEAD is ahead of remote
4. Trigger `build-desktop.yml` with `gh workflow run --ref <branch>`
5. Discover the created workflow run id in a deterministic way
6. Poll until the run reaches a terminal state
7. Download artifacts into a stable local directory
8. Write a machine-readable manifest describing the downloaded result set

The run-discovery step must not rely on a loose "latest run on this branch" heuristic. It should match the run using enough identifying information to avoid races with concurrent runs, for example:

- workflow name or file
- event type `workflow_dispatch`
- branch name
- expected remote head SHA
- creation time after trigger time

The implementation contract should explicitly compare the selected run's `headSha` with the remote branch SHA gathered before dispatch. If they do not match, the script must fail instead of downloading artifacts from the wrong run.

### Result Directory Contract

The orchestration script should place outputs under:

- `artifacts/desktop/<run-id>/macos/`
- `artifacts/desktop/<run-id>/windows/`
- `artifacts/desktop/<run-id>/manifest.json`

Because this repository does not currently ignore `artifacts/`, implementation must also add an ignore rule for the downloaded output root so normal script usage does not dirty the worktree.

The manifest should record:

- workflow run id
- workflow name or file
- branch
- commit SHA
- download timestamp
- artifact names
- local paths for each platform payload

This makes later automation and troubleshooting much easier than relying on ad-hoc download directories.

## Tauri Configuration Design

### Base Config

Keep `src-tauri/tauri.conf.json` as the shared cross-platform base config:

- app identifier
- frontend build commands
- shared icons
- shared app window defaults
- `bundle.active`

It should no longer be the only place carrying platform bundle intent.

The base config should stop defining platform bundle targets directly. In particular, `bundle.targets` should be removed from `tauri.conf.json` so target selection is owned by the platform overlays.

### macOS Overlay

Add:

- `src-tauri/tauri.macos.conf.json`

This file should contain macOS-specific bundle behavior, for example:

- macOS bundle target selection
- future macOS-only signing or entitlement settings

Initial contract:

- define `bundle.targets` as `["app"]`

Even if the first version is small, adding the overlay now gives the repository the same structural pattern Tauri expects for future platform-specific customization.

### Windows Overlay

Add:

- `src-tauri/tauri.windows.conf.json`

This file should contain Windows-specific bundle behavior, for example:

- `nsis` target selection
- future `bundle.windows` settings such as `webviewInstallMode`
- later NSIS customization without touching shared config

Initial contract:

- define `bundle.targets` as `["nsis"]`

This separation keeps Windows installer behavior isolated and avoids accidental cross-platform config regressions.

### Overlay Selection Contract

The implementation must define exactly how these overlays become active:

- local macOS build: `npm run tauri:build` on macOS uses `tauri.conf.json` merged with `tauri.macos.conf.json`
- local Windows build: `npm run tauri:build` on Windows uses `tauri.conf.json` merged with `tauri.windows.conf.json`
- CI macOS build: the macOS runner uses the same unmodified `npm run tauri:build`
- CI Windows build: the Windows runner uses the same unmodified `npm run tauri:build`

This keeps the default `tauri:build` command stable while making bundle target selection platform-native. No extra config flags are required in the happy path because Tauri merges the platform-specific config file for the active platform into the base config.

## Workflow Design

### Build Matrix

The desktop workflow should keep a two-platform matrix:

- `macos-latest`
- `windows-latest`

Each matrix job should:

- check out code
- install Node.js
- install Rust stable
- install npm dependencies
- run the Tauri build command
- upload the platform artifact under an explicit name

The workflow should keep `tauri-action` only as the build executor, not as the artifact contract owner. The implementation should disable or remove implicit Tauri workflow-artifact uploads and then add explicit `actions/upload-artifact` steps for the stable artifact names.

### Artifact Naming

The workflow should upload:

- macOS build output as `desktop-macos`
- Windows build output as `desktop-windows`

The exact archived files can remain platform-native, for example:

- macOS `.app` bundles or zipped/bundled outputs
- Windows NSIS `.exe`

The key requirement is that the artifact names exposed to the orchestration script remain fixed and documented.

The downloader must only consume these explicit artifact names. Implicit artifacts from `tauri-action` are out of contract.

### Relationship to Existing CI

The current `verify-web-shell` job already validates the frontend. That should remain in place ahead of desktop packaging so packaging failures are not mixed with unrelated web build regressions.

## Package Script Design

Update `package.json` with a developer-friendly entrypoint:

- `build:desktop:all`

That script should call:

- `node scripts/build-desktop-all.cjs`

Existing commands should remain:

- `tauri:build` for local single-platform packaging
- `build` for frontend assets
- `test` for desktop UI tests

This gives a clean separation between:

- local validation
- local single-platform build
- orchestrated multi-platform artifact retrieval

This also keeps the orchestration entrypoint runnable on Windows, where a Bash dependency is not currently part of the repository contract.

## Failure Handling

The orchestration script should fail fast and explain why.

Expected failure cases:

- `gh` is not installed
- GitHub authentication is missing or invalid
- the current branch has no matching remote branch
- the workflow cannot be triggered
- the workflow run fails
- only one platform artifact is available
- artifact download fails

Each failure path should print an actionable message. The script should avoid silent partial success.

## Testing Strategy

### Local Script Verification

Add focused tests for the orchestration script behavior in:

- `scripts/build-desktop-all.test.ts`

That test file should run under the existing `vitest` suite invoked by `npm run test`.

The tests should cover:

- tool detection
- workflow name / branch handling
- dispatch command construction with `--ref`
- run selection filtered by branch and expected `headSha`
- output directory layout
- manifest generation
- error handling when expected artifacts are missing

The tests do not need to hit live GitHub APIs for every case. The script should be structured so command boundaries are mockable or overridable in test mode.

### Repository Verification

Minimum repository verification after implementation:

- `npm run test`
- `npm run build`
- `bash scripts/verify-desktop-scaffold.sh`

`scripts/verify-desktop-scaffold.sh` should be updated to assert the presence of:

- `scripts/build-desktop-all.cjs`
- `src-tauri/tauri.macos.conf.json`
- `src-tauri/tauri.windows.conf.json`
- the updated desktop workflow file

### CI Verification

Success criteria for CI:

- the updated desktop workflow completes on both `macos-latest` and `windows-latest`
- both platform jobs upload their explicit artifacts
- the local orchestration script can download both artifacts from a completed run

## Implementation Outline

The implementation should touch only the build and packaging surface:

- `package.json`
- `.github/workflows/build-desktop.yml`
- `.gitignore`
- `README.md`
- `scripts/build-desktop-all.cjs`
- `scripts/build-desktop-all.test.ts`
- `src-tauri/tauri.conf.json`
- `src-tauri/tauri.macos.conf.json`
- `src-tauri/tauri.windows.conf.json`
- `scripts/verify-desktop-scaffold.sh`

No desktop UI or backend feature behavior should change as part of this work.

## Open Questions Resolved

- Should Windows output be allowed to come from GitHub Actions rather than local unpushed changes?
  - Yes. This is the approved repository contract.
- Should the repository follow the same build philosophy as `Antigravity-Manager`?
  - Yes. Native matrix builds on CI are the preferred path.
- Should this work happen in an isolated workspace?
  - Yes. Implementation should proceed from a dedicated git worktree.
