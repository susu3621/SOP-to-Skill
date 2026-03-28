# Onboarding Menu Structure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current flowing onboarding page with a three-entry desktop menu and nested module screens that mirror the CLI onboarding manager structure.

**Architecture:** Keep `useOnboarding` as the single source of onboarding state and actions. Introduce lightweight onboarding navigation state plus focused view components for home, basic info, use cases, and installation.

**Tech Stack:** React 18, TypeScript, Vitest, Testing Library, Tauri frontend

---

### Task 1: Add Failing Tests For The New Home Navigation

**Files:**
- Modify: `src/features/onboarding/OnboardingShell.test.tsx`
- Modify: `src/App.test.tsx`

- [ ] **Step 1: Write the failing test**

Add assertions that the default onboarding screen renders:

- `基础信息设置`
- `用例配置`
- `安装技能`

and does not immediately render the old stacked section headings as the primary home content.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/onboarding/OnboardingShell.test.tsx src/App.test.tsx`

Expected: FAIL because the current shell still renders the long stacked onboarding page.

- [ ] **Step 3: Write minimal implementation**

Introduce a new home menu view and switch the default onboarding render path to that view.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/features/onboarding/OnboardingShell.test.tsx src/App.test.tsx`

Expected: PASS for the new home-navigation assertions.

- [ ] **Step 5: Commit**

```bash
git add src/features/onboarding/OnboardingShell.test.tsx src/App.test.tsx
git commit -m "test: cover onboarding menu home"
```

### Task 2: Add Failing Tests For Hover Detail And Module Entry

**Files:**
- Modify: `src/features/onboarding/OnboardingShell.test.tsx`

- [ ] **Step 1: Write the failing test**

Add tests that:

- hover/focus on each top-level entry updates the detail panel
- clicking `基础信息设置` opens the basic-info module
- clicking `用例配置` opens the use-case module
- clicking `安装技能` opens the install module

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/onboarding/OnboardingShell.test.tsx`

Expected: FAIL because no menu-hover detail panel or module navigation exists yet.

- [ ] **Step 3: Write minimal implementation**

Add onboarding-local view state and route each entry to the correct module screen.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/features/onboarding/OnboardingShell.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/onboarding/OnboardingShell.test.tsx src/features/onboarding
git commit -m "feat: add onboarding menu navigation"
```

### Task 3: Split The Onboarding Shell Into Focused Views

**Files:**
- Modify: `src/features/onboarding/OnboardingShell.tsx`
- Create: `src/features/onboarding/views/OnboardingHomeView.tsx`
- Create: `src/features/onboarding/views/OnboardingBasicInfoView.tsx`
- Create: `src/features/onboarding/views/OnboardingUseCaseView.tsx`
- Create: `src/features/onboarding/views/OnboardingInstallView.tsx`

- [ ] **Step 1: Write the failing test**

Expand tests to assert:

- basic-info view exposes only role/base-skill entry actions
- use-case view shows the selectable use-case list first
- install view contains target/install controls and sync action

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/onboarding/OnboardingShell.test.tsx`

Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

Move the existing sections into focused view components and render them behind the new onboarding-local navigation state.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/features/onboarding/OnboardingShell.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/onboarding
git commit -m "refactor: split onboarding into nested views"
```

### Task 4: Update Styling For Desktop Horizontal Entry Cards

**Files:**
- Modify: `src/styles.css`

- [ ] **Step 1: Write the failing test**

No dedicated CSS unit test. Capture behavior through component tests that assert the new home semantics and visible labels.

- [ ] **Step 2: Run test to verify current coverage still passes**

Run: `npm test -- src/features/onboarding/OnboardingShell.test.tsx src/App.test.tsx`

Expected: PASS before styling changes.

- [ ] **Step 3: Write minimal implementation**

Add styles for:

- horizontal desktop card layout
- shared detail panel
- nested module toolbar/back navigation
- responsive fallback for narrow widths

- [ ] **Step 4: Run test to verify it stays green**

Run: `npm test -- src/features/onboarding/OnboardingShell.test.tsx src/App.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/styles.css
git commit -m "style: add onboarding menu layout"
```

### Task 5: Run Full Verification And Build Reviewable App

**Files:**
- Modify: `src/features/onboarding/OnboardingShell.tsx`
- Modify: `src/features/onboarding/OnboardingShell.test.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/styles.css`
- Create/Modify: any focused onboarding view files required by implementation

- [ ] **Step 1: Run focused tests**

Run: `npm test -- src/features/onboarding/OnboardingShell.test.tsx src/App.test.tsx`

Expected: PASS

- [ ] **Step 2: Run full test suite**

Run: `npm test`

Expected: PASS with all tests green.

- [ ] **Step 3: Build desktop app**

Run: `npm run tauri:build`

Expected: PASS and produce a macOS app bundle under `src-tauri/target/release/bundle/macos/`.

- [ ] **Step 4: Review diff**

Run: `git status --short`

Expected: only intended onboarding UI and test changes.

- [ ] **Step 5: Commit**

```bash
git add src/features/onboarding src/App.test.tsx src/styles.css docs/superpowers/specs/2026-03-27-onboarding-menu-structure-design.md docs/superpowers/plans/2026-03-27-onboarding-menu-structure.md
git commit -m "feat: restructure onboarding into menu flow"
```
