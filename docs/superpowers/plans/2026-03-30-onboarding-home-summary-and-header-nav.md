# Onboarding Home Summary And Header Nav Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the visible `设置` header button and add a read-only onboarding home summary that lists the current role, base skills, configured use cases, install targets, and install skills.

**Architecture:** Keep the existing app routing and onboarding state model intact. Implement the visible changes entirely in the React frontend by deriving readable summary groups from `useOnboarding` state and rendering them on the onboarding home below the existing entry cards and detail copy.

**Tech Stack:** React 18, TypeScript, Vitest, Testing Library, CSS

---

### Task 1: Add Failing Tests For Header Navigation And Home Summary

**Files:**
- Modify: `src/App.test.tsx`
- Modify: `src/features/onboarding/OnboardingShell.test.tsx`

- [ ] **Step 1: Write the failing test**

Add tests that assert:

- the header no longer renders a button named `设置`
- the onboarding home renders a section named `已设置内容`
- the home summary shows `已选岗位`, `基础技能`, `已配置用例`, `安装目标`, and `安装技能`
- the summary renders known seeded values from the existing onboarding fixture, including `项目经理`, `Jira`, `Confluence`, `记录计划`, `项目周报`, `Codex`, `Claude Code`, and at least one generated install skill id

Use assertions like:

```tsx
expect(screen.queryByRole('button', { name: '设置' })).not.toBeInTheDocument()
expect(screen.getByRole('heading', { name: '已设置内容' })).toBeInTheDocument()
expect(screen.getByText('项目经理')).toBeInTheDocument()
expect(screen.getByText('Codex')).toBeInTheDocument()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/App.test.tsx src/features/onboarding/OnboardingShell.test.tsx`
Expected: FAIL because the header still contains `设置` and the onboarding home does not yet render the summary section.

- [ ] **Step 3: Write minimal implementation**

Remove the visible `设置` button from the header nav and add a read-only home summary component fed from existing onboarding state.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/App.test.tsx src/features/onboarding/OnboardingShell.test.tsx`
Expected: PASS

### Task 2: Build Readable Summary Mapping For The Onboarding Home

**Files:**
- Modify: `src/features/onboarding/OnboardingShell.tsx`
- Modify: `src/content/workbuddy.ts`

- [ ] **Step 1: Write the failing test**

Extend onboarding tests to prove summary labels are human-readable where helper mappings exist:

- role id maps to the role name
- base skill ids map to skill names
- selected agent ids map to agent names
- configured use cases only include saved/configured records
- generated install skills remain visible even if no prettier alias exists

Use checks like:

```tsx
expect(screen.getByText('项目经理')).toBeInTheDocument()
expect(screen.getByText('Jira')).toBeInTheDocument()
expect(screen.getByText('test-project-manager-weekly-report')).toBeInTheDocument()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/onboarding/OnboardingShell.test.tsx`
Expected: FAIL because no summary mapping/rendering exists yet.

- [ ] **Step 3: Write minimal implementation**

- derive summary groups from `state` and `completion`
- reuse helper functions from `src/content/workbuddy.ts`
- keep empty groups rendering `未设置`

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/features/onboarding/OnboardingShell.test.tsx`
Expected: PASS

### Task 3: Style The Home Summary Without Changing Edit Flows

**Files:**
- Modify: `src/styles.css`
- Modify: `src/features/onboarding/OnboardingShell.tsx`

- [ ] **Step 1: Write the failing test**

No dedicated CSS unit test is needed. Keep coverage at the component level by asserting the new summary heading and grouped labels are visible on the home screen.

- [ ] **Step 2: Run test to verify current component coverage passes**

Run: `npm test -- src/App.test.tsx src/features/onboarding/OnboardingShell.test.tsx`
Expected: PASS before styling-only changes.

- [ ] **Step 3: Write minimal implementation**

- add layout and typography for the `已设置内容` summary section
- keep it visually lighter than the main entry cards
- avoid adding buttons or editable controls

- [ ] **Step 4: Run test to verify it stays green**

Run: `npm test -- src/App.test.tsx src/features/onboarding/OnboardingShell.test.tsx`
Expected: PASS

### Task 4: Run Verification

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/content/workbuddy.ts`
- Modify: `src/features/onboarding/OnboardingShell.tsx`
- Modify: `src/features/onboarding/OnboardingShell.test.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Run focused tests**

Run: `npm test -- src/App.test.tsx src/features/onboarding/OnboardingShell.test.tsx`
Expected: PASS

- [ ] **Step 2: Run full test suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 3: Review diff**

Run: `git status --short`
Expected: only the intended header nav, onboarding summary, style, and plan changes in the worktree.
