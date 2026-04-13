# Onboarding SVN Version Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add SVN as a bundled onboarding base skill and installable package, and rename the existing code-management grouping to version-management across onboarding and the skill library.

**Architecture:** Extend the existing Gerrit path rather than inventing a new abstraction. Add `svn` to shared config, frontend grouping, backend connection-test service support, and the repository skill manifest, then create a small `skills/svn` package with its own connection probe and tests.

**Tech Stack:** TypeScript, Vitest, Rust, Tauri onboarding commands, Python probe scripts, repository-managed skill manifest

---

### Task 1: Lock the new SVN and version-management behavior with failing tests

**Files:**
- Modify: `src/content/workbuddy.test.ts`
- Modify: `src/features/onboarding/OnboardingShell.test.tsx`
- Modify: `src/App.test.tsx`
- Modify: `scripts/skill-manifest.test.ts`
- Modify: `src-tauri/src/commands/onboarding.rs`

- [ ] **Step 1: Add frontend expectations for SVN and `版本管理`**

```ts
expect(Object.keys(sharedConfig.baseSkills)).toEqual(['confluence', 'jira', 'gerrit', 'svn', 'mail'])
expect(onboardingBaseSkillGroups.map((group) => group.name)).toEqual([
  'Wiki 系统',
  '问题管理系统',
  '版本管理',
  '通信系统',
])
expect(
  onboardingBaseSkillGroups.find((group) => group.name === '版本管理')?.skills.map((skill) => skill.id)
).toEqual(['gerrit', 'svn'])
```

- [ ] **Step 2: Add UI expectations for the onboarding infrastructure editor**

```ts
expect(screen.getByRole('heading', { name: '版本管理' })).toBeInTheDocument()
expect(screen.getByRole('checkbox', { name: 'SVN' })).toBeInTheDocument()
expect(screen.getByLabelText('SVN URL')).toBeInTheDocument()
expect(screen.getByLabelText('SVN 用户名')).toBeInTheDocument()
expect(screen.getByLabelText('SVN 密码')).toBeInTheDocument()
```

- [ ] **Step 3: Add backend and manifest regression tests**

```rust
let entries = build_connection_test_env_entries(
    "svn",
    &HashMap::from([
        ("svnUrl".to_string(), "https://svn.example.com/repo".to_string()),
        ("svnUsername".to_string(), "svn.user".to_string()),
        ("svnPassword".to_string(), "svn-secret".to_string()),
    ]),
)?;
assert!(entries.contains(&("SVN_URL".to_string(), "https://svn.example.com/repo".to_string())));
```

```ts
expect(loadSkillManifest({ repoRoot })).toEqual({
  schemaVersion: 1,
  skills: [expect.objectContaining({ id: 'svn', category: 'version-management' })],
})
```

- [ ] **Step 4: Run focused tests to verify RED**

Run:
- `npm test -- src/content/workbuddy.test.ts src/features/onboarding/OnboardingShell.test.tsx src/App.test.tsx scripts/skill-manifest.test.ts`
- `cargo test svn --manifest-path src-tauri/Cargo.toml -- --nocapture`

Expected:
- frontend tests fail because `svn` and `版本管理` do not exist yet
- Rust tests fail because `svn` is not supported by onboarding connection testing

### Task 2: Implement SVN in config, frontend grouping, and backend onboarding support

**Files:**
- Modify: `src/shared/config.json`
- Modify: `src/content/workbuddy.ts`
- Modify: `src/App.tsx`
- Modify: `src-tauri/src/commands/onboarding.rs`

- [ ] **Step 1: Add the shared-config base skill**

```json
"svn": {
  "name": {
    "zh-CN": "SVN",
    "en-US": "SVN"
  },
  "description": {
    "zh-CN": "读取版本库目录、历史提交和工作副本状态，支持常见 SVN 操作。",
    "en-US": "Read repository paths, history, and working-copy state, and support common SVN operations."
  },
  "credentials": {
    "svnUrl": { "type": "text", "required": true },
    "svnUsername": { "type": "text", "required": true },
    "svnPassword": { "type": "password", "required": true }
  }
}
```

- [ ] **Step 2: Rename the group and include both skills**

```ts
{
  id: 'version-management',
  name: {
    'zh-CN': '版本管理',
    'en-US': 'Version Management',
  },
  skill_ids: ['gerrit', 'svn'],
}
```

- [ ] **Step 3: Add SVN connection-test env support**

```rust
"svn" => Ok(vec![
    ("SVN_URL".to_string(), require_non_empty_credential_value(credential_values, "svnUrl")?),
    ("SVN_USERNAME".to_string(), require_non_empty_credential_value(credential_values, "svnUsername")?),
    ("SVN_PASSWORD".to_string(), require_non_empty_credential_value(credential_values, "svnPassword")?),
]),
```

- [ ] **Step 4: Re-run the focused frontend and Rust tests**

Run:
- `npm test -- src/content/workbuddy.test.ts src/features/onboarding/OnboardingShell.test.tsx src/App.test.tsx`
- `cargo test svn --manifest-path src-tauri/Cargo.toml -- --nocapture`

Expected: the new config/group/backend coverage passes.

### Task 3: Add the bundled `skills/svn` package and manifest entry

**Files:**
- Create: `skills/svn/SKILL.md`
- Create: `skills/svn/scripts/test_connection.py`
- Create: `skills/svn/tests/test_svn_connection.py`
- Modify: `skills/manifest.json`

- [ ] **Step 1: Create the skill body**

```md
# SVN

常用流程：
- `svn checkout`
- `svn update`
- `svn status`
- `svn log`
- `svn add`
- `svn commit`
- `svn revert`
```

- [ ] **Step 2: Add the Python connection probe**

```python
completed = runner(
    [
        "svn",
        "info",
        url,
        "--non-interactive",
        "--username",
        username,
        "--password",
        password,
        "--no-auth-cache",
    ],
    capture_output=True,
    text=True,
    timeout=10,
    check=True,
)
```

- [ ] **Step 3: Add the manifest entry and update Gerrit category**

```json
{
  "id": "svn",
  "path": "skills/svn",
  "version": "1.0.0",
  "targets": ["claude-code", "codex", "workbuddy"],
  "category": "version-management"
}
```

- [ ] **Step 4: Run Python and manifest tests**

Run:
- `python3 -m pytest skills/svn/tests/test_svn_connection.py`
- `npm test -- scripts/skill-manifest.test.ts`

Expected: both pass.

### Task 4: Compute the manifest hash and verify the full change

**Files:**
- Modify: `skills/manifest.json`

- [ ] **Step 1: Compute the SVN content hash and write it into the manifest**

Run:
- `node -e "const { computeSkillContentHash } = require('./scripts/lib/skill-manifest.cjs'); console.log(computeSkillContentHash({ repoRoot: process.cwd(), skillPath: 'skills/svn' }))"`

Expected: print one `sha256:...` hash for `skills/svn`.

- [ ] **Step 2: Run full verification**

Run:
- `npm test`
- `python3 -m pytest skills/svn/tests/test_svn_connection.py skills/gerrit/tests/test_gerrit_connection.py`
- `cargo test --manifest-path src-tauri/Cargo.toml`

Expected: all suites pass with zero failures.

- [ ] **Step 3: Inspect the final diff**

Run: `git status --short`
Expected: only the intended config, frontend, backend, skill, manifest, test, and docs files are changed.
