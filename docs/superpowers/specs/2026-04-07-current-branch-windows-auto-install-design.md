# Current-Branch Windows Auto Install Design

## Overview

Automate a full deploy loop for the repository's Windows desktop installer using the current branch's GitHub Actions artifact, then install and launch it on the dedicated Windows host `192.168.9.12` over OpenSSH.

The repository already knows how to build a Windows NSIS installer through GitHub Actions, but the current manual-dispatch path is wired like a release flow. That blocks current-branch artifact builds when release signing secrets are absent. The design therefore separates "manual smoke build" from "release build", keeps the build artifact contract stable, and performs Windows installation through a local-only deploy helper that is never committed.

## Goals

1. Trigger a fresh Windows installer build for the current branch from the local developer machine.
2. Download the produced GitHub Actions artifact into the existing `artifacts/desktop/<run-id>/windows/` layout.
3. Copy the installer to `192.168.9.12`, install it silently, launch the app, and verify that it started successfully.
4. Keep any Windows-targeted deployment secrets or scripts out of git history.

## Non-Goals

1. Create a formal GitHub Release.
2. Change application behavior unrelated to build or deployment.
3. Commit the Windows-side install script or embed the remote password in tracked files.

## Constraints

### Current Workflow Behavior

`npm run build:desktop:all` dispatches `.github/workflows/build-desktop.yml` with `workflow_dispatch`. In the current workflow, `workflow_dispatch` is treated like a release path and validates updater signing secrets and macOS signing secrets. That is incompatible with the requested "build current branch artifact first, no release yet" flow.

### Build Artifact Contract

The existing build script and documentation expect:

- `desktop-windows` artifact name
- downloaded output under `artifacts/desktop/<run-id>/windows/`

That contract should remain unchanged so the deployment layer only needs to locate the downloaded `.exe`.

### Deployment Privacy

The user explicitly requested that the Windows install script must not be committed because it may contain sensitive data. The deployment logic therefore must either:

- generate the PowerShell installer script at runtime into a temporary directory, or
- keep any reusable helper outside tracked repository paths

This design uses runtime generation in a temporary directory so the sensitive script never enters git.

## Proposed Architecture

### 1. Split Manual Dispatch Builds From Release Builds

Add a `workflow_dispatch` input such as `release_build` with a default value of `false`.

Build behavior becomes:

- `push`: smoke build, no release signing, upload installer artifacts
- `workflow_dispatch` with `release_build == false`: smoke build, no release signing, upload installer artifacts
- `workflow_dispatch` with `release_build == true`: release build, require updater signing and macOS signing secrets
- `v*` tag: release build, same signing requirements as above

This preserves the existing release path while making manual current-branch artifact builds usable.

### 2. Keep Repository Build Entry Point Stable

`npm run build:desktop:all` remains the public entry point for building both desktop artifacts. After the workflow change above, the existing Node orchestration can keep dispatching the same workflow file and downloading the same artifact names.

No installer-specific deployment behavior is added to the committed build script. Build orchestration stays responsible only for:

- checking branch state
- dispatching the workflow
- waiting for the matching run
- downloading `desktop-macos` and `desktop-windows`
- writing the manifest

### 3. Add a Local-Only Windows Deployment Helper

The Windows deployment helper stays outside git history. Its responsibilities are:

1. call `npm run build:desktop:all`
2. find the newest downloaded Windows installer `.exe`
3. create a temporary local staging directory
4. generate a temporary PowerShell script that:
   - prepares a remote temp directory
   - runs the NSIS installer silently
   - resolves the installed executable path from common install roots
   - launches the application
   - verifies the launched process still exists after startup
5. copy the installer and generated PowerShell script to `192.168.9.12`
6. invoke the PowerShell script through OpenSSH
7. surface a clear success or failure result to the operator

Because the script is generated into a temporary directory and deleted after execution, it never becomes a tracked file.

### 4. Remote Installation And Verification

The remote PowerShell flow should be defensive because NSIS install paths can vary. Verification should not assume only one path.

Remote install steps:

1. create a fresh remote temp directory under the target user's temp area
2. run the installer with silent flags and wait for exit
3. locate `Skill Configurator.exe` in these candidate roots:
   - `$env:LOCALAPPDATA\\Programs\\Skill Configurator`
   - `$env:ProgramFiles\\Skill Configurator`
   - `$env:ProgramFiles(x86)\\Skill Configurator`
4. if the executable is not found in those paths, perform a bounded recursive search under `Programs` roots
5. start the executable
6. wait briefly, then confirm a matching process is alive
7. return the resolved install path and process id

If the installer exits successfully but the executable cannot be found, the deployment should fail loudly instead of pretending success.

## File Boundaries

Committed repository changes:

- `.github/workflows/build-desktop.yml`
  Add smoke-vs-release dispatch behavior without changing artifact names.
- `scripts/build-desktop-all.test.ts`
  Cover any new dispatch arguments or workflow assumptions.
- `scripts/lib/build-desktop-all.cjs`
  Only if needed to pass explicit workflow inputs.
- `README.md`
  Document that manual dispatch builds default to artifact-only smoke builds, while release builds still require secrets.
- `docs/superpowers/specs/2026-04-07-current-branch-windows-auto-install-design.md`
  Capture the approved design.
- `docs/superpowers/plans/2026-04-07-current-branch-windows-auto-install.md`
  Implementation plan.

Local-only deployment assets:

- temporary shell / Expect helper on the local machine
- temporary PowerShell installer script generated at runtime

These local-only assets are execution tooling, not committed repository code.

## Testing Strategy

Committed changes use TDD:

1. add failing tests for the updated workflow dispatch contract
2. make the minimal workflow or script changes to satisfy them
3. run focused tests first, then the full existing test suite

Deployment verification is end-to-end:

1. run `npm run build:desktop:all`
2. confirm the latest workflow run produced `desktop-windows`
3. copy the installer to `192.168.9.12`
4. run silent install remotely
5. verify the application process starts successfully

## Risks And Mitigations

### SSH Session Lacks Enough Privilege

Even with an administrator account, Windows remote sessions can behave differently under UAC. Mitigation:

- prefer a silent installer invocation without extra elevation first
- if that fails because of privilege, fall back to a scheduled-task-based elevated launch inside the remote PowerShell helper

### Workflow Dispatch Still Selects Release Logic

Mitigation:

- keep release gating tied to an explicit `release_build` input or tag condition
- add tests that lock the build helper to the smoke-build dispatch behavior

### Install Path Differs From Expected Defaults

Mitigation:

- verify by executable discovery plus running-process checks instead of a single hard-coded path
