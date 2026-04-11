# Onboarding Early Infrastructure Credentials Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move infrastructure credential entry into the first onboarding module and sync selected credentials to `~/.env` when that module is saved.

**Architecture:** Keep the existing onboarding state shape and move ownership of `credential_values` from the install module to the basic infrastructure module. Add one backend command that reuses onboarding credential sync logic so the frontend can save state first and then immediately write managed env entries before the install step.

**Tech Stack:** React, TypeScript, Vitest, Tauri, Rust

---

### Task 1: Lock The UI Behavior With Failing Tests

**Files:**
- Modify: `src/features/onboarding/OnboardingShell.test.tsx`

- [ ] **Step 1: Write the failing UI expectations**

```tsx
it('renders selected infrastructure credential inputs inside the basic module and not the install module', async () => {
  renderOnboardingShell({
    selected_base_skill_ids: ['jira', 'confluence'],
    credential_values: {},
  })

  await user.click(screen.getByRole('button', { name: '选择公司 IT 工具' }))

  expect(screen.getByLabelText('Jira URL')).toBeInTheDocument()
  expect(screen.getByLabelText('Confluence 用户名')).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: '安装到 AI 工具' }))

  expect(screen.queryByLabelText('Jira URL')).not.toBeInTheDocument()
  expect(screen.queryByText('账号凭证')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run the focused UI test and verify it fails**

Run: `npm test -- src/features/onboarding/OnboardingShell.test.tsx -t "renders selected infrastructure credential inputs inside the basic module and not the install module"`
Expected: FAIL because credentials still render inside the install module.

- [ ] **Step 3: Add a dirty/save ownership test**

```tsx
it('treats credential edits as basic-module changes', async () => {
  renderOnboardingShell({
    selected_base_skill_ids: ['jira'],
    credential_values: { jiraUrl: 'https://jira.example.com' },
  })

  await user.click(screen.getByRole('button', { name: '选择公司 IT 工具' }))
  await user.clear(screen.getByLabelText('Jira URL'))
  await user.type(screen.getByLabelText('Jira URL'), 'https://next.example.com')

  expect(screen.getByRole('button', { name: '保存设置' })).toBeEnabled()
})
```

- [ ] **Step 4: Run the focused dirty-state test and verify it fails**

Run: `npm test -- src/features/onboarding/OnboardingShell.test.tsx -t "treats credential edits as basic-module changes"`
Expected: FAIL because credential dirty state is still tracked by the install module.

### Task 2: Lock The Backend Sync Behavior With Failing Tests

**Files:**
- Modify: `src-tauri/src/commands/onboarding.rs`

- [ ] **Step 1: Add a backend unit test for early credential sync**

```rust
#[test]
fn onboarding_sync_credentials_command_writes_selected_base_skill_credentials_to_home_env_file() {
    // build onboarding state with jira + mail credentials
    // write existing unrelated env content
    // call the new sync command/helper
    // assert unrelated vars stay
    // assert jira/mail keys are present
}
```

- [ ] **Step 2: Run the focused Rust test and verify it fails**

Run: `cargo test --manifest-path src-tauri/Cargo.toml onboarding_sync_credentials_command_writes_selected_base_skill_credentials_to_home_env_file`
Expected: FAIL because no early-sync command exists yet.

### Task 3: Implement Frontend Ownership Move

**Files:**
- Modify: `src/features/onboarding/OnboardingShell.tsx`
- Modify: `src/features/onboarding/useOnboarding.ts`
- Modify: `src/features/onboarding/copy.ts`

- [ ] **Step 1: Move the credentials panel into the basic module**

```tsx
<section className="summary-card onboarding-subeditor-panel">
  <SaveFeedbackBanner feedback={saveFeedbacks.baseSkills} />
  <BaseSkillSelectionPanel ... />
  <div className="onboarding-credentials-panel">
    <h3>{getOnboardingCopy(locale, onboardingCopy.credentialsTitle)}</h3>
    <p>{getOnboardingCopy(locale, onboardingCopy.credentialsBody)}</p>
    <CredentialsStep ... />
  </div>
  <div className="button-row">...</div>
</section>
```

- [ ] **Step 2: Remove the credentials panel from the install module**

```tsx
// delete the credentials summary-card from InstallModule
```

- [ ] **Step 3: Reassign dirty-state ownership**

```ts
const baseSkills =
  !areSameStringSets(state.selected_base_skill_ids, savedState.selected_base_skill_ids) ||
  !areSameStringRecords(state.credential_values, savedState.credential_values)

const install =
  !areSameStringSets(state.selected_agent_ids, savedState.selected_agent_ids) ||
  !areSameStringSets(resolvedSelectedInstallSkillIds, savedResolvedSelectedInstallSkillIds)
```

- [ ] **Step 4: Run the focused frontend tests and verify they pass**

Run: `npm test -- src/features/onboarding/OnboardingShell.test.tsx -t "renders selected infrastructure credential inputs inside the basic module and not the install module|treats credential edits as basic-module changes"`
Expected: PASS

### Task 4: Implement Early Backend Credential Sync

**Files:**
- Modify: `src-tauri/src/commands/onboarding.rs`
- Modify: `src-tauri/src/commands/mod.rs` if command export wiring needs updating

- [ ] **Step 1: Add a dedicated Tauri command that syncs onboarding credentials**

```rust
#[tauri::command]
pub fn sync_onboarding_credentials(state: OnboardingState) -> SkillResult<bool> {
    match sync_onboarding_credentials_to_home_env(&state) {
        Ok(()) => SkillResult::Success { success: true },
        Err(error) => SkillResult::Error { error },
    }
}
```

- [ ] **Step 2: Call the command after successful basic-module save**

```ts
if (scope === 'baseSkills') {
  const syncResult = await invoke<SkillResult<boolean>>('sync_onboarding_credentials', {
    state: normalizedState,
  })
  // surface error in save feedback if sync fails
}
```

- [ ] **Step 3: Keep install-time sync as final safeguard**

```rust
if let Err(error) = sync_onboarding_credentials_to_home_env(&input.state) {
    return SkillResult::Error { error };
}
```

- [ ] **Step 4: Run the focused Rust test and verify it passes**

Run: `cargo test --manifest-path src-tauri/Cargo.toml onboarding_sync_credentials_command_writes_selected_base_skill_credentials_to_home_env_file`
Expected: PASS

### Task 5: Full Regression Verification

**Files:**
- Verify only

- [ ] **Step 1: Run the frontend onboarding suite**

Run: `npm test -- src/features/onboarding/OnboardingShell.test.tsx`
Expected: PASS

- [ ] **Step 2: Run the full frontend test suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 3: Run the relevant Rust onboarding tests**

Run: `cargo test --manifest-path src-tauri/Cargo.toml commands::onboarding`
Expected: PASS

- [ ] **Step 4: Review the requirement checklist**

Check:
- basic module contains credential entry
- install module no longer contains credential entry
- saving basic module syncs credentials
- install sync still works
