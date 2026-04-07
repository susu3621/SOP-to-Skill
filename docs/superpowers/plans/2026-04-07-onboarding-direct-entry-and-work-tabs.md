# Onboarding Direct Entry And Work Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the extra click inside `选择公司 IT 工具`, switch the work page to clear `选择岗位` / `选择工作` tabs, and shorten the homepage hero title by removing the leading `把`.

**Architecture:** Keep the current onboarding state model and save semantics, but simplify the first module to a direct editor and replace the stacked role/work sidebar with semantic tabs in `OnboardingShell.tsx`. The role tab continues to use the existing role-scoped save path, while the work tab reuses the existing work editor and save flow with updated tests locking the new navigation shape.

**Tech Stack:** React, TypeScript, Vitest, Vite

---

## File Structure

- `src/content/copy.ts`
  Owns the homepage hero title string used by `App.tsx`.
- `src/App.test.tsx`
  Locks the top-level hero wording rendered on the homepage.
- `src/features/onboarding/OnboardingShell.tsx`
  Owns the onboarding home cards, the direct-edit IT-tool module, and the work-configuration tab UI.
- `src/features/onboarding/OnboardingShell.test.tsx`
  Locks the onboarding flow, direct-entry behavior, tab defaults, tab switching, and scoped save behavior.
- `src/styles.css`
  Owns the onboarding layout and will host the new work-tab styles.

### Task 1: Lock the new hero line, direct IT-tool entry, and work tabs with failing tests

**Files:**
- Modify: `src/App.test.tsx`
- Modify: `src/features/onboarding/OnboardingShell.test.tsx`
- Test: `src/App.test.tsx`
- Test: `src/features/onboarding/OnboardingShell.test.tsx`

- [ ] **Step 1: Update the homepage hero assertion in `src/App.test.tsx`**

Inside `opens the onboarding home menu instead of the legacy long-form shell`, replace the old title assertion:

```tsx
expect(
  screen.getByRole('heading', {
    name: '公司的 SOP 交给 AI 执行，省下时间去做真正有价值的事。',
  })
).toBeInTheDocument()
```

This should be the only hero-title change in `App.test.tsx`.

- [ ] **Step 2: Add a failing direct-entry test for `选择公司 IT 工具`**

In `src/features/onboarding/OnboardingShell.test.tsx`, add a new test near the other module-navigation tests:

```tsx
it('opens 公司 IT 工具 as a direct editor without a second-level entry card', async () => {
  const user = userEvent.setup()

  render(<App />)

  expect(await screen.findByRole('heading', { name: '开始设置' })).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: '选择公司 IT 工具' }))

  expect(await screen.findByRole('heading', { name: '选择公司 IT 工具' })).toBeInTheDocument()
  expect(screen.getByRole('checkbox', { name: 'Jira' })).toBeInTheDocument()
  expect(screen.getByRole('checkbox', { name: 'Confluence' })).toBeInTheDocument()
  expect(screen.queryByText('二级入口说明')).not.toBeInTheDocument()
})
```

This test should fail against the current nested-card implementation because the editor is not shown immediately.

- [ ] **Step 3: Convert the work-page expectations to real tabs**

In `src/features/onboarding/OnboardingShell.test.tsx`, update the current work-page tests so they expect semantic tabs instead of the stacked sidebar copy. Add one dedicated tab-default test:

```tsx
it('opens the work page on the 岗位 tab by default', async () => {
  const user = userEvent.setup()

  render(<App />)

  expect(await screen.findByRole('heading', { name: '开始设置' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: '配置要交给 AI 的工作' }))

  expect(await screen.findByRole('heading', { name: '配置要交给 AI 的工作' })).toBeInTheDocument()
  expect(screen.getByRole('tab', { name: '选择岗位', selected: true })).toBeInTheDocument()
  expect(screen.getByRole('tab', { name: '选择工作', selected: false })).toBeInTheDocument()
  expect(screen.getByRole('radio', { name: '项目经理' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: '需求评估' })).not.toBeInTheDocument()
})
```

Then add a second test for switching:

```tsx
it('shows the work list and editor after switching to the 工作 tab', async () => {
  const user = userEvent.setup()

  render(<App />)

  expect(await screen.findByRole('heading', { name: '开始设置' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: '配置要交给 AI 的工作' }))
  await user.click(screen.getByRole('tab', { name: '选择工作' }))

  expect(screen.getByRole('tab', { name: '选择工作', selected: true })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '需求评估' })).toBeInTheDocument()
  expect(screen.getByLabelText('用例描述')).toBeInTheDocument()
})
```

- [ ] **Step 4: Update the existing work-flow tests to respect the tab sequence**

Adjust the tests that currently assume role and work are visible at once:

- In the load-failure test, click the `选择工作` tab before asserting work-list buttons and editor fields.
- In `shows a use-case list first, marks configured items, and saves only on demand`, click the `选择工作` tab before interacting with work items.
- In the role-save regression tests, keep the default `选择岗位` tab for role assertions, then switch to `选择工作` only when the test needs the editor.

Concrete interaction pattern:

```tsx
await user.click(screen.getByRole('button', { name: '配置要交给 AI 的工作' }))
await user.click(screen.getByRole('tab', { name: '选择工作' }))
```

- [ ] **Step 5: Run the focused tests to verify they fail**

Run:

```bash
npm test -- src/App.test.tsx
npm test -- src/features/onboarding/OnboardingShell.test.tsx
```

Expected:
- `src/App.test.tsx` fails because the hero title still contains `把`
- `src/features/onboarding/OnboardingShell.test.tsx` fails because:
  - the IT-tool module still requires a second click
  - the work page does not expose `role="tab"` / `selected` semantics yet

### Task 2: Implement the shorter hero title and direct-edit IT-tool module

**Files:**
- Modify: `src/content/copy.ts`
- Modify: `src/features/onboarding/OnboardingShell.tsx`
- Modify: `src/features/onboarding/OnboardingShell.test.tsx`
- Test: `src/App.test.tsx`
- Test: `src/features/onboarding/OnboardingShell.test.tsx`

- [ ] **Step 1: Update the homepage hero title in `src/content/copy.ts`**

Change `pageCopy.appTitle` to:

```ts
appTitle: {
  'zh-CN': '公司的 SOP 交给 AI 执行，省下时间去做真正有价值的事。',
  'en-US': 'Your company SOPs can be executed by AI so you can focus on more valuable work.',
},
```

Keep `heroBody` unchanged.

- [ ] **Step 2: Simplify the basic module so it renders the editor immediately**

In `src/features/onboarding/OnboardingShell.tsx`, remove the remaining nested-entry behavior from the `view === 'basic'` branch.

Target shape:

```tsx
if (view === 'basic') {
  return (
    <div className="onboarding-shell">
      <section className="onboarding-section">
        <ModuleHeader
          description="先选择公司里已经在用的 IT 工具。后续 AI 会从这些工具中获取信息。"
          eyebrow="选择公司 IT 工具"
          installedCount={installedSkills.length}
          title="选择公司 IT 工具"
          onBack={() => setView('home')}
          onOpenInstalled={onOpenInstalled}
        />

        <section className="summary-card onboarding-subeditor-panel">
          <SaveFeedbackBanner feedback={saveFeedbacks.baseSkills} />
          <h3>公司 IT 工具</h3>
          <p>选择公司里已经在用的 IT 工具。后续 AI 会从这些工具中获取信息。</p>
          <BaseSkillSelectionPanel
            selectedBaseSkillIds={state.selected_base_skill_ids}
            onToggleBaseSkill={toggleBaseSkill}
          />
          <div className="button-row">
            <button
              className="button"
              disabled={!dirty.baseSkills || savingScope === 'baseSkills'}
              type="button"
              onClick={() => void saveState('baseSkills')}
            >
              {savingScope === 'baseSkills' ? '保存中...' : '保存设置'}
            </button>
          </div>
        </section>
      </section>
    </div>
  )
}
```

This change should also remove now-unused `BasicEntryView`, `basicEntryView`, `hoveredBasicEntry`, `basicInfoEntries`, and the `BasicEditorPanel` helper if they no longer add value.

- [ ] **Step 3: Rename the direct editor label from `基础技能` to `公司 IT 工具`**

Inside `BaseSkillSelectionPanel`, change the visible field label:

```tsx
<label>公司 IT 工具</label>
```

Do not change the actual data key names.

- [ ] **Step 4: Run the focused tests again**

Run:

```bash
npm test -- src/App.test.tsx
npm test -- src/features/onboarding/OnboardingShell.test.tsx -t "direct editor"
```

Expected:
- `src/App.test.tsx` passes the hero-title update
- the direct-entry test now passes
- the tab tests still fail until Task 3 is implemented

- [ ] **Step 5: Commit the direct-entry and hero-title slice**

```bash
git add src/content/copy.ts src/App.test.tsx src/features/onboarding/OnboardingShell.tsx src/features/onboarding/OnboardingShell.test.tsx
git commit -m "feat: simplify onboarding tool selection entry"
```

### Task 3: Add semantic tabs to the work page and preserve the existing save flows

**Files:**
- Modify: `src/features/onboarding/OnboardingShell.tsx`
- Modify: `src/features/onboarding/OnboardingShell.test.tsx`
- Modify: `src/styles.css`
- Test: `src/features/onboarding/OnboardingShell.test.tsx`

- [ ] **Step 1: Add a local tab state to `OnboardingShell.tsx`**

Introduce a dedicated tab type and state near the other local view state:

```tsx
type WorkModuleTab = 'role' | 'work'

const [workModuleTab, setWorkModuleTab] = useState<WorkModuleTab>('role')
```

When opening the work module from home, reset to the first tab:

```tsx
onClick={() => {
  setView('useCases')
  setWorkModuleTab('role')
}}
```

- [ ] **Step 2: Render an accessible tablist above the work content**

Add a semantic tab bar at the top of the `view === 'useCases'` branch:

```tsx
<div aria-label="工作配置步骤" className="onboarding-module-tabs" role="tablist">
  <button
    aria-controls="onboarding-role-panel"
    aria-selected={workModuleTab === 'role'}
    className="onboarding-module-tab"
    id="onboarding-role-tab"
    role="tab"
    type="button"
    onClick={() => setWorkModuleTab('role')}
  >
    选择岗位
  </button>
  <button
    aria-controls="onboarding-work-panel"
    aria-selected={workModuleTab === 'work'}
    className="onboarding-module-tab"
    id="onboarding-work-tab"
    role="tab"
    type="button"
    onClick={() => setWorkModuleTab('work')}
  >
    选择工作
  </button>
</div>
```

- [ ] **Step 3: Split the work page into two tab panels**

For the `role` tab, render only the role controls:

```tsx
{workModuleTab === 'role' ? (
  <section
    aria-labelledby="onboarding-role-tab"
    className="summary-card onboarding-subeditor-panel"
    id="onboarding-role-panel"
    role="tabpanel"
  >
    <h3>选择岗位</h3>
    <p>先选岗位，再决定后面要配置哪些工作。</p>
    <RoleSelectionPanel selectedRoleId={state.selected_role_id} onSelectRole={selectRole} />
    <SaveFeedbackBanner feedback={saveFeedbacks.role} />
    <div className="button-row">
      <button
        className="button"
        disabled={!dirty.role || savingScope === 'role'}
        type="button"
        onClick={() => void saveState('role')}
      >
        {savingScope === 'role' ? '保存中...' : '保存岗位'}
      </button>
    </div>
  </section>
) : (
  <div
    aria-labelledby="onboarding-work-tab"
    className="onboarding-module-grid"
    id="onboarding-work-panel"
    role="tabpanel"
  >
    <section className="summary-card onboarding-module-grid__sidebar">
      <h3>选择工作</h3>
      <p>当前岗位下可以交给 AI 的工作。</p>
      <UseCaseList
        activeUseCaseId={activeUseCase?.use_case_id ?? null}
        configuredById={completion.useCaseIds}
        useCases={state.role_use_case_contents}
        onSelect={setSelectedUseCaseId}
      />
    </section>

    <section className="summary-card onboarding-module-grid__content">
      {activeUseCase ? (
        <div className="onboarding-subeditor-panel">
          <SaveFeedbackBanner
            feedback={activeUseCaseScope ? saveFeedbacks[activeUseCaseScope] : null}
          />
          <UseCaseConfigStep useCases={[activeUseCase]} onUpdate={updateUseCaseContent} />
          <div className="button-row">
            <button
              className="button"
              disabled={
                !activeUseCaseScope ||
                !dirty.useCases[activeUseCase.use_case_id] ||
                savingScope === activeUseCaseScope
              }
              type="button"
              onClick={() => {
                if (activeUseCaseScope) {
                  void saveState(activeUseCaseScope)
                }
              }}
            >
              {savingScope === activeUseCaseScope ? '保存中...' : '保存设置'}
            </button>
          </div>
        </div>
      ) : (
        <p className="hint-callout">当前岗位没有可配置的工作。</p>
      )}
    </section>
  </div>
)}
```

For the `work` tab, reuse the existing work list + editor, but remove the role controls from that branch.

- [ ] **Step 4: Add lightweight tab styling in `src/styles.css`**

Add styles near the onboarding module rules:

```css
.onboarding-module-tabs {
  display: inline-flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.onboarding-module-tab {
  border: 1px solid rgba(22, 48, 41, 0.12);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.78);
  color: #163029;
  padding: 0.55rem 0.95rem;
  font: inherit;
  cursor: pointer;
}

.onboarding-module-tab[aria-selected='true'] {
  background: #187466;
  border-color: #187466;
  color: #fff;
}

.onboarding-module-tabs {
  margin-bottom: 1rem;
}
```

Place the tab row directly below `ModuleHeader` and above the tab panel content.

- [ ] **Step 5: Run the onboarding tests and fix any tab-transition regressions**

Run:

```bash
npm test -- src/features/onboarding/OnboardingShell.test.tsx
```

Expected:
- PASS with the new tab tests
- PASS with the existing role-save scope regressions

- [ ] **Step 6: Commit the work-tab rewrite**

```bash
git add src/features/onboarding/OnboardingShell.tsx src/features/onboarding/OnboardingShell.test.tsx src/styles.css
git commit -m "feat: add onboarding work tabs"
```

### Task 4: Final verification and branch sync

**Files:**
- Verify only

- [ ] **Step 1: Run the full focused verification set**

Run:

```bash
npm test -- src/App.test.tsx
npm test -- src/features/onboarding/OnboardingShell.test.tsx
npm run build
```

Expected:
- `src/App.test.tsx`: PASS
- `src/features/onboarding/OnboardingShell.test.tsx`: PASS
- `npm run build`: exit code `0`

- [ ] **Step 2: Inspect the final branch state**

Run:

```bash
git status --short
git log --oneline --decorate -6
```

Expected:
- no uncommitted changes
- two new feature commits on top of `35a5416`

- [ ] **Step 3: Push the branch**

```bash
git push origin feature/windows-auto-deploy
```

Expected:
- remote branch fast-forwards successfully
