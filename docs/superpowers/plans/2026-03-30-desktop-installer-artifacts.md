# Desktop Installer Artifacts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change the desktop build pipeline so GitHub Actions downloads contain macOS `.dmg` and Windows NSIS `.exe` installer files.

**Architecture:** Keep the existing workflow and local download contract, but switch the macOS Tauri target to `dmg` and upload installer directories directly from CI. Verify the change through the repository's desktop scaffold verification script and update user-facing docs to reflect the new artifact contents.

**Tech Stack:** GitHub Actions, Tauri v2 config overlays, Bash verification script, README documentation

---

## File Map

- Modify: `.github/workflows/build-desktop.yml`
  Remove the custom macOS tar step and upload `.dmg` / `.exe` installer paths.
- Modify: `src-tauri/tauri.macos.conf.json`
  Change the macOS bundle target from `app` to `dmg`.
- Modify: `scripts/verify-desktop-scaffold.sh`
  Assert the workflow now references `.dmg` and `.exe` paths and no longer references the tarball path.
- Modify: `README.md`
  Document that the downloaded desktop artifacts are installer files.

### Task 1: Add Failing Verification For Installer Artifact Paths

**Files:**
- Modify: `scripts/verify-desktop-scaffold.sh`

- [ ] **Step 1: Write the failing verification**

Update the verification script so it requires:

```bash
rg -n 'bundle/dmg/\*\.dmg' .github/workflows/build-desktop.yml
rg -n 'bundle/nsis/\*\.exe' .github/workflows/build-desktop.yml
! rg -n 'desktop-macos\.tar\.gz' .github/workflows/build-desktop.yml
```

- [ ] **Step 2: Run verification to confirm it fails**

Run: `bash scripts/verify-desktop-scaffold.sh`

Expected: FAIL because the workflow still uploads `desktop-macos.tar.gz` and `bundle/nsis/**`.

### Task 2: Switch The Workflow To Upload Installer Files

**Files:**
- Modify: `.github/workflows/build-desktop.yml`
- Modify: `src-tauri/tauri.macos.conf.json`

- [ ] **Step 1: Write the minimal implementation**

Make these changes:

- set macOS `bundle.targets` to `["dmg"]`
- set macOS artifact path to `src-tauri/target/release/bundle/dmg/*.dmg`
- set Windows artifact path to `src-tauri/target/release/bundle/nsis/*.exe`
- delete the custom macOS tarball packaging step

- [ ] **Step 2: Run verification to confirm it passes**

Run: `bash scripts/verify-desktop-scaffold.sh`

Expected: PASS

### Task 3: Update Developer Documentation

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document the new output format**

Update the dual-platform build section so it states:

- CI uploads `.dmg` for macOS
- CI uploads `.exe` for Windows
- `artifacts/desktop/<run-id>/macos/` and `.../windows/` now contain installer files

- [ ] **Step 2: Re-run verification commands**

Run:

```bash
bash scripts/verify-desktop-scaffold.sh
npm run test
```

Expected: PASS
