# Onboarding Version Label, Linux Device Tests, and Gerrit Readability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the current build identifier in the app header, add manual Linux-device connection tests, and make Gerrit failures parse correctly and render readable text on Windows.

**Architecture:** Build metadata is computed in Tauri build-time code and fetched once by the React shell. Linux-device tests get a dedicated state path in the onboarding hook so they do not collide with existing per-service results. Gerrit parsing is fixed in the Python probe, while the Rust command layer forces UTF-8 when launching Python test scripts.

**Tech Stack:** React, TypeScript, Vitest, Rust, Tauri, Python

---

### Task 1: Lock in the requested behavior with failing tests

**Files:**
- Modify: `src/App.test.tsx`
- Modify: `src/features/onboarding/OnboardingShell.test.tsx`
- Modify: `skills/gerrit/tests/test_gerrit_connection.py`

- [ ] **Step 1: Add a failing app-shell test for the current-version label**

```tsx
it('shows the current build identifier next to the update action', async () => {
  // expect 当前版本 v0.2.0 or commit id text to render
})
```

- [ ] **Step 2: Add a failing onboarding test for Linux device manual connection tests**

```tsx
it('runs a manual connection test for a linux device', async () => {
  // add a linux device and invoke the existing test command with device values
})
```

- [ ] **Step 3: Add a failing Gerrit test for anti-XSSI JSON responses**

```python
def test_probe_gerrit_http_strips_xssi_prefix():
    ...
```

### Task 2: Implement the minimal production changes

**Files:**
- Modify: `src-tauri/build.rs`
- Modify: `src-tauri/src/update/app.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src/App.tsx`
- Modify: `src/features/onboarding/useOnboarding.ts`
- Modify: `src/features/onboarding/steps/CredentialsStep.tsx`
- Modify: `src/features/onboarding/OnboardingShell.tsx`
- Modify: `skills/gerrit/scripts/test_connection.py`
- Modify: `src-tauri/src/commands/onboarding.rs`

- [ ] **Step 1: Expose build display metadata to the frontend**
- [ ] **Step 2: Add isolated Linux-device connection-test state and UI hooks**
- [ ] **Step 3: Strip Gerrit anti-XSSI prefixes and force UTF-8 Python output**

### Task 3: Verify the integrated surface

**Files:**
- Modify: `src/App.test.tsx`
- Modify: `src/features/onboarding/OnboardingShell.test.tsx`
- Modify: `skills/gerrit/tests/test_gerrit_connection.py`
- Modify: `src-tauri/src/commands/onboarding.rs`

- [ ] **Step 1: Run `npm test -- src/App.test.tsx src/features/onboarding/OnboardingShell.test.tsx`**
- [ ] **Step 2: Run `pytest skills/gerrit/tests/test_gerrit_connection.py`**
- [ ] **Step 3: Run `cargo test onboarding_ --manifest-path src-tauri/Cargo.toml -- --nocapture`**
