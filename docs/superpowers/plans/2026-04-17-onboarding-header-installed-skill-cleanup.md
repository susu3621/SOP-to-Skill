# Onboarding Header And Installed Skill Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify the masthead, provide a reliable return-to-home action, surface the add-use-case hint, show only real local installed Skills on the onboarding home, and make Skill deletion easier to discover.

**Architecture:** Keep the existing React/Tauri contracts. Implement the behavior in the frontend shell by adding a compact masthead menu, exposing onboarding sub-view state to `App`, switching the home summary to real installed metadata, and reusing the existing uninstall command for deletion.

**Tech Stack:** React 18, TypeScript, Vitest, Testing Library, CSS

---

### Task 1: Add Failing Shell Tests

**Files:**
- Modify: `src/App.test.tsx`
- Modify: `src/features/onboarding/OnboardingShell.test.tsx`

- [ ] **Step 1: Write the failing test**

Add tests for:

```tsx
expect(screen.getByRole('button', { name: '更多操作' })).toBeInTheDocument()
expect(screen.getByRole('button', { name: '返回首页' })).toBeInTheDocument()
expect(screen.queryByText('project-manager-weekly-report')).not.toBeInTheDocument()
expect(screen.getByText('有新想法？点击“新增用例”')).toBeInTheDocument()
expect(screen.getByRole('button', { name: '删除 Skill' })).toBeInTheDocument()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/App.test.tsx src/features/onboarding/OnboardingShell.test.tsx`
Expected: FAIL because the old masthead, old home summary, and old installed delete copy still render.

- [ ] **Step 3: Write minimal implementation**

Implement only enough shell changes to satisfy the new assertions.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/App.test.tsx src/features/onboarding/OnboardingShell.test.tsx`
Expected: PASS

### Task 2: Add Contextual Onboarding Home Navigation

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/features/onboarding/OnboardingShell.tsx`

- [ ] **Step 1: Write the failing test**

Add tests that open `选择公司 IT 工具` or `配置要交给 AI 的工作`, assert the masthead shows `返回首页`, click it, and verify the onboarding home entry cards are visible again.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/App.test.tsx src/features/onboarding/OnboardingShell.test.tsx`
Expected: FAIL because `App` does not know the onboarding sub-view state yet.

- [ ] **Step 3: Write minimal implementation**

Pass onboarding sub-view state from `OnboardingShell` to `App`, and let `App` send a return-home signal back down.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/App.test.tsx src/features/onboarding/OnboardingShell.test.tsx`
Expected: PASS

### Task 3: Replace Planned Install Summary With Real Installed Skills

**Files:**
- Modify: `src/features/onboarding/OnboardingShell.tsx`
- Modify: `src/features/onboarding/copy.ts`

- [ ] **Step 1: Write the failing test**

Add tests that:

1. render no installed local Skills and verify generated production/test ids are absent
2. render a seeded installed local Skill list and verify only those records appear

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/onboarding/OnboardingShell.test.tsx`
Expected: FAIL because the home summary still uses generated install selections.

- [ ] **Step 3: Write minimal implementation**

Replace the install-skill table with a real installed-skill list derived from `installedSkills`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/features/onboarding/OnboardingShell.test.tsx`
Expected: PASS

### Task 4: Add Use-Case Guidance And Installed Deletion Entry

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/content/copy.ts`
- Modify: `src/features/onboarding/OnboardingShell.tsx`
- Modify: `src/features/onboarding/copy.ts`
- Modify: `src/hooks/useSkills.ts`
- Modify: `src/styles.css`

- [ ] **Step 1: Write the failing test**

Add tests for:

1. the work sidebar hint copy near `新增用例`
2. the `更多` menu entry for `已安装 Skill`
3. clicking `删除 Skill` calls the existing uninstall flow and removes the item after reload

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/App.test.tsx src/features/onboarding/OnboardingShell.test.tsx`
Expected: FAIL because the guidance copy, compact menu, and delete label are missing.

- [ ] **Step 3: Write minimal implementation**

Implement the hint block, compact masthead menu, and visible delete action using the existing uninstall command.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/App.test.tsx src/features/onboarding/OnboardingShell.test.tsx`
Expected: PASS

### Task 5: Run Verification

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/content/copy.ts`
- Modify: `src/features/onboarding/OnboardingShell.tsx`
- Modify: `src/features/onboarding/OnboardingShell.test.tsx`
- Modify: `src/features/onboarding/copy.ts`
- Modify: `src/hooks/useSkills.ts`
- Modify: `src/styles.css`

- [ ] **Step 1: Run focused tests**

Run: `npm test -- src/App.test.tsx src/features/onboarding/OnboardingShell.test.tsx`
Expected: PASS

- [ ] **Step 2: Run full test suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 3: Review diff**

Run: `git status --short`
Expected: only the intended shell, summary, copy, style, and doc changes in the worktree.
