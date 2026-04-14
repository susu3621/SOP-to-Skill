# Onboarding UI Smoothness and Windows Install Reliability Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the visible onboarding stutter when opening the flow or selecting basic infrastructure, show immediate progress feedback while background environment checks run, avoid install-preview refresh storms caused by credential edits, and make Windows Linux-host setup recover from PyPI TLS failures while installing the correct SVN package.

**Architecture:** Move the automatic environment check trigger off the blocking render path, set pending state immediately after selection so the UI can paint before Tauri work starts, and narrow install-preview requests to only the state slices that affect generated skills. On Windows, classify Paramiko pip failures from streamed install output and retry once against the Aliyun mirror, while switching SVN auto-install to the `Slik.Subversion` winget package.

**Tech Stack:** React, TypeScript, Vitest, Rust, Tauri onboarding commands, Rust unit tests

---

### Task 1: Lock in the UI regression coverage

**Files:**
- Modify: `src/features/onboarding/OnboardingShell.test.tsx`
- Modify: `src/features/onboarding/useOnboarding.ts`
- Modify: `src/features/onboarding/OnboardingShell.tsx`

- [ ] **Step 1: Add failing tests for the onboarding responsiveness regressions**

```tsx
it('shows a home-level hint while background environment checks are pending', async () => {
  // home view should stay responsive and show the pending hint
})

it('does not refresh the install preview when only credential values change', async () => {
  // editing Jira credentials should not re-run install preview
})
```

- [ ] **Step 2: Re-run the focused onboarding shell tests and confirm the failures**

Run: `npm test -- src/features/onboarding/OnboardingShell.test.tsx -t "background environment checks are pending|only credential values change"`
Expected: FAIL before the effect and preview scopes are narrowed.

### Task 2: Remove render-path blocking and preview churn

**Files:**
- Modify: `src/features/onboarding/useOnboarding.ts`
- Modify: `src/features/onboarding/OnboardingShell.tsx`

- [ ] **Step 1: Move automatic environment checks to a post-render effect**

```ts
useEffect(() => {
  // mark selected services pending first
  // then run the actual environment check after paint
}, [...])
```

- [ ] **Step 2: Surface a global pending hint and de-prioritize heavy view switches**

```tsx
const openView = (nextView: OnboardingView) => {
  startTransition(() => setView(nextView))
}
```

- [ ] **Step 3: Trim the preview request payload so credential-only edits do not re-fetch**

```ts
const previewRequestJson = useDeferredValue(
  JSON.stringify({
    state: {
      selected_agent_ids,
      selected_role_id,
      selected_base_skill_ids,
      role_use_case_contents,
      selected_install_skill_ids,
      selected_install_skill_ids_initialized,
      selected_install_candidate_skill_ids,
      credential_values: {},
      linux_devices: [],
    },
  })
)
```

### Task 3: Harden the Windows install path

**Files:**
- Modify: `src-tauri/src/commands/onboarding.rs`
- Test: `src-tauri/src/commands/onboarding.rs`

- [ ] **Step 1: Switch SVN auto-install to the available winget package**

```rust
"Slik.Subversion"
```

- [ ] **Step 2: Retry Paramiko installs with the Aliyun mirror when pip output shows PyPI TLS failures**

```rust
fn should_retry_windows_paramiko_install_with_mirror(output_lines: &[String]) -> bool {
    // match PyPI + TLS/SSL/schannel failure markers
}
```

- [ ] **Step 3: Cover the retry behavior with focused Rust tests**

Run: `cargo test onboarding_windows_ --manifest-path src-tauri/Cargo.toml -- --nocapture`
Expected: PASS with the retry and SVN package assertions in place.

### Task 4: Verify the full onboarding regression surface

**Files:**
- Modify: `src/features/onboarding/OnboardingShell.test.tsx`
- Modify: `src-tauri/src/commands/onboarding.rs`

- [ ] **Step 1: Re-run the full onboarding shell test file**

Run: `npm test -- src/features/onboarding/OnboardingShell.test.tsx`
Expected: PASS

- [ ] **Step 2: Re-run the broader onboarding Rust suite**

Run: `cargo test onboarding_ --manifest-path src-tauri/Cargo.toml -- --nocapture`
Expected: PASS

- [ ] **Step 3: Capture the user-facing impact**

```text
Opening onboarding or selecting Linux no longer blocks the UI before feedback
appears. Windows Paramiko installs now retry through the Aliyun mirror for
PyPI TLS failures, and SVN auto-install uses the winget package that actually
exists on the target machine.
```
