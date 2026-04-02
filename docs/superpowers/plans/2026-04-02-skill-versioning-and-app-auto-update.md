# Skill Versioning And App Auto-Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add repository-managed per-skill version metadata plus one-click in-app desktop updates backed by GitHub Releases.

**Architecture:** Introduce a `skills/manifest.json` file and a verification script as the version source of truth for bundled skills, then wire the Rust loader and React UI to use those versions instead of `local`. For app upgrades, register Tauri's updater plugin, expose update-check/install behavior to the frontend, and extend the desktop GitHub Actions workflow so release runs publish signed updater artifacts and `latest.json` alongside the installers.

**Tech Stack:** TypeScript, Vitest, Rust, Tauri v2, GitHub Actions, Node.js scripts

---

## File Map

- Create: `skills/manifest.json`
  Repository source of truth for bundled skill versions and content hashes.
- Create: `scripts/lib/skill-manifest.cjs`
  Shared manifest loading, hashing, and version-bump validation helpers.
- Create: `scripts/verify-skill-manifest.cjs`
  CI entrypoint that validates manifest structure, hashes, and optional base-ref version bumps.
- Create: `scripts/skill-manifest.test.ts`
  Node-side tests for manifest validation behavior.
- Modify: `package.json`
  Add a verification command for the skill manifest.
- Modify: `src-tauri/src/models/skill.rs`
  Add manifest model types and any new error variants needed by manifest loading.
- Modify: `src-tauri/src/template/loader.rs`
  Load `skills/manifest.json`, merge manifest versions into directory-package templates, and add tests.
- Modify: `src-tauri/src/commands/skill.rs`
  Keep installed-skill metadata aligned with manifest versions and expose bundled-versus-installed status cleanly.
- Modify: `src/types.ts`
  Add app update types and keep skill typing aligned with the new version source.
- Modify: `src/hooks/useUpdates.ts`
  Switch the hook from GitHub release polling to real app-update state and install actions.
- Modify: `src/App.tsx`
  Show installed skill versions from manifest-backed data and add one-click app update UI.
- Modify: `src/App.test.tsx`
  Cover the new update UI flow and version display.
- Modify: `src-tauri/Cargo.toml`
  Add `tauri-plugin-updater`.
- Modify: `src-tauri/tauri.conf.json`
  Enable updater artifacts and configure updater endpoints/public key placeholders.
- Modify: `src-tauri/src/lib.rs`
  Register the updater plugin and keep existing commands intact.
- Modify: `.github/workflows/build-desktop.yml`
  Validate the skill manifest in CI and publish updater artifacts plus `latest.json` on release-oriented runs.
- Modify: `scripts/verify-desktop-scaffold.sh`
  Assert updater-related workflow and config expectations.
- Modify: `README.md`
  Document the manifest workflow and signed updater release requirements.

### Task 1: Add Skill Manifest Verification

**Files:**
- Create: `skills/manifest.json`
- Create: `scripts/lib/skill-manifest.cjs`
- Create: `scripts/verify-skill-manifest.cjs`
- Create: `scripts/skill-manifest.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the failing manifest tests**

Create `scripts/skill-manifest.test.ts` with coverage for:

```ts
import { describe, expect, it } from 'vitest'
import {
  computeSkillContentHash,
  loadSkillManifest,
  validateSkillManifest,
} from './lib/skill-manifest.cjs'

describe('skill manifest validation', () => {
  it('fails when a skill hash changed without a version bump', async () => {
    // arrange previous/current manifests in a temp repo
    // expect validateSkillManifest(...) to report a version-bump error
  })

  it('fails when the manifest hash does not match the packaged files', async () => {
    // expect a content-hash mismatch error
  })
})
```

- [ ] **Step 2: Run the test to verify RED**

Run: `npm test -- scripts/skill-manifest.test.ts`

Expected: FAIL because the manifest helpers do not exist yet.

- [ ] **Step 3: Add the minimal manifest and validation implementation**

Create a minimal `skills/manifest.json` and Node helper implementation along these lines:

```json
{
  "schemaVersion": 1,
  "skills": [
    {
      "id": "confluence",
      "path": "skills/confluence",
      "version": "1.0.0",
      "targets": ["claude-code", "codex", "workbuddy"],
      "contentHash": "sha256:..."
    }
  ]
}
```

```js
export function validateSkillManifest({ currentManifest, previousManifest, repoRoot }) {
  const errors = []
  for (const skill of currentManifest.skills) {
    const computedHash = computeSkillContentHash(repoRoot, skill.path)
    if (computedHash !== skill.contentHash) {
      errors.push(`content hash mismatch for ${skill.id}`)
    }
    const previous = previousManifest?.skillsById?.get(skill.id)
    if (previous && previous.contentHash !== skill.contentHash && previous.version === skill.version) {
      errors.push(`version bump required for ${skill.id}`)
    }
  }
  return errors
}
```

- [ ] **Step 4: Re-run the focused manifest tests**

Run: `npm test -- scripts/skill-manifest.test.ts`

Expected: PASS

- [ ] **Step 5: Wire the manifest verification into package scripts**

Add to `package.json`:

```json
{
  "scripts": {
    "verify:skills": "node scripts/verify-skill-manifest.cjs"
  }
}
```

- [ ] **Step 6: Run the verification entrypoint**

Run: `npm run verify:skills`

Expected: PASS

### Task 2: Use Manifest Versions In Rust Skill Loading

**Files:**
- Modify: `src-tauri/src/models/skill.rs`
- Modify: `src-tauri/src/template/loader.rs`
- Modify: `src-tauri/src/commands/skill.rs`

- [ ] **Step 1: Write the failing Rust tests**

Add tests in `src-tauri/src/template/loader.rs` and `src-tauri/src/commands/skill.rs` for:

```rust
#[test]
fn loads_directory_package_version_from_manifest() {
    // create temp skills dir with manifest + SKILL.md
    // assert template.version == "1.2.3"
}

#[test]
fn installed_directory_package_persists_manifest_version() {
    // install a directory package
    // assert installed_version == "1.2.3"
}
```

- [ ] **Step 2: Run the Rust tests to verify RED**

Run: `cargo test --manifest-path src-tauri/Cargo.toml template::loader::tests::loads_directory_package_version_from_manifest commands::skill::tests::installed_directory_package_persists_manifest_version`

Expected: FAIL because manifest-backed loading does not exist yet.

- [ ] **Step 3: Implement manifest-backed loading**

Add manifest model types and merge logic similar to:

```rust
#[derive(Debug, Clone, Deserialize)]
pub struct SkillManifestEntry {
    pub id: String,
    pub path: String,
    pub version: String,
    #[serde(default)]
    pub targets: Vec<TargetAppId>,
    #[serde(rename = "contentHash")]
    pub content_hash: String,
}
```

```rust
let manifest_entry = manifest.skills.iter().find(|entry| entry.id == skill_id);
let version = manifest_entry
    .map(|entry| entry.version.clone())
    .unwrap_or_else(|| "local".to_string());
```

- [ ] **Step 4: Re-run the focused Rust tests**

Run: `cargo test --manifest-path src-tauri/Cargo.toml template::loader::tests::loads_directory_package_version_from_manifest commands::skill::tests::installed_directory_package_persists_manifest_version`

Expected: PASS

- [ ] **Step 5: Run the full Rust suite**

Run: `cargo test --manifest-path src-tauri/Cargo.toml`

Expected: PASS

### Task 3: Expose App Updates In The Desktop UI

**Files:**
- Modify: `src/types.ts`
- Modify: `src/hooks/useUpdates.ts`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/tauri.conf.json`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Write the failing frontend test**

Add a test in `src/App.test.tsx` that expects:

```tsx
it('shows an app update action when a newer desktop release is available', async () => {
  // mock updater state
  // render <App />
  // expect to find "下载并安装更新"
})
```

- [ ] **Step 2: Run the focused frontend test to verify RED**

Run: `npm test -- src/App.test.tsx`

Expected: FAIL because the update UI and hook contract do not exist yet.

- [ ] **Step 3: Add the minimal updater integration**

Implement:

```rust
.setup(|app| {
    #[cfg(desktop)]
    app.handle().plugin(tauri_plugin_updater::Builder::new().build());
    Ok(())
})
```

```json
{
  "bundle": {
    "createUpdaterArtifacts": true
  },
  "plugins": {
    "updater": {
      "pubkey": "$UPDATER_PUBLIC_KEY",
      "endpoints": ["https://github.com/juns-project/skills-for-no-engineer/releases/latest/download/latest.json"]
    }
  }
}
```

```ts
export interface AppUpdateInfo {
  currentVersion: string
  version: string
  available: boolean
  notes?: string
}
```

```ts
const update = await check()
if (update) {
  await update.downloadAndInstall()
  await relaunch()
}
```

If using Rust commands instead of direct JS plugin calls, keep the same UI contract and test expectations.

- [ ] **Step 4: Re-run the focused frontend test**

Run: `npm test -- src/App.test.tsx`

Expected: PASS

- [ ] **Step 5: Run the full frontend suite**

Run: `npm test`

Expected: PASS

### Task 4: Publish Updater Assets From GitHub Actions

**Files:**
- Modify: `.github/workflows/build-desktop.yml`
- Modify: `scripts/verify-desktop-scaffold.sh`
- Modify: `README.md`

- [ ] **Step 1: Write the failing workflow verification**

Extend `scripts/verify-desktop-scaffold.sh` to assert:

```bash
rg -n 'npm run verify:skills' .github/workflows/build-desktop.yml
rg -n 'createUpdaterArtifacts' src-tauri/tauri.conf.json
rg -n 'latest\\.json' .github/workflows/build-desktop.yml
rg -n 'TAURI_SIGNING_PRIVATE_KEY' .github/workflows/build-desktop.yml
```

- [ ] **Step 2: Run verification to verify RED**

Run: `bash scripts/verify-desktop-scaffold.sh`

Expected: FAIL because the workflow does not yet validate the skill manifest or publish updater metadata.

- [ ] **Step 3: Implement the minimal workflow changes**

Update `.github/workflows/build-desktop.yml` so that:

```yml
jobs:
  verify-web-shell:
    steps:
      - run: npm ci
      - run: npm run verify:skills
      - run: npm run test
      - run: npm run build
```

and release-oriented runs export signing env vars and publish updater assets together with installers.

- [ ] **Step 4: Re-run workflow verification**

Run: `bash scripts/verify-desktop-scaffold.sh`

Expected: PASS

- [ ] **Step 5: Re-run the repository verification commands**

Run:

```bash
npm run verify:skills
npm test
cargo test --manifest-path src-tauri/Cargo.toml
bash scripts/verify-desktop-scaffold.sh
```

Expected: PASS

## Self-Review

- Spec coverage:
  - manifest source of truth: Task 1 and Task 2
  - installed skill version detection: Task 2
  - one-click app update: Task 3
  - GitHub Actions release pipeline: Task 4
- Placeholder scan:
  - every task includes exact files, commands, and expected pass/fail checks
- Type consistency:
  - `version`, `contentHash`, and `targets` are used consistently across manifest, Rust loader, and UI plan steps
