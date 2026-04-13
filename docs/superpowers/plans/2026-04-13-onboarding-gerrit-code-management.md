# Onboarding Gerrit Code Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Gerrit as an onboarding base service and installable skill, with one service card that supports HTTP and SSH connection testing and a visible `代码管理` category in the skill library.

**Architecture:** Extend the existing onboarding base-service and connection-test flow instead of introducing a parallel Gerrit-specific path. Keep Gerrit as one service with a mode selector, add narrow mode-aware filtering/completion logic, and extend skill manifest plus library rendering with optional category metadata.

**Tech Stack:** React, TypeScript, Vitest, Tauri, Rust, Python

---

### Task 1: Add Gerrit Metadata To Shared Config And Base-Service Grouping

**Files:**
- Modify: `src/shared/config.json`
- Modify: `src/content/workbuddy.ts`
- Test: `src/content/workbuddy.test.ts`

- [ ] **Step 1: Write the failing content tests**

```ts
it('exposes Gerrit as a base skill and groups it under code management', () => {
  expect(Object.keys(sharedConfig.baseSkills)).toContain('gerrit')
  expect(workbuddyBaseSkills.map((skill) => skill.value)).toContain('gerrit')
  expect(onboardingBaseSkillGroups.map((group) => group.name)).toContain('代码管理')
  expect(
    onboardingBaseSkillGroups.find((group) => group.name === '代码管理')?.skills.map((skill) => skill.id)
  ).toEqual(['gerrit'])
})

it('returns Gerrit mode-aware credential fields', () => {
  const fields = getCredentialFields(['gerrit'])
  expect(fields.map((field) => field.id)).toContain('gerritAuthMode')
  expect(fields.map((field) => field.id)).toContain('gerritUrl')
  expect(fields.map((field) => field.id)).toContain('gerritSshHost')
})
```

- [ ] **Step 2: Run the content tests to verify they fail**

Run: `npm test -- src/content/workbuddy.test.ts`

Expected: FAIL because Gerrit metadata and grouping do not exist yet.

- [ ] **Step 3: Add Gerrit config and base-service grouping**

```json
"gerrit": {
  "name": {
    "zh-CN": "Gerrit",
    "en-US": "Gerrit"
  },
  "description": {
    "zh-CN": "读取代码评审、提交状态和变更信息",
    "en-US": "Read code reviews, submit status, and change information."
  },
  "credentials": {
    "gerritAuthMode": {
      "label": {
        "zh-CN": "连接方式",
        "en-US": "Connection Mode"
      },
      "type": "single-select",
      "required": true,
      "options": [
        {
          "value": "http",
          "label": {
            "zh-CN": "网页/API 登录（推荐）",
            "en-US": "Web/API Login (Recommended)"
          }
        },
        {
          "value": "ssh",
          "label": {
            "zh-CN": "SSH 命令行（高级）",
            "en-US": "SSH Command Line (Advanced)"
          }
        }
      ]
    }
  }
}
```

- [ ] **Step 4: Add narrow Gerrit helpers in `workbuddy.ts` for visible and required credential fields**

```ts
function getGerritAuthMode(credentialValues: Record<string, string>) {
  return credentialValues.gerritAuthMode === 'ssh' ? 'ssh' : 'http'
}
```

```ts
export function getVisibleCredentialFields(
  serviceId: string,
  credentialValues: Record<string, string>
) {
  if (serviceId !== 'gerrit') {
    return credentialFieldCache[serviceId] ?? []
  }
  // Return auth-mode field plus mode-specific fields.
}
```

- [ ] **Step 5: Run the content tests to verify they pass**

Run: `npm test -- src/content/workbuddy.test.ts`

Expected: PASS

### Task 2: Add Gerrit Mode Selection To Onboarding Credential UI

**Files:**
- Modify: `src/types.ts`
- Modify: `src/features/onboarding/steps/CredentialsStep.tsx`
- Modify: `src/features/onboarding/useOnboarding.ts`
- Test: `src/features/onboarding/OnboardingShell.test.tsx`

- [ ] **Step 1: Write the failing onboarding tests**

```tsx
it('shows Gerrit in the code management group and defaults to HTTP fields', async () => {
  render(<App />)

  await user.click(await screen.findByRole('button', { name: '选择公司 IT 工具' }))

  expect(screen.getByRole('heading', { name: '代码管理' })).toBeInTheDocument()
  expect(screen.getByRole('checkbox', { name: 'Gerrit' })).toBeInTheDocument()
})

it('switches Gerrit credential fields when auth mode changes', async () => {
  mockControls.stateOverride = {
    ...fixtures.onboardingState,
    selected_base_skill_ids: ['gerrit'],
    selected_install_skill_ids: ['gerrit'],
    credential_values: {
      gerritAuthMode: 'http'
    }
  }

  render(<App />)

  await user.click(await screen.findByRole('button', { name: '选择公司 IT 工具' }))
  expect(screen.getByLabelText('Gerrit URL')).toBeInTheDocument()
  expect(screen.queryByLabelText('Gerrit SSH 主机')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run the onboarding tests to verify they fail**

Run: `npm test -- src/features/onboarding/OnboardingShell.test.tsx`

Expected: FAIL because Gerrit group, single-select rendering, and filtered fields do not exist yet.

- [ ] **Step 3: Extend credential field typing and UI rendering**

```ts
export interface WizardField {
  id: string
  type: 'single-select' | 'multi-select' | 'text' | 'url' | 'textarea' | 'password'
  label: LocalizedText
  placeholder?: LocalizedText
  required: boolean
  options?: WizardOption[]
}
```

```tsx
{field.type === 'single-select' ? (
  <select
    id={field.id}
    value={credentialValues[field.id] ?? ''}
    onChange={(event) => onUpdateCredential(field.id, event.target.value)}
  >
    {(field.options ?? []).map((option) => (
      <option key={option.value} value={option.value}>
        {option.label[locale] ?? option.label['zh-CN']}
      </option>
    ))}
  </select>
) : (
  <input ... />
)}
```

- [ ] **Step 4: Use mode-aware visible fields and required fields in the onboarding hook**

```ts
const credentialGroups = useMemo(
  () => getCredentialGroups(state.selected_base_skill_ids, locale, state.credential_values),
  [locale, state.selected_base_skill_ids, state.credential_values]
)
```

```ts
function isCredentialGroupComplete(
  group: OnboardingCredentialGroup,
  credentialValues: Record<string, string>
) {
  return group.required_field_ids.every((fieldId) => isConfiguredText(credentialValues[fieldId] ?? ''))
}
```

- [ ] **Step 5: Run the onboarding tests to verify they pass**

Run: `npm test -- src/features/onboarding/OnboardingShell.test.tsx`

Expected: PASS

### Task 3: Add Gerrit Backend Connection-Test Support

**Files:**
- Modify: `src-tauri/src/commands/onboarding.rs`
- Test: `src-tauri/src/commands/onboarding.rs`

- [ ] **Step 1: Write the failing Rust tests**

```rust
#[test]
fn build_connection_test_env_entries_supports_gerrit_http() {
    let entries = build_connection_test_env_entries(
        "gerrit",
        &HashMap::from([
            ("gerritAuthMode".to_string(), "http".to_string()),
            ("gerritUrl".to_string(), "https://gerrit.example.com".to_string()),
            ("gerritHttpUsername".to_string(), "pm".to_string()),
            ("gerritHttpPassword".to_string(), "secret".to_string()),
        ]),
    )
    .expect("gerrit http env");

    assert!(entries.contains(&("GERRIT_AUTH_MODE".to_string(), "http".to_string())));
    assert!(entries.contains(&("GERRIT_URL".to_string(), "https://gerrit.example.com".to_string())));
}

#[test]
fn build_connection_test_env_entries_supports_gerrit_ssh() {
    let entries = build_connection_test_env_entries(
        "gerrit",
        &HashMap::from([
            ("gerritAuthMode".to_string(), "ssh".to_string()),
            ("gerritSshHost".to_string(), "gerrit.example.com".to_string()),
            ("gerritSshPort".to_string(), "29418".to_string()),
            ("gerritSshUsername".to_string(), "pm".to_string()),
        ]),
    )
    .expect("gerrit ssh env");

    assert!(entries.contains(&("GERRIT_SSH_PORT".to_string(), "29418".to_string())));
}
```

- [ ] **Step 2: Run the backend tests to verify they fail**

Run: `cargo test gerrit --manifest-path src-tauri/Cargo.toml -- --nocapture`

Expected: FAIL because Gerrit is not in the onboarding service registry.

- [ ] **Step 3: Add Gerrit to the onboarding service registry and env builder**

```rust
OnboardingConnectionServiceConfig {
    service_id: "gerrit",
    required_field_ids: &["gerritAuthMode"],
},
```

```rust
"gerrit" => match require_non_empty_credential_value(credential_values, "gerritAuthMode")?.as_str() {
    "http" => Ok(vec![ ... ]),
    "ssh" => Ok(vec![ ... ]),
    other => Err(format!("Unsupported Gerrit auth mode: {}", other)),
},
```

- [ ] **Step 4: Run the backend tests to verify they pass**

Run: `cargo test gerrit --manifest-path src-tauri/Cargo.toml -- --nocapture`

Expected: PASS

### Task 4: Add Gerrit Probe Script And Python Tests

**Files:**
- Create: `skills/gerrit/scripts/test_connection.py`
- Create: `skills/gerrit/tests/test_gerrit_connection.py`

- [ ] **Step 1: Write the failing Python tests**

```python
def test_build_result_for_http_success():
    payload = module.build_result(True, "Gerrit 连接成功", "status_code: 200")
    assert payload["service_id"] == "gerrit"
    assert payload["success"] is True

def test_load_config_from_env_requires_http_fields(monkeypatch):
    monkeypatch.setenv("GERRIT_AUTH_MODE", "http")
    with pytest.raises(ValueError):
        module.load_config_from_env()
```

- [ ] **Step 2: Run the Gerrit Python tests to verify they fail**

Run: `python3 -m pytest skills/gerrit/tests/test_gerrit_connection.py`

Expected: FAIL because the Gerrit probe script does not exist yet.

- [ ] **Step 3: Implement the Gerrit probe script with HTTP and SSH branches**

```python
if auth_mode == "http":
    api_url = build_http_api_url(base_url)
    result = probe_gerrit_http(api_url, username, password)
elif auth_mode == "ssh":
    result = probe_gerrit_ssh(host, port, username)
else:
    raise ValueError(f"Unsupported GERRIT_AUTH_MODE: {auth_mode}")
```

```python
def probe_gerrit_ssh(host: str, port: str, username: str) -> Dict[str, object]:
    completed = subprocess.run(
        ["ssh", "-p", port, f"{username}@{host}", "gerrit", "version"],
        capture_output=True,
        text=True,
        timeout=10,
        check=True,
    )
    return {"command": "gerrit version", "output": completed.stdout.strip()}
```

- [ ] **Step 4: Run the Gerrit Python tests to verify they pass**

Run: `python3 -m pytest skills/gerrit/tests/test_gerrit_connection.py`

Expected: PASS

### Task 5: Add Gerrit To Skill Manifest And Category-Aware Library Display

**Files:**
- Modify: `skills/manifest.json`
- Modify: `scripts/lib/skill-manifest.cjs`
- Modify: `scripts/skill-manifest.test.ts`
- Modify: `src-tauri/src/models/skill.rs`
- Modify: `src-tauri/src/template/loader.rs`
- Modify: `src-tauri/src/commands/skill.rs`
- Modify: `src/types.ts`
- Modify: `src/content/copy.ts`
- Modify: `src/App.tsx`
- Test: `src/App.test.tsx`

- [ ] **Step 1: Write the failing manifest and app tests**

```ts
it('loads optional manifest categories', () => {
  expect(loadSkillManifest({ repoRoot }).skills[0]).toEqual(
    expect.objectContaining({ category: 'code-management' })
  )
})
```

```tsx
it('shows code management category for Gerrit in the skill library', async () => {
  render(<App />)
  await user.click(screen.getByRole('button', { name: 'Skill Library' }))
  expect(await screen.findByText('代码管理')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the manifest and app tests to verify they fail**

Run: `npm test -- scripts/skill-manifest.test.ts src/App.test.tsx`

Expected: FAIL because category metadata is not supported yet.

- [ ] **Step 3: Extend manifest schema and backend/frontend skill info**

```rust
pub struct SkillManifestEntry {
    pub id: String,
    pub path: String,
    pub version: String,
    #[serde(default)]
    pub targets: Vec<TargetAppId>,
    #[serde(default)]
    pub category: Option<String>,
    #[serde(rename = "contentHash")]
    pub content_hash: String,
}
```

```ts
export interface SkillInfo {
  id: string
  name: Record<string, string>
  description?: Record<string, string>
  version: string
  category?: string
  ...
}
```

- [ ] **Step 4: Add Gerrit to the manifest and show localized category labels in the skill library**

Add a `gerrit` manifest entry with:
- `id: gerrit`
- `path: skills/gerrit`
- `version: 1.0.0`
- `targets: ["claude-code", "codex", "workbuddy"]`
- `category: code-management`
- `contentHash` set to the exact SHA-256 value computed from the packaged Gerrit files

```tsx
{skill.category && (
  <span className="chip">{getSkillCategoryLabel(skill.category, locale)}</span>
)}
```

- [ ] **Step 5: Run the manifest and app tests to verify they pass**

Run: `npm test -- scripts/skill-manifest.test.ts src/App.test.tsx`

Expected: PASS

### Task 6: Run Cross-Stack Verification

**Files:**
- Modify as needed based on failures from prior tasks

- [ ] **Step 1: Run targeted frontend verification**

Run: `npm test -- src/content/workbuddy.test.ts src/features/onboarding/OnboardingShell.test.tsx src/App.test.tsx scripts/skill-manifest.test.ts`

Expected: PASS

- [ ] **Step 2: Run targeted Rust verification**

Run: `cargo test --manifest-path src-tauri/Cargo.toml gerrit -- --nocapture`

Expected: PASS

- [ ] **Step 3: Run targeted Gerrit Python verification**

Run: `python3 -m pytest skills/gerrit/tests/test_gerrit_connection.py`

Expected: PASS

- [ ] **Step 4: Run manifest hash verification**

Run: `npm run verify:skills`

Expected: PASS
