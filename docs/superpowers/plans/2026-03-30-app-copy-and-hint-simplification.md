# App Copy And Hint Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove boxed explanatory UI treatments across the app, convert onboarding explanation panels to plain text, and strip demo/live-send messaging from the visible interface.

**Architecture:** Keep the existing React component structure and interaction flow. Limit changes to UI copy, onboarding explanation markup, and shared styles so navigation, editing, and installation behavior remain unchanged.

**Tech Stack:** React 18, TypeScript, Vitest, Testing Library, CSS

---

### Task 1: Add Failing Tests For Text-Only Explanatory UI

**Files:**
- Modify: `src/features/onboarding/OnboardingShell.test.tsx`
- Modify: `src/App.test.tsx`

- [ ] **Step 1: Write the failing test**

Add assertions that:

- the app header no longer renders `界面 Demo，暂不接入真实发送能力`
- the onboarding detail area still renders `选择岗位`, `项目经理`, `产品经理`, and `研发负责人` after hover
- the onboarding detail area does not render nested explanation cards

Use a DOM query like:

```tsx
const detailHeading = screen.getByRole('heading', { name: '选择岗位' })
expect(detailHeading.closest('.summary-card')).toBeNull()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/onboarding/OnboardingShell.test.tsx src/App.test.tsx`
Expected: FAIL because the current header still renders demo copy and onboarding detail items are wrapped in `.summary-card`.

- [ ] **Step 3: Write minimal implementation**

Update the header and onboarding detail markup so explanation content renders as plain text without nested summary cards.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/features/onboarding/OnboardingShell.test.tsx src/App.test.tsx`
Expected: PASS

### Task 2: Remove Demo/Simulation Copy From Shared Content

**Files:**
- Modify: `src/content/copy.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write the failing test**

Add or extend tests to assert:

- the masthead actions contain `检查更新` instead of the demo/live-send text
- install wizard headings and result copy no longer use `发送引导`, `模拟`, or `真实发送能力`

Use assertions such as:

```tsx
expect(screen.getByRole('button', { name: '检查更新' })).toBeInTheDocument()
expect(screen.queryByText(/界面 Demo|真实发送能力|模拟/)).not.toBeInTheDocument()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/App.test.tsx`
Expected: FAIL because the current copy still contains demo/simulation strings.

- [ ] **Step 3: Write minimal implementation**

- replace `pageCopy.localeTag` with a neutral update-check label
- update visible shared copy strings to neutral product language
- keep the update badge behavior intact

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/App.test.tsx`
Expected: PASS

### Task 3: Convert Explanation Containers To Text-Only Presentation

**Files:**
- Modify: `src/features/onboarding/OnboardingShell.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Write the failing test**

Extend onboarding tests to assert:

- explanation items render as text rows/list items
- empty-state hints like `当前岗位没有可配置的用例。` remain visible without depending on boxed callouts
- role/base-skill save flow still works after the markup change

Use checks like:

```tsx
expect(screen.getByText('当前岗位没有可配置的用例。')).toBeInTheDocument()
expect(document.querySelector('.summary-card--nested')).toBeNull()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/onboarding/OnboardingShell.test.tsx`
Expected: FAIL because explanation items still use `.summary-card--nested`.

- [ ] **Step 3: Write minimal implementation**

- replace nested explanation cards with text rows or list markup
- remove border/background styling from `.onboarding-detail-panel` and `.hint-callout`
- preserve spacing and readability using typography-only styles

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/features/onboarding/OnboardingShell.test.tsx`
Expected: PASS

### Task 4: Run Verification

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/content/copy.ts`
- Modify: `src/features/onboarding/OnboardingShell.tsx`
- Modify: `src/features/onboarding/OnboardingShell.test.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Run focused tests**

Run: `npm test -- src/features/onboarding/OnboardingShell.test.tsx src/App.test.tsx`
Expected: PASS

- [ ] **Step 2: Run full test suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 3: Review diff**

Run: `git status --short`
Expected: only the intended UI, copy, style, and plan changes in the worktree branch.
