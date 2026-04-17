# External Links And Tray Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the WorkBuddy official-site link inside onboarding so it opens the correct website in the system browser, and simplify the macOS tray menu to only a quit action.

**Architecture:** Keep the current React + Tauri split. Use a small Rust command backed by `tauri-plugin-shell` for reliable external URL opening, and reduce the existing Rust tray builder to a single menu item without changing the broader hide-to-tray lifecycle.

**Tech Stack:** React, Vitest, Tauri Rust

---

### Task 1: Lock The WorkBuddy Link Behavior In Frontend Tests

**Files:**
- Modify: `src/features/onboarding/OnboardingShell.test.tsx`
- Test: `src/features/onboarding/OnboardingShell.test.tsx`

- [ ] **Step 1: Add failing assertions for the corrected WorkBuddy URL and click behavior**

Add tests that:
- assert the WorkBuddy `官网` link uses `https://www.codebuddy.cn/work/`
- click that link and verify the frontend calls the new external-open bridge instead of relying only on default link navigation

- [ ] **Step 2: Run the focused onboarding shell test file and confirm it fails**

Run: `npm test -- src/features/onboarding/OnboardingShell.test.tsx`
Expected: FAIL because the current WorkBuddy URL is wrong and the click path does not use an explicit browser-opening bridge.

### Task 2: Lock The Minimal Tray Menu In Rust Tests

**Files:**
- Modify: `src-tauri/src/tray.rs`
- Test: `src-tauri/src/tray.rs`

- [ ] **Step 1: Add failing unit coverage for the minimal tray menu shape**

Add tests that assert:
- the tray menu only contains the `quit` item
- the tray event handling still exits the app for the `quit` id

- [ ] **Step 2: Run the focused tray test and confirm it fails**

Run: `cd src-tauri && cargo test tray`
Expected: FAIL because the tray currently includes multiple menu items.

### Task 3: Implement Reliable External URL Opening

**Files:**
- Modify: `src-tauri/src/commands/config.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src/features/onboarding/steps/AgentSelectionStep.tsx`
- Modify: `src/content/workbuddy.ts`

- [ ] **Step 1: Add a Tauri command that opens external URLs through `tauri-plugin-shell`**

Implement a command that:
- accepts a URL string
- validates it is not blank
- calls `app.shell().open(url, None)`

- [ ] **Step 2: Update the WorkBuddy website configuration**

Change the WorkBuddy website URL to `https://www.codebuddy.cn/work/`.

- [ ] **Step 3: Route the onboarding official-site link through the new command**

Keep the anchor semantics, but intercept the click and call the new command so the system browser opens reliably in the desktop app.

- [ ] **Step 4: Run the focused onboarding shell tests and make them pass**

Run: `npm test -- src/features/onboarding/OnboardingShell.test.tsx`
Expected: PASS

### Task 4: Reduce The Tray Menu To Quit Only

**Files:**
- Modify: `src-tauri/src/tray.rs`

- [ ] **Step 1: Remove non-quit menu items from `build_tray`**

Leave only the `quit` item in the menu.

- [ ] **Step 2: Remove non-quit event branches from `setup_tray`**

Keep only the `quit` branch in the tray menu event handler.

- [ ] **Step 3: Run the focused Rust tray tests and make them pass**

Run: `cd src-tauri && cargo test tray`
Expected: PASS

### Task 5: Full Verification

**Files:**
- Modify: `src/features/onboarding/OnboardingShell.test.tsx`
- Modify: `src/features/onboarding/steps/AgentSelectionStep.tsx`
- Modify: `src/content/workbuddy.ts`
- Modify: `src-tauri/src/commands/config.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/src/tray.rs`

- [ ] **Step 1: Run the combined verification commands**

Run: `npm test`
Expected: PASS

Run: `cd src-tauri && cargo test`
Expected: PASS
