# Skill Versioning And App Auto-Update Design

## Overview

This change adds two release-management capabilities to the desktop configurator:

1. repository-managed per-skill version metadata
2. in-app desktop updates delivered from GitHub Releases

The constraints are:

- skills are source-controlled inside this repository
- skills do not have an independent release pipeline
- skill changes are delivered only as part of a new desktop app release
- the app must still identify which skill versions are installed on the user's machine
- rollback is out of scope

## Goals

1. Give every skill an explicit independent version number.
2. Detect and display the currently installed version of each bundled skill on the user's machine.
3. Fail CI when a skill's content changes without a corresponding skill version bump.
4. Support one-click in-app update download and install for the desktop app.
5. Reuse GitHub Actions and GitHub Releases as the single build and distribution source.

## Non-Goals

- Publish skills as independently downloadable packages.
- Add per-skill rollback or downgrade support.
- Add a custom update server outside GitHub Releases.
- Preserve OpenClaw or ClawHub compatibility.

## Design

### 1. Skill Manifest As The Source Of Truth

Add a repository-managed manifest at `skills/manifest.json`.

Each skill entry contains the metadata the app needs without introducing a standalone skill release flow:

- `id`: canonical skill identifier
- `path`: relative repository path such as `skills/jira`
- `version`: independent semver for the skill
- `displayName`: localized or plain display name
- `description`: localized or plain description
- `targets`: supported target app ids
- `contentHash`: generated hash of the packaged skill contents

Representative shape:

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-04-02T00:00:00Z",
  "skills": [
    {
      "id": "jira",
      "path": "skills/jira",
      "version": "1.3.0",
      "displayName": {
        "zh-CN": "Jira",
        "en-US": "Jira"
      },
      "description": {
        "zh-CN": "Jira 协作技能",
        "en-US": "Jira collaboration skill"
      },
      "targets": ["claude-code", "codex", "workbuddy"],
      "contentHash": "sha256:..."
    }
  ]
}
```

The manifest is authoritative for version metadata. The `SKILL.md` files remain the packaged skill bodies and no longer need to imply version by file contents alone.

### 2. Version Semantics

Every skill uses its own semver.

Rules:

- bump a skill version only when that skill package changes
- leave untouched skills on their existing versions
- app version remains independent from skill versions
- multiple skill versions may change in one app release

This keeps version history readable while still matching the product constraint that skills ship only with the app.

### 3. Installed Skill Version Detection

The desktop app should stop treating directory-based skills as anonymous `local` packages.

Instead:

- load repository skill metadata from `skills/manifest.json`
- when installing a skill, persist installed metadata including the manifest version into the existing installed-skill state
- expose installed version from that persisted state to the frontend
- when listing available skills, compare manifest version with installed version

On a fresh install, the app will show the bundled skill version from the manifest. After install, the machine-specific metadata remains the source of truth for "installed version".

### 4. Content Hash Guardrail

Add a verification script that computes a stable content hash per skill package.

Hash scope:

- `SKILL.md`
- files under the skill directory such as `scripts/`, `references/`, and other bundled assets
- exclude editor junk and platform-specific transient files

CI rule:

- if skill contents changed and `contentHash` changed but `version` did not, fail
- if `version` changed but the directory is missing or malformed, fail
- if manifest metadata references a non-existent skill path, fail

This gives strict version discipline without introducing a separate publishing workflow.

### 5. App Auto-Update Architecture

Use Tauri v2's official updater plugin and GitHub Releases as the only update backend.

The runtime flow is:

1. app checks the configured updater endpoint
2. endpoint resolves to a `latest.json` update manifest hosted on GitHub Releases
3. Tauri updater downloads the signed platform artifact
4. user confirms install
5. updater applies the update and relaunches

This replaces the current placeholder `check_app_updates` GitHub API lookup with real update operations while still allowing release metadata to be displayed in the UI.

### 6. Tauri Updater Configuration

The desktop app must add:

- Rust dependency: `tauri-plugin-updater`
- frontend dependency: `@tauri-apps/plugin-updater`
- app initialization: register updater plugin in `src-tauri/src/lib.rs`
- Tauri config:
  - `bundle.createUpdaterArtifacts: true`
  - `plugins.updater.pubkey`
  - `plugins.updater.endpoints`

Recommended endpoint strategy:

- use a static `latest.json` asset published to GitHub Releases
- keep a single stable endpoint URL in `tauri.conf.json`

The updater signing key pair is required because Tauri verifies updates before install.

### 7. GitHub Actions Release Pipeline

Extend the existing desktop workflow so release builds do more than produce installer artifacts.

Release behavior:

- build macOS and Windows installers
- generate updater artifacts and signatures
- generate `latest.json`
- attach installers, updater artifacts, signatures, and `latest.json` to the GitHub Release

Recommended release shape:

- normal branch `push` continues to validate buildability
- tagged release, or explicit release workflow dispatch, performs signed updater publishing

Required secrets:

- existing Apple signing and notarization secrets for distributable macOS builds
- `TAURI_SIGNING_PRIVATE_KEY`
- optional `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

The workflow remains the single source that both compiles the app and publishes update metadata.

### 8. Release Versioning Contract

The desktop app version remains defined in Tauri package metadata:

- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`

Release tags should match the app version, for example `v0.2.0`.

For each app release:

- bump the app version
- bump only the changed skill versions in `skills/manifest.json`
- run verification that the changed skills have corresponding version bumps
- publish the signed release

This creates a clear mapping:

- one app release may contain multiple skill version changes
- installed skill versions can still be shown independently inside the app

### 9. UI And Command Surface

The app should expose two related but separate update surfaces:

- skill update state:
  - derived from bundled manifest version versus installed version
  - used to show whether a skill install on disk matches the app's bundled copy
- app update state:
  - derived from Tauri updater check
  - used to drive "download and install update"

Recommended UI behavior:

- settings or tray action can trigger app update check
- if a new app version exists, show release version and notes
- provide one-click "download and install"
- after successful update and relaunch, refreshed manifest data naturally updates all bundled skill versions

## Data Flow

### Skill Version Flow

1. developer edits a skill under `skills/<id>/`
2. developer bumps that skill's `version` in `skills/manifest.json`
3. CI recomputes hashes and validates the bump
4. release bundles the manifest into the app
5. app install or upgrade persists installed skill metadata locally
6. frontend reads installed version and bundled version for display

### App Update Flow

1. GitHub Actions builds a signed release
2. workflow uploads installers, updater artifacts, signatures, and `latest.json` to GitHub Releases
3. running app checks updater endpoint
4. updater downloads and verifies platform artifact
5. user installs update
6. relaunched app includes the new bundled skill manifest

## Error Handling

Skill version management:

- invalid manifest JSON should fail fast and surface a clear startup error
- missing manifest entries for existing skill directories should be treated as verification failures in CI
- unknown installed-skill metadata should fall back to `not-installed` or `unknown`, not panic

App updater:

- updater check failure should surface a non-blocking error message
- missing signing keys should fail the release workflow
- unavailable release assets should fail the release workflow before publication is considered successful
- partial update download failure should leave the current app unchanged

## Testing And Verification

Repository verification should include:

- unit tests for manifest loading
- unit tests for version comparison and installed metadata mapping
- a script that verifies content hashes and version bumps
- a workflow verification script that asserts updater artifacts are produced and uploaded

Release verification should include:

- dry-run or validation of updater configuration in CI
- one manual smoke test on macOS and one on Windows for in-app update install

## Implementation Notes

Expected repository changes:

- add `skills/manifest.json`
- update Rust template loader and skill commands to consume manifest metadata
- add hash/version verification scripts and tests
- add Tauri updater dependencies and config
- extend desktop workflow to publish updater assets to GitHub Releases
- update the React app to expose real app update status and installation actions

## Open Questions Resolved

- Skills are not independently published: resolved by repository manifest plus app-bundled delivery.
- User machine version detection is required: resolved by persisted installed skill metadata plus manifest versions.
- Rollback is not required: no downgrade path is designed.
- Update backend should use GitHub Releases: accepted and reflected in the updater design.
