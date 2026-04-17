# Skill Library And Guide Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show installed-only local Skills in the Skill library, remove noisy install badges from the library grid, and add a `查看引导` menu action that returns users to the onboarding homepage.

**Architecture:** Keep the current React + Tauri split. Add installed-only Skill synthesis inside the Rust `list_skills` command, then update the React shell to consume the richer library list and expose the new guide-menu action.

**Tech Stack:** Tauri Rust commands, React, Vitest

---

### Task 1: Lock The New UI Behavior In Frontend Tests

**Files:**
- Modify: `src/App.test.tsx`
- Test: `src/App.test.tsx`

- [ ] **Step 1: Write failing assertions for the simplified Skill library and guide menu**

Add tests that:
- assert the Skill library grid no longer renders `已安装` or `未安装` badges
- seed `fixtures.runtime.skills` with an installed-only local Skill and assert it appears in the Skill library
- open `更多操作`, click `查看引导`, and verify onboarding home appears

- [ ] **Step 2: Run the focused frontend test file and confirm it fails**

Run: `npm test -- src/App.test.tsx`
Expected: FAIL because the current UI still shows install badges, lacks `查看引导`, and does not cover installed-only library behavior.

### Task 2: Lock The Installed-Only Merge In Rust Tests

**Files:**
- Modify: `src-tauri/src/commands/skill.rs`
- Test: `src-tauri/src/commands/skill.rs`

- [ ] **Step 1: Add failing unit tests for installed-only skill synthesis**

Add Rust tests that create:
- one template-backed Skill plus installed metadata
- one installed-only local package with `SKILL.md`

Assert that the final skill list:
- includes both entries
- marks the installed-only one as installed
- marks it as not directly installable

- [ ] **Step 2: Run the targeted Rust test and confirm it fails**

Run: `cd src-tauri && cargo test list_skills`
Expected: FAIL because `list_skills` currently ignores installed-only local Skills.

### Task 3: Implement The Skill Library Data Merge

**Files:**
- Modify: `src-tauri/src/commands/skill.rs`
- Modify: `src/types.ts`

- [ ] **Step 1: Add a `can_install` field to the shared Skill contract**

Update the Rust `SkillInfo` struct and the frontend `SkillInfo` type so the UI can distinguish template-backed entries from installed-only local entries.

- [ ] **Step 2: Synthesize installed-only entries inside `list_skills`**

Implement a helper that:
- scans installed metadata
- groups installed records by `skill_id`
- skips ids already present in the template list
- loads a display template from the installed output directory when possible
- falls back to `skill_id` if package metadata is unavailable

- [ ] **Step 3: Run the targeted Rust test and make it pass**

Run: `cd src-tauri && cargo test list_skills`
Expected: PASS

### Task 4: Implement The App Shell Changes

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/content/copy.ts`

- [ ] **Step 1: Remove card-level install status badges in the Skill library grid**

Update the library card render path so it only shows title, description, version, category, and targets.

- [ ] **Step 2: Add the `查看引导` menu action**

Use the existing onboarding-home reset flow so the action returns users to the onboarding homepage from anywhere in the app.

- [ ] **Step 3: Prevent installed-only local Skills from showing a broken install action**

In the detail page:
- if `can_install` is `true`, keep the existing install / reinstall action
- if `can_install` is `false`, replace the primary action with a safe route to the installed-Skill management view

- [ ] **Step 4: Run the focused frontend tests and make them pass**

Run: `npm test -- src/App.test.tsx`
Expected: PASS

### Task 5: Full Verification

**Files:**
- Modify: `src/App.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/content/copy.ts`
- Modify: `src/types.ts`
- Modify: `src-tauri/src/commands/skill.rs`

- [ ] **Step 1: Run the combined verification commands**

Run: `npm test`
Expected: PASS

Run: `cd src-tauri && cargo test`
Expected: PASS
