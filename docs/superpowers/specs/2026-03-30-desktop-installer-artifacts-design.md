# Desktop Installer Artifacts Design

## Overview

Adjust the desktop build pipeline so GitHub Actions produces installer files as the primary downloadable outputs:

- macOS: `.dmg`
- Windows: NSIS `.exe`

The repository should keep the current orchestration shape:

- the desktop workflow remains the authoritative cross-platform build entrypoint
- the local `build:desktop:all` command still triggers that workflow and downloads two named artifacts
- only the contents of those artifacts change from packaged application bundles to installer files

## Goals

1. Make CI downloads match what end users expect to install.
2. Keep the current artifact contract stable enough that the local downloader does not need a behavioral rewrite.
3. Align the repository with the reference pattern from `lbjlaq/Antigravity-Manager`, where release assets are uploaded from installer directories such as `bundle/dmg/*.dmg` and `bundle/nsis/*.exe`.

## Non-Goals

- Add multi-architecture macOS outputs in this change.
- Introduce release publishing, signing, or notarization.
- Rename the existing artifact identifiers `desktop-macos` and `desktop-windows`.

## Design

### Artifact Contract

The workflow keeps these artifact names:

- `desktop-macos`
- `desktop-windows`

Those names continue to be what the local downloader requests. The downloaded payloads become:

- `desktop-macos`: one or more `.dmg` files from the macOS runner
- `desktop-windows`: one or more `.exe` files from the Windows runner

This preserves the orchestration contract while changing the artifact contents to installer files.

### Tauri Bundle Targets

The platform overlays should explicitly target installer outputs:

- `src-tauri/tauri.macos.conf.json` uses `["dmg"]`
- `src-tauri/tauri.windows.conf.json` continues to use `["nsis"]`

No architecture split is added for macOS in this change. The default runner output is acceptable.

### GitHub Actions Upload Paths

The desktop workflow should stop creating a macOS tarball from the generated `.app`. Instead it should upload installer files directly:

- macOS upload path: `src-tauri/target/release/bundle/dmg/*.dmg`
- Windows upload path: `src-tauri/target/release/bundle/nsis/*.exe`

This removes the custom packaging step and avoids shipping intermediate bundle formats when the installer is the intended artifact.

### Local Download Behavior

The `build:desktop:all` script still downloads into:

- `artifacts/desktop/<run-id>/macos/`
- `artifacts/desktop/<run-id>/windows/`

No change is required to the manifest schema beyond the implied artifact contents. The local user will now find installer files in those folders instead of tarball/application bundle outputs.

### Verification

Regression coverage should focus on the explicit artifact contract:

- workflow verification script asserts `.dmg` and `.exe` upload paths
- README explains that the downloaded outputs are installers
- existing orchestration tests remain green because artifact names are unchanged
