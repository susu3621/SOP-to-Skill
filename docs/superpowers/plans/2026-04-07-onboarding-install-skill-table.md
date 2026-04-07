# Onboarding Install Skill Table Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render onboarding install-page generated skills in a three-column layout that groups each use case into one row with separate production and test columns.

**Architecture:** Keep onboarding data and handlers unchanged, and only replace the generated-skill presentation in `InstallSelectionStep` with semantic table markup plus responsive CSS. Cover the new structure with a focused UI regression test in `OnboardingShell.test.tsx`.

**Tech Stack:** React, TypeScript, Testing Library, Vitest, CSS

---

### Task 1: Lock the UI contract with a failing test

**Files:**
- Modify: `src/features/onboarding/OnboardingShell.test.tsx`
- Test: `src/features/onboarding/OnboardingShell.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
it('renders generated install skills as one row per use case with production and test columns', async () => {
  const user = userEvent.setup()

  render(<App />)

  expect(await screen.findByRole('heading', { name: '开始设置' })).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: '安装技能' }))

  const table = await screen.findByRole('table', { name: '岗位生成技能列表' })
  expect(within(table).getByRole('columnheader', { name: '岗位用例' })).toBeInTheDocument()
  expect(within(table).getByRole('columnheader', { name: '生产技能' })).toBeInTheDocument()
  expect(within(table).getByRole('columnheader', { name: '测试技能' })).toBeInTheDocument()
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/onboarding/OnboardingShell.test.tsx -t "renders generated install skills as one row per use case with production and test columns"`
Expected: FAIL because the install page does not render a table named `岗位生成技能列表`

### Task 2: Replace the generated-skill list with a three-column table

**Files:**
- Modify: `src/features/onboarding/steps/InstallSelectionStep.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Write minimal implementation**

Render the generated skills section as:

```tsx
<div className="onboarding-install-skill-table-wrap">
  <table aria-label="岗位生成技能列表" className="onboarding-install-skill-table">
    <thead>
      <tr>
        <th scope="col">岗位用例</th>
        <th scope="col">生产技能</th>
        <th scope="col">测试技能</th>
      </tr>
    </thead>
  </table>
</div>
```

Each row should contain the use case name plus one checkbox+ID cell for `production_skill_id` and one for `test_skill_id`, while continuing to call `onToggleInstallSkill`.

- [ ] **Step 2: Add responsive styling**

Add CSS for:
- desktop three-column table layout
- wrapped skill IDs
- mobile stacked row cards using `data-label`

- [ ] **Step 3: Run focused test to verify it passes**

Run: `npm test -- src/features/onboarding/OnboardingShell.test.tsx -t "renders generated install skills as one row per use case with production and test columns"`
Expected: PASS

### Task 3: Run broader verification

**Files:**
- Test: `src/features/onboarding/OnboardingShell.test.tsx`

- [ ] **Step 1: Run the onboarding test file**

Run: `npm test -- src/features/onboarding/OnboardingShell.test.tsx`
Expected: PASS

- [ ] **Step 2: Run repo verification if the onboarding file passes**

Run: `npm run verify:desktop`
Expected: PASS
