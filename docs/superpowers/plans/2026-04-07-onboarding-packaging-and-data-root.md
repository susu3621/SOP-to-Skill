# Onboarding Packaging And Data Root Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename remaining onboarding install labels, package filenames, and app-owned data roots to `sop-to-skill` while keeping the visible app title as `SOP to Skill`.

**Architecture:** Keep the UI title and Tauri identifier unchanged, but convert generated-skill summaries to explicit `生产用 / 测试用` groupings, rename artifact filenames at the Rust/workflow/deploy boundary, and centralize app-owned data-root resolution behind a new slug-aware helper that migrates legacy `SkillConfigurator` data into `sop-to-skill` on first use.

**Tech Stack:** React, TypeScript, Vitest, Rust, Tauri, GitHub Actions, Bash, PowerShell

---

## File Structure

- `src/features/onboarding/steps/InstallSelectionStep.tsx`
  Renders install-page generated-skill table headers and per-cell environment labels.
- `src/features/onboarding/OnboardingShell.tsx`
  Builds the home-screen summary model; needs a structured install-summary section instead of a flat list.
- `src/features/onboarding/OnboardingShell.test.tsx`
  Owns regression coverage for install-page and home-summary behavior.
- `src/styles.css`
  Needs shared summary-table styling for both install page and home-screen summary.
- `src-tauri/Cargo.toml`
  Controls the Rust package/binary name that produces the Windows executable.
- `.github/workflows/build-desktop.yml`
  Publishes Windows and macOS artifacts; bundle paths and artifact copy steps need slug-aware names.
- `scripts/deploy-windows-artifact.sh`
  Uploads the built Windows executable and verifies the remote process; all hardcoded `skill-configurator` filenames must change.
- `scripts/install-skill-configurator.ps1`
  Launches the remote portable executable; rename this script and the default exe path it expects.
- `scripts/verify-desktop-scaffold.sh`
  Verifies workflow and deployment contracts; update expected filenames and script names.
- `src-tauri/src/template/loader.rs`
  Central place for app-owned data-root resolution; introduce `sop-to-skill` root + legacy migration.
- `src-tauri/src/commands/config.rs`
  Uses the app-owned data-root for “open config/data directory” commands; must route through the new helper.
- `src-tauri/src/onboarding/generator.rs`
  Uses the app-owned data root for staged onboarding packages; must reuse the new helper.
- `src/App.tsx`
  Shows the current data directory hint; update any hardcoded old path examples.

### Task 1: Lock the UI copy and summary shape with failing tests

**Files:**
- Modify: `src/features/onboarding/OnboardingShell.test.tsx`
- Test: `src/features/onboarding/OnboardingShell.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add two tests:

```tsx
it('renders generated install skill headers as 生产用 and 测试用', async () => {
  const user = userEvent.setup()
  render(<App />)
  await screen.findByRole('heading', { name: '开始设置' })
  await user.click(screen.getByRole('button', { name: '安装技能' }))

  const table = await screen.findByRole('table', { name: '岗位生成技能列表' })
  expect(within(table).getByRole('columnheader', { name: '生产用' })).toBeInTheDocument()
  expect(within(table).getByRole('columnheader', { name: '测试用' })).toBeInTheDocument()
})

it('renders home install summary as grouped use-case rows with production and test columns', async () => {
  render(<App />)
  await screen.findByRole('heading', { name: '开始设置' })

  const summary = screen.getByRole('region', { name: '已设置内容' })
  const installGroup = within(summary).getByText('安装技能').closest('.onboarding-home-summary__group') as HTMLElement
  expect(within(installGroup).getByRole('columnheader', { name: '岗位用例' })).toBeInTheDocument()
  expect(within(installGroup).getByRole('columnheader', { name: '生产用' })).toBeInTheDocument()
  expect(within(installGroup).getByRole('columnheader', { name: '测试用' })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `npm test -- src/features/onboarding/OnboardingShell.test.tsx -t "renders generated install skill headers as 生产用 and 测试用|renders home install summary as grouped use-case rows with production and test columns"`

Expected:
- FAIL because the install-page headers still say `生产技能 / 测试技能`
- FAIL because the home summary still renders `安装技能` as a flat chip/value list

### Task 2: Implement the onboarding UI rename and grouped home summary

**Files:**
- Modify: `src/features/onboarding/steps/InstallSelectionStep.tsx`
- Modify: `src/features/onboarding/OnboardingShell.tsx`
- Modify: `src/styles.css`
- Test: `src/features/onboarding/OnboardingShell.test.tsx`

- [ ] **Step 1: Rename the install-page generated-skill labels**

Update the existing table labels:

```tsx
<th scope="col">生产用</th>
<th scope="col">测试用</th>
...
<td data-label="生产用">
  <GeneratedSkillToggle title="生产用" ... />
</td>
<td data-label="测试用">
  <GeneratedSkillToggle title="测试用" ... />
</td>
```

- [ ] **Step 2: Replace the home-summary install list with grouped rows**

Change the `OnboardingShell.tsx` summary model from a generic string array to a typed install summary:

```tsx
interface HomeInstallSummaryRow {
  useCaseName: string
  productionLabel: string
  testLabel: string
}
```

Build rows from `savedState.role_use_case_contents` and `savedResolvedSelectedInstallSkillIds`, showing `未安装` when a variant is not selected.

- [ ] **Step 3: Render the grouped home summary**

Add a specialized renderer for the `安装技能` group:

```tsx
<table aria-label="安装技能汇总" className="onboarding-home-install-table">
  <thead>
    <tr>
      <th scope="col">岗位用例</th>
      <th scope="col">生产用</th>
      <th scope="col">测试用</th>
    </tr>
  </thead>
</table>
```

Use the existing row order from `savedState.role_use_case_contents`.

- [ ] **Step 4: Add the supporting CSS**

Add shared summary-table styling and a responsive stacked layout for the home summary table.

- [ ] **Step 5: Run the onboarding test file**

Run: `npm test -- src/features/onboarding/OnboardingShell.test.tsx`

Expected: PASS

- [ ] **Step 6: Commit the UI changes**

```bash
git add src/features/onboarding/steps/InstallSelectionStep.tsx src/features/onboarding/OnboardingShell.tsx src/features/onboarding/OnboardingShell.test.tsx src/styles.css
git commit -m "feat: align onboarding install labels and summary"
```

### Task 3: Rename artifact filenames to `sop-to-skill`

**Files:**
- Modify: `src-tauri/Cargo.toml`
- Modify: `.github/workflows/build-desktop.yml`
- Modify: `scripts/deploy-windows-artifact.sh`
- Modify: `scripts/install-skill-configurator.ps1` (rename to `scripts/install-sop-to-skill.ps1`)
- Modify: `scripts/verify-desktop-scaffold.sh`
- Test: `scripts/build-desktop-all.test.ts`

- [ ] **Step 1: Write the failing verification/test updates**

Adjust checks to expect the new filenames:

```bash
rg -n 'target/release/sop-to-skill\.exe' .github/workflows/build-desktop.yml
rg -n 'bundle/dmg/sop-to-skill-.*\.dmg' .github/workflows/build-desktop.yml
test -f scripts/install-sop-to-skill.ps1
```

Add or update any JS tests that assert the old Windows executable path.

- [ ] **Step 2: Run the focused verification/test command to verify it fails**

Run: `npm test -- scripts/build-desktop-all.test.ts && bash scripts/verify-desktop-scaffold.sh`

Expected: FAIL on old `skill-configurator.exe` and old installer-script expectations.

- [ ] **Step 3: Rename the binary/package output**

Update `src-tauri/Cargo.toml`:

```toml
[package]
name = "sop-to-skill"
```

Keep:

```toml
[lib]
name = "skill_configurator_lib"
```

so Rust module names do not need a large refactor.

- [ ] **Step 4: Update workflow, deploy, and verify scripts**

Apply these output names consistently:

```yaml
bundle_path: src-tauri/target/release/sop-to-skill.exe
```

```bash
REMOTE_EXECUTABLE='sop-to-skill.exe'
REMOTE_SCRIPT='install-sop-to-skill.ps1'
REMOTE_DIR="sop-to-skill-portable-$(date +%Y%m%d-%H%M%S)"
```

In the PowerShell launcher:

```powershell
$exePath = Join-Path $remoteDir 'sop-to-skill.exe'
$taskName = "SopToSkillPortable-$([DateTime]::Now.ToString('yyyyMMdd-HHmmss'))"
```

- [ ] **Step 5: Run the focused packaging verification again**

Run: `npm test -- scripts/build-desktop-all.test.ts && bash scripts/verify-desktop-scaffold.sh`

Expected: PASS

- [ ] **Step 6: Commit the packaging rename**

```bash
git add src-tauri/Cargo.toml .github/workflows/build-desktop.yml scripts/deploy-windows-artifact.sh scripts/install-sop-to-skill.ps1 scripts/verify-desktop-scaffold.sh scripts/build-desktop-all.test.ts
git commit -m "feat: rename desktop artifacts to sop-to-skill"
```

### Task 4: Move the app-owned data root to `sop-to-skill` with legacy migration

**Files:**
- Modify: `src-tauri/src/template/loader.rs`
- Modify: `src-tauri/src/commands/config.rs`
- Modify: `src-tauri/src/onboarding/generator.rs`
- Modify: `src/App.tsx`
- Test: `src-tauri/src/template/loader.rs`

- [ ] **Step 1: Write the failing Rust tests**

Add tests that exercise a temporary legacy root and new root:

```rust
#[test]
fn migrates_legacy_skill_configurator_data_into_sop_to_skill_root() {
    let legacy_root = temp_dir("loader-legacy-root");
    let new_root = temp_dir("loader-new-root");
    fs::write(legacy_root.join("config.json"), "{}").unwrap();

    let resolved = resolve_data_root_for_tests(&new_root, &legacy_root).unwrap();

    assert_eq!(resolved, new_root);
    assert!(new_root.join("config.json").exists());
}
```

Also cover idempotence where the new root already has the file and should win.

- [ ] **Step 2: Run the Rust test target to verify it fails**

Run: `cargo test --manifest-path src-tauri/Cargo.toml template::loader::tests`

Expected: FAIL because no migration helper exists and paths still use `SkillConfigurator`

- [ ] **Step 3: Implement a central data-root helper plus migration**

In `loader.rs`, introduce:

```rust
const DATA_DIR_SLUG: &str = "sop-to-skill";
const LEGACY_DATA_DIR_NAME: &str = "SkillConfigurator";
```

and a resolver like:

```rust
fn get_data_root() -> PathBuf {
    if let Ok(path) = env::var("SKILL_CONFIGURATOR_DATA_DIR") {
        return PathBuf::from(path);
    }

    let base = dirs::data_dir().expect("Failed to get data directory");
    let new_root = base.join(DATA_DIR_SLUG);
    let legacy_root = base.join(LEGACY_DATA_DIR_NAME);
    migrate_legacy_data_root_if_needed(&new_root, &legacy_root).expect("migrate legacy data root");
    new_root
}
```

Migration rule:
- if `new_root` exists, keep it
- if `new_root` does not exist and `legacy_root` exists, create `new_root` and copy app-owned files/directories into it without overwriting existing new-root content

- [ ] **Step 4: Route config/onboarding callers through the new helper**

In `config.rs`, stop joining `SkillConfigurator` directly and instead use the template helper:

```rust
let data_dir = crate::template::get_data_root();
```

Update any front-end help text in `App.tsx` that still shows `SkillConfigurator`.

- [ ] **Step 5: Run the Rust test target again**

Run: `cargo test --manifest-path src-tauri/Cargo.toml template::loader::tests`

Expected: PASS

- [ ] **Step 6: Commit the data-root migration**

```bash
git add src-tauri/src/template/loader.rs src-tauri/src/commands/config.rs src-tauri/src/onboarding/generator.rs src/App.tsx
git commit -m "feat: migrate app data root to sop-to-skill"
```

### Task 5: Full verification and Windows redeploy

**Files:**
- Verify: repository working tree
- Deploy: Windows portable artifact flow

- [ ] **Step 1: Run full desktop verification**

Run: `npm run verify:desktop`

Expected: PASS with the updated onboarding tests, Rust tests, JS tests, and build checks.

- [ ] **Step 2: Push the branch**

```bash
git push origin feature/windows-auto-deploy
```

- [ ] **Step 3: Rebuild and deploy the new Windows portable binary**

Run: `npm run deploy:windows -- 192.168.9.12 juns`

Expected:
- GitHub workflow run completes successfully
- Remote result JSON reports `exePath` ending in `sop-to-skill.exe`
- Remote process runs in `SessionId: 1`

- [ ] **Step 4: Verify remote filename and app-owned data root**

Run:

```bash
ssh -o StrictHostKeyChecking=no juns@192.168.9.12 "powershell -NoProfile -Command \"Get-Process sop-to-skill -ErrorAction SilentlyContinue | Select-Object ProcessName,Id,SessionId,Path | ConvertTo-Json -Compress\""
```

and:

```bash
ssh -o StrictHostKeyChecking=no juns@192.168.9.12 "powershell -NoProfile -Command \"Get-ChildItem \$env:APPDATA -Force | Where-Object { \$_.Name -eq 'sop-to-skill' -or \$_.Name -eq 'SkillConfigurator' } | Select-Object Name,FullName | ConvertTo-Json -Compress\""
```

Expected:
- running process path ends with `sop-to-skill.exe`
- `%APPDATA%\\sop-to-skill` exists
- legacy `SkillConfigurator` may still exist, but the app-owned root used going forward is `sop-to-skill`
