# Onboarding Base Skill Environment Install Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add automatic environment checks and per-skill auto-install with progress to the onboarding base-skill credentials screen on macOS and Windows.

**Architecture:** Extend the existing onboarding credential flow rather than creating a parallel wizard. Add new environment check/install contracts in `src/types.ts`, implement Tauri commands and progress events in `src-tauri/src/commands/onboarding.rs`, then update `useOnboarding` and `CredentialsStep` so each selected service card renders credentials on the left and environment/install state on the right.

**Tech Stack:** React, TypeScript, Vitest, Tauri, Rust, desktop command execution, Tauri frontend events

---

### Task 1: Lock the environment UI and command contracts with failing tests

**Files:**
- Modify: `src/features/onboarding/OnboardingShell.test.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src-tauri/src/commands/onboarding.rs`

- [ ] Add frontend expectations for the two-column credentials/environment layout.
- [ ] Add frontend expectations for automatic environment checks when base skills are selected.
- [ ] Add frontend expectations for install progress rendering from `onboarding-environment-install-progress`.
- [ ] Add Rust unit tests for service requirement resolution and install-step generation.
- [ ] Run focused tests and verify they fail for the new behavior.

### Task 2: Add shared TypeScript contracts and onboarding copy

**Files:**
- Modify: `src/types.ts`
- Modify: `src/features/onboarding/copy.ts`

- [ ] Add environment check types, install types, and progress-event payload types.
- [ ] Add localized copy for environment status, install button text, unsupported-platform text, progress labels, and package-manager failures.
- [ ] Re-run focused frontend tests.

### Task 3: Implement backend environment detection and installation

**Files:**
- Modify: `src-tauri/src/commands/onboarding.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] Add service requirement resolution for Confluence, Jira, Gerrit, SVN, and Mail.
- [ ] Add platform detection and package-manager support logic.
- [ ] Add `check_onboarding_skill_environment`.
- [ ] Add `install_onboarding_skill_environment`.
- [ ] Emit `onboarding-environment-install-progress` during install.
- [ ] Re-run focused Rust tests.

### Task 4: Implement frontend environment state, listeners, and card layout

**Files:**
- Modify: `src/features/onboarding/useOnboarding.ts`
- Modify: `src/features/onboarding/steps/CredentialsStep.tsx`
- Modify: `src/features/onboarding/OnboardingShell.tsx`
- Modify: `src/styles.css`

- [ ] Track environment check state and install state per selected service.
- [ ] Subscribe to install-progress events from Tauri.
- [ ] Automatically run environment checks for selected base skills.
- [ ] Trigger install commands from the environment panel and refresh readiness after completion.
- [ ] Render the approved left-credentials/right-environment layout.
- [ ] Re-run focused frontend tests.

### Task 5: Verify the full change

**Files:**
- No new files beyond previous tasks.

- [ ] Run `npm test`.
- [ ] Run `cargo test --manifest-path src-tauri/Cargo.toml`.
- [ ] Confirm the onboarding basic view shows the new environment panel behavior for selected base skills.
