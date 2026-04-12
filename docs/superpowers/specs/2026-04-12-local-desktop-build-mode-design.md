# Local Desktop Build Mode Design

## Overview

Add a pure local desktop packaging mode alongside the existing GitHub Actions desktop build flow.

The current repository already supports:

- remote two-platform builds through `npm run build:desktop:all`
- platform-native local packaging through `tauri build`

What is missing is a stable, developer-friendly local entrypoint that:

- checks the key platform prerequisites up front
- runs the local Tauri package build on the current machine only
- collects the final installer into one predictable output root
- leaves the existing GitHub Actions path unchanged for CI and release publishing

## Approved Decisions

- Keep `npm run build:desktop:all` and the GitHub Actions workflow as the existing remote build and release path.
- Add a separate local build mode for developer testing and debugging.
- Local mode is native-platform only:
  - `npm run build:local:mac` runs only on macOS
  - `npm run build:local:win` runs only on Windows
- Cross-platform local packaging is not a goal for this change.
- Local scripts must perform explicit prerequisite checks and fail with clear setup guidance.
- Local build outputs must be copied into `artifacts/desktop/local/`.
- The original Tauri bundle output under `src-tauri/target/release/bundle/` remains untouched.

## Goals

1. Give developers one obvious command for native local packaging on macOS and Windows.
2. Preserve the current GitHub Actions desktop build flow for CI and formal release publishing.
3. Fail early when the machine is missing the most important packaging prerequisites.
4. Standardize the local output location so downstream manual QA can always find the latest local installer.

## Non-Goals

- Replacing the existing GitHub Actions desktop build path
- Building Windows installers on macOS or macOS DMGs on Windows
- Reworking the Tauri packaging configuration or release signing flow
- Adding full environment diagnostics beyond the key prerequisites required by this request

## Architecture

### Remote Mode Stays As-Is

The existing remote orchestration remains the authoritative multi-platform and CI/release path:

- `npm run build:desktop:all`
- `scripts/build-desktop-all.cjs`
- `scripts/lib/build-desktop-all.cjs`
- `.github/workflows/build-desktop.yml`

No behavior should change for that path beyond optional documentation updates that clarify its purpose.

### New Local Mode

Add a dedicated local build implementation:

- `scripts/build-desktop-local.cjs`
- `scripts/lib/build-desktop-local.cjs`

Add npm entrypoints:

- `npm run build:local:mac`
- `npm run build:local:win`

The two npm scripts are thin wrappers that call the same shared Node implementation with an explicit target platform.

This keeps the new logic out of `build-desktop-all.cjs`, which should stay focused on GitHub Actions workflow orchestration.

## Local Build Flow

For both local entrypoints, the runtime flow is:

1. Resolve repository root.
2. Validate the command is running on the expected OS.
3. Check core prerequisites.
4. Run the local Tauri package build.
5. Find the final installer artifact in the Tauri bundle output.
6. Copy the artifact into `artifacts/desktop/local/<platform>/`.
7. Print the final artifact path.

The script should clear only the destination platform directory under `artifacts/desktop/local/` before copying the new artifact, so stale local installers are not mixed with the latest one.

The script should not delete `src-tauri/target/` because that is Tauri's build cache and is still useful for repeated local development builds.

## Prerequisite Checks

### Shared Checks

For both platforms, local mode should require:

- `cargo`
- npm project dependencies available locally

The script does not need to verify every Rust or Tauri sub-dependency in detail. It only needs to fail early on the obvious missing prerequisites with a human-readable message.

### macOS Checks

`npm run build:local:mac` must:

- fail when `process.platform !== "darwin"`
- verify Xcode Command Line Tools are installed

Recommended check:

- run `xcode-select -p`

Recommended error guidance:

- tell the user to run `xcode-select --install`

This is intentionally lighter than the existing doc's "full Xcode" requirement. The request explicitly asked for Xcode Command Line Tools as the key prerequisite to validate.

### Windows Checks

`npm run build:local:win` must:

- fail when `process.platform !== "win32"`
- verify NSIS is installed and available in `PATH`

Recommended check:

- run `where makensis`

Recommended error guidance:

- tell the user to install NSIS and ensure `makensis` is on `PATH`

## Build Command Contract

The local scripts should execute:

- `npm run tauri:build`

This preserves the current Tauri build entrypoint instead of duplicating Tauri CLI arguments in multiple places.

Because the repository already documents platform-native local `tauri build`, the new scripts are wrappers around the established packaging command, not a new packaging implementation.

## Output Contract

Copy final installers into:

- `artifacts/desktop/local/macos/`
- `artifacts/desktop/local/windows/`

Expected source locations:

- macOS: `src-tauri/target/release/bundle/dmg/*.dmg`
- Windows: `src-tauri/target/release/bundle/nsis/*.exe`

The scripts should copy only the final installable bundle for the current platform:

- `.dmg` for macOS
- `.exe` for Windows

No attempt should be made to relocate the Tauri-generated output root itself. Copying the final installer is safer and avoids interfering with existing Tauri behavior and CI expectations.

## Documentation Changes

Update:

- `LOCAL_BUILD_CN.md`
- `LOCAL_BUILD.md`
- `package.json`

Documentation must clearly distinguish:

- local native single-platform packaging for development/debugging
- remote GitHub Actions packaging for CI and formal releases

The local build docs should show the new commands and the new local artifact directory instead of asking developers to inspect `src-tauri/target/release/bundle/...` directly.

## Verification

Add or update verification around:

- local script unit tests for platform gating, prerequisite checks, output path selection, and artifact copying
- desktop scaffold verification so the new local build entrypoints are part of the checked contract
- local build docs so they match the new scripts and output location

The implementation should not require actually producing a local DMG or EXE inside automated tests. The Node build logic should be written so it can be tested with a mocked system layer.

## Files Expected To Change

- `package.json`
- `LOCAL_BUILD.md`
- `LOCAL_BUILD_CN.md`
- `scripts/build-desktop-local.cjs`
- `scripts/lib/build-desktop-local.cjs`
- `scripts/build-desktop-local.test.ts`
- `scripts/verify-desktop-scaffold.sh`

No GitHub Actions workflow changes are required for this task.
