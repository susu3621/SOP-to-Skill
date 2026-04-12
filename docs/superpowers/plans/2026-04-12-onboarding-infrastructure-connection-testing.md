# Onboarding Infrastructure Connection Testing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-service connection testing for Confluence, Jira, and Mail in onboarding, with automatic testing after credentials become complete, manual test buttons, unified `test_connection.py` script names, and save behavior that remains independent from test results.

**Architecture:** Use one backend Tauri command to execute service-specific `scripts/test_connection.py` files through a shared registry and a temporary env file. Keep per-service test status in transient frontend state inside the onboarding hook, and render grouped credential cards with manual and automatic testing that share the same backend command.

**Tech Stack:** React, TypeScript, Vitest, Tauri, Rust, Python

---

### Task 1: Add Backend Connection-Test Contract And Registry

**Files:**
- Modify: `src-tauri/src/commands/onboarding.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Write the failing Rust tests for the backend registry and response normalization**

```rust
#[test]
fn onboarding_connection_registry_builds_mail_env_entries() {
    let entries = build_connection_test_env_entries(
        "mail",
        &HashMap::from([
            ("mailUsername".to_string(), "pm@example.com".to_string()),
            ("mailPassword".to_string(), "mail-secret".to_string()),
        ]),
    )
    .expect("mail entries");

    assert!(entries.contains(&("MAIL_HOST".to_string(), "smtp.exmail.qq.com".to_string())));
    assert!(entries.contains(&("MAIL_FROM".to_string(), "pm@example.com".to_string())));
}

#[test]
fn onboarding_connection_registry_rejects_missing_required_fields() {
    let error = build_connection_test_env_entries(
        "jira",
        &HashMap::from([
            ("jiraUrl".to_string(), "https://jira.example.com".to_string()),
        ]),
    )
    .expect_err("missing credentials should fail");

    assert!(error.contains("jiraUsername"));
}
```

- [ ] **Step 2: Run the backend tests to verify they fail**

Run: `cargo test onboarding_connection_registry --manifest-path src-tauri/Cargo.toml -- --nocapture`

Expected: FAIL because the registry helpers do not exist yet.

- [ ] **Step 3: Implement the shared registry and normalized backend types**

```rust
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct OnboardingConnectionTestResult {
    pub service_id: String,
    pub success: bool,
    pub status: String,
    pub summary: String,
    pub details: String,
    pub trigger: String,
    pub tested_fingerprint: String,
}
```

```rust
struct ConnectionTestServiceConfig {
    service_id: &'static str,
    required_field_ids: &'static [&'static str],
    script_relative_path: &'static [&'static str],
}
```

- [ ] **Step 4: Add the new Tauri command and register it**

```rust
#[tauri::command]
pub fn test_onboarding_connection(
    service_id: String,
    credential_values: HashMap<String, String>,
    trigger: String,
) -> SkillResult<OnboardingConnectionTestResult> {
    run_onboarding_connection_test(&service_id, &credential_values, &trigger).into()
}
```

- [ ] **Step 5: Run the backend tests to verify they pass**

Run: `cargo test onboarding_connection_registry --manifest-path src-tauri/Cargo.toml -- --nocapture`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src-tauri/src/commands/onboarding.rs src-tauri/src/lib.rs
git commit -m "feat: add onboarding connection test backend"
```

### Task 2: Execute Probe Scripts Through Temporary Env Files

**Files:**
- Modify: `src-tauri/src/commands/onboarding.rs`

- [ ] **Step 1: Write the failing Rust tests for temp-env execution helpers**

```rust
#[test]
fn onboarding_connection_test_writes_temp_env_without_touching_home_env() {
    let env_path = temp_dir("connection-test").join(".env");
    let entries = vec![("JIRA_URL".to_string(), "https://jira.example.com".to_string())];

    let written = write_connection_test_env_file(&env_path, &entries).expect("write temp env");

    let content = fs::read_to_string(written).expect("read temp env");
    assert!(content.contains("JIRA_URL=\"https://jira.example.com\""));
}
```

```rust
#[test]
fn onboarding_connection_test_uses_service_test_connection_script_path() {
    let path = resolve_connection_test_script_path("jira").expect("jira script path");
    assert!(path.ends_with("jira/scripts/test_connection.py"));
}
```

- [ ] **Step 2: Run the backend tests to verify they fail**

Run: `cargo test onboarding_connection_test_ --manifest-path src-tauri/Cargo.toml -- --nocapture`

Expected: FAIL because the helpers do not exist yet.

- [ ] **Step 3: Implement temp env generation, python fallback, and process execution**

```rust
fn run_connection_probe_script(
    script_path: &Path,
    env_file: &Path,
) -> Result<std::process::Output, String> {
    // Try py -3 / python on Windows, python3 / python elsewhere.
}
```

```rust
fn normalize_probe_output(
    service_id: &str,
    trigger: &str,
    tested_fingerprint: &str,
    output: std::process::Output,
) -> OnboardingConnectionTestResult {
    // Convert exit status, stdout, and stderr into summary + details.
}
```

- [ ] **Step 4: Run the backend tests to verify they pass**

Run: `cargo test onboarding_connection_test_ --manifest-path src-tauri/Cargo.toml -- --nocapture`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/commands/onboarding.rs
git commit -m "feat: execute onboarding connection probes"
```

### Task 3: Add Frontend Connection-Test Types And Hook Logic

**Files:**
- Modify: `src/types.ts`
- Modify: `src/content/workbuddy.ts`
- Modify: `src/features/onboarding/useOnboarding.ts`
- Test: `src/features/onboarding/OnboardingShell.test.tsx`
- Test: `src/App.test.tsx`

- [ ] **Step 1: Write the failing frontend tests for grouped service testing**

```tsx
it('shows one test button per selected infrastructure service', async () => {
  render(<App />)

  await user.click(await screen.findByRole('button', { name: '选择公司 IT 工具' }))

  expect(screen.getAllByRole('button', { name: '测试连接' })).toHaveLength(2)
})
```

```tsx
it('runs connection test automatically after a service becomes complete', async () => {
  render(<App />)

  await user.click(await screen.findByRole('button', { name: '选择公司 IT 工具' }))
  await user.type(screen.getByLabelText('Jira 密码 / API Token'), 'jira-secret')

  await waitFor(() =>
    expect(invokeMock).toHaveBeenCalledWith(
      'test_onboarding_connection',
      expect.objectContaining({ serviceId: 'jira', trigger: 'automatic' })
    )
  )
})
```

- [ ] **Step 2: Run the frontend tests to verify they fail**

Run: `npm test -- src/features/onboarding/OnboardingShell.test.tsx src/App.test.tsx`

Expected: FAIL because grouped connection-test state and command calls do not exist yet.

- [ ] **Step 3: Add transient per-service test state and shared test helpers in the onboarding hook**

```ts
export interface OnboardingConnectionTestState {
  status: 'idle' | 'pending' | 'success' | 'error'
  summary: string | null
  details: string | null
  lastTrigger: 'manual' | 'automatic' | null
  testedFingerprint: string | null
  requestId: number
}
```

```ts
async function runConnectionTest(serviceId: string, trigger: 'manual' | 'automatic') {
  const fingerprint = buildCredentialFingerprint(serviceId, state.credential_values)
  const requestId = nextRequestIdRef.current + 1
  nextRequestIdRef.current = requestId
  // invoke('test_onboarding_connection', ...)
}
```

- [ ] **Step 4: Add debounced auto-test orchestration for complete services**

```ts
useEffect(() => {
  // For each selected service:
  // if required fields are complete and fingerprint changed, debounce and run automatic test.
}, [state.selected_base_skill_ids, state.credential_values])
```

- [ ] **Step 5: Run the frontend tests to verify they pass**

Run: `npm test -- src/features/onboarding/OnboardingShell.test.tsx src/App.test.tsx`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/types.ts src/content/workbuddy.ts src/features/onboarding/useOnboarding.ts src/features/onboarding/OnboardingShell.test.tsx src/App.test.tsx
git commit -m "feat: add onboarding connection test state"
```

### Task 4: Render Service Cards, Status, And Manual Test Buttons

**Files:**
- Modify: `src/features/onboarding/steps/CredentialsStep.tsx`
- Modify: `src/features/onboarding/OnboardingShell.tsx`
- Modify: `src/features/onboarding/copy.ts`
- Test: `src/features/onboarding/OnboardingShell.test.tsx`

- [ ] **Step 1: Write the failing UI tests for per-service cards and status copy**

```tsx
it('renders grouped service cards with manual test buttons and status text', async () => {
  render(<App />)

  await user.click(await screen.findByRole('button', { name: '选择公司 IT 工具' }))

  expect(screen.getByText('Jira')).toBeInTheDocument()
  expect(screen.getByText('Confluence')).toBeInTheDocument()
  expect(screen.getAllByRole('button', { name: '测试连接' })).toHaveLength(2)
  expect(screen.getAllByText('未测试').length).toBeGreaterThan(0)
})
```

- [ ] **Step 2: Run the UI tests to verify they fail**

Run: `npm test -- src/features/onboarding/OnboardingShell.test.tsx`

Expected: FAIL because the credentials step still renders a flat field list.

- [ ] **Step 3: Implement grouped cards and wire manual-test handlers**

```tsx
<CredentialsStep
  connectionTests={connectionTests}
  credentialGroups={credentialGroups}
  onRunConnectionTest={runManualConnectionTest}
  onUpdateCredential={updateCredentialValue}
/>
```

```tsx
{credentialGroups.map((group) => (
  <section key={group.serviceId}>
    <h4>{group.title}</h4>
    <button onClick={() => onRunConnectionTest(group.serviceId)}>测试连接</button>
  </section>
))}
```

- [ ] **Step 4: Run the UI tests to verify they pass**

Run: `npm test -- src/features/onboarding/OnboardingShell.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/onboarding/steps/CredentialsStep.tsx src/features/onboarding/OnboardingShell.tsx src/features/onboarding/copy.ts src/features/onboarding/OnboardingShell.test.tsx
git commit -m "feat: render onboarding service connection cards"
```

### Task 5: Rename Probe Scripts And Update References

**Files:**
- Move: `skills/confluence/scripts/test_confluence_login.py` -> `skills/confluence/scripts/test_connection.py`
- Move: `skills/jira/scripts/test_jira_login.py` -> `skills/jira/scripts/test_connection.py`
- Move: `skills/mail/scripts/test_mail_login.py` -> `skills/mail/scripts/test_connection.py`
- Modify: `skills/confluence/tests/test_confluence_login.py`
- Modify: `skills/jira/tests/test_jira_login.py`
- Modify: `skills/mail/tests/test_mail_login.py`
- Modify: skill docs and README files that reference old names

- [ ] **Step 1: Write the failing Python path-reference tests**

```python
def test_script_path():
    script_path = Path(__file__).resolve().parents[1] / "scripts" / "test_connection.py"
    assert script_path.exists()
```

- [ ] **Step 2: Run the Python tests to verify they fail**

Run: `pytest skills/confluence/tests/test_confluence_login.py skills/jira/tests/test_jira_login.py skills/mail/tests/test_mail_login.py -q`

Expected: FAIL because the renamed files do not exist yet.

- [ ] **Step 3: Rename the scripts and update references to the new canonical filename**

```bash
mv skills/confluence/scripts/test_confluence_login.py skills/confluence/scripts/test_connection.py
mv skills/jira/scripts/test_jira_login.py skills/jira/scripts/test_connection.py
mv skills/mail/scripts/test_mail_login.py skills/mail/scripts/test_connection.py
```

- [ ] **Step 4: Run the Python tests to verify they pass**

Run: `pytest skills/confluence/tests/test_confluence_login.py skills/jira/tests/test_jira_login.py skills/mail/tests/test_mail_login.py -q`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add skills/confluence skills/jira skills/mail
git commit -m "refactor: unify infrastructure connection probe names"
```

### Task 6: Final Integrated Verification

**Files:**
- Verify: `src/features/onboarding/OnboardingShell.test.tsx`
- Verify: `src/App.test.tsx`
- Verify: `src-tauri/src/commands/onboarding.rs`
- Verify: `skills/confluence/tests/test_confluence_login.py`
- Verify: `skills/jira/tests/test_jira_login.py`
- Verify: `skills/mail/tests/test_mail_login.py`

- [ ] **Step 1: Run targeted frontend verification**

Run: `npm test -- src/features/onboarding/OnboardingShell.test.tsx src/App.test.tsx`

Expected: PASS

- [ ] **Step 2: Run targeted backend verification**

Run: `cargo test --manifest-path src-tauri/Cargo.toml onboarding_`

Expected: PASS

- [ ] **Step 3: Run targeted Python verification**

Run: `pytest skills/confluence/tests/test_confluence_login.py skills/jira/tests/test_jira_login.py skills/mail/tests/test_mail_login.py -q`

Expected: PASS

- [ ] **Step 4: Review the working tree and summarize residual risk**

Run: `git status --short`

Expected: only the intended implementation files are modified.
