# Log Export And Storage Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a top-right export-log action backed by a real app log file, and version both persisted JSON stores so old data auto-migrates on app upgrades.

**Architecture:** Keep the UI thin: the React shell only invokes a backend export command and renders feedback. In Rust, extend startup directory setup and logging initialization, then migrate `config.json` and `onboarding-state.json` on load through explicit version constants and write-back when needed.

**Tech Stack:** React, Vitest, Tauri 2, Rust, tracing/tracing-subscriber

---

### Task 1: Document The Feature Boundary

**Files:**
- Create: `docs/superpowers/specs/2026-04-13-log-export-and-storage-migration-design.md`
- Create: `docs/superpowers/plans/2026-04-13-log-export-and-storage-migration.md`

- [ ] **Step 1: Confirm the spec captures the approved scope**

Read:

```text
docs/superpowers/specs/2026-04-13-log-export-and-storage-migration-design.md
```

Expected:

```text
Spec includes single-file log export, file-backed logging, storage_version fields, and automatic write-back migration for config.json and onboarding-state.json.
```

### Task 2: Add The Failing Frontend Tests

**Files:**
- Modify: `src/App.test.tsx`
- Modify: `src/content/copy.ts`
- Test: `src/App.test.tsx`

- [ ] **Step 1: Write the failing UI test for the new header button**

Add a test that renders `App`, waits for the onboarding home, and expects a button named `导出日志` in the header utility area.

- [ ] **Step 2: Run the focused frontend test to verify it fails**

Run:

```bash
npm test -- src/App.test.tsx
```

Expected:

```text
FAIL because the export-log button and copy do not exist yet.
```

- [ ] **Step 3: Extend the test to click the button and assert invoke('export_current_log') is used**

Mock `@tauri-apps/api/core` so `export_current_log` returns a success payload, click the button, and assert the success text appears.

- [ ] **Step 4: Add the failing error-path test**

Mock `export_current_log` to return an error string and assert the error message is rendered after click.

### Task 3: Add The Failing Rust Migration And Export Tests

**Files:**
- Modify: `src-tauri/src/commands/config.rs`
- Modify: `src-tauri/src/commands/onboarding.rs`
- Modify: `src-tauri/src/template/loader.rs`
- Modify: `src-tauri/src/models/skill.rs`
- Modify: `src-tauri/src/models/onboarding.rs`
- Test: `src-tauri/src/commands/config.rs`
- Test: `src-tauri/src/commands/onboarding.rs`

- [ ] **Step 1: Write the failing config migration test**

Add a Rust test that writes a legacy `config.json` without version fields, loads it, and expects `storage_version == 1` plus a non-empty `last_migrated_app_version`.

- [ ] **Step 2: Write the failing onboarding migration test**

Add a Rust test that writes a legacy `onboarding-state.json` without version fields, loads it, and expects version fields to be filled and the file content to be rewritten.

- [ ] **Step 3: Write the failing export-log test**

Add a Rust test that points the data root to a temp directory without `logs/app.log`, calls the export helper, and expects an error mentioning the missing log file.

- [ ] **Step 4: Run the focused Rust tests to verify they fail**

Run:

```bash
cargo test --manifest-path src-tauri/Cargo.toml config:: onboarding_state_load_supports_utf8_bom_prefixed_json
```

Expected:

```text
FAIL because storage version fields and export helpers do not exist yet.
```

### Task 4: Implement File Logging And Export

**Files:**
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/src/commands/config.rs`
- Modify: `src-tauri/src/commands/mod.rs`
- Modify: `src-tauri/src/template/loader.rs`

- [ ] **Step 1: Add the logging dependency**

Add:

```toml
tracing-appender = "0.2"
```

- [ ] **Step 2: Extend directory setup to include logs**

Ensure:

```rust
pub fn get_logs_dir() -> PathBuf { get_data_root().join("logs") }
```

and include it in `ensure_directories()`.

- [ ] **Step 3: Initialize tracing to both stdout and logs/app.log**

Create a rolling-never appender for `app.log`, keep the `WorkerGuard`, and layer stdout + file writers in `src-tauri/src/lib.rs`.

- [ ] **Step 4: Add the export command**

Implement a command that opens a save dialog, copies `logs/app.log`, and returns the destination path.

- [ ] **Step 5: Register the command in the Tauri invoke handler**

Expose `export_current_log` in `src-tauri/src/lib.rs`.

### Task 5: Implement Storage Versioning And Migration

**Files:**
- Modify: `src/types.ts`
- Modify: `src-tauri/src/models/skill.rs`
- Modify: `src-tauri/src/models/onboarding.rs`
- Modify: `src-tauri/src/commands/config.rs`
- Modify: `src-tauri/src/commands/onboarding.rs`

- [ ] **Step 1: Add version fields to the TypeScript and Rust models**

Add:

```ts
storage_version: number
last_migrated_app_version: string
```

to the frontend-facing types and matching Rust structs with serde defaults.

- [ ] **Step 2: Add current-version constants and migration helpers**

Implement helpers that:

```rust
const CURRENT_STORAGE_VERSION: u32 = 1;
const CURRENT_APP_VERSION: &str = env!("CARGO_PKG_VERSION");
```

and migrate legacy payloads to the current structure.

- [ ] **Step 3: Make config load auto-migrate and auto-save**

When `load_config()` reads an older or unversioned file, fill version fields and write the migrated config back to disk.

- [ ] **Step 4: Make onboarding load auto-migrate and auto-save**

Apply the same behavior to `load_onboarding_state()`.

### Task 6: Implement The Frontend Button And Feedback

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/content/copy.ts`
- Modify: `src/styles.css`

- [ ] **Step 1: Add localized copy**

Add labels and feedback strings for:

```text
导出日志 / Export logs
导出成功 / Log exported
导出失败 / Failed to export logs
```

- [ ] **Step 2: Add the header button**

Place the new button in `.masthead__utility`, next to update and locale controls.

- [ ] **Step 3: Wire the click handler**

Invoke `export_current_log`, then show success or error feedback inline in the header area.

### Task 7: Verify Red-Green Completion

**Files:**
- Test: `src/App.test.tsx`
- Test: `src-tauri/src/commands/config.rs`
- Test: `src-tauri/src/commands/onboarding.rs`

- [ ] **Step 1: Run focused frontend tests**

Run:

```bash
npm test -- src/App.test.tsx
```

Expected:

```text
PASS
```

- [ ] **Step 2: Run focused Rust tests**

Run:

```bash
cargo test --manifest-path src-tauri/Cargo.toml export_current_log config onboarding_state
```

Expected:

```text
PASS
```

- [ ] **Step 3: Run full verification**

Run:

```bash
npm test
cargo test --manifest-path src-tauri/Cargo.toml
```

Expected:

```text
All tests pass without regressions.
```
