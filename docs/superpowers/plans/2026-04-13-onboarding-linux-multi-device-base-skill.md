# Onboarding Linux Multi-Device Base Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Linux as a selectable onboarding base skill with structured multi-device credentials, per-device connection testing, local environment detection/install support, and a real installable `skills/linux` package.

**Architecture:** Extend the existing onboarding base-skill flow instead of replacing it. Keep flat `credential_values` for current services, add a dedicated `linux_devices` array to onboarding state, special-case the Linux credential editor in the onboarding UI, then wire Linux into backend connection testing, env syncing, environment install, and the repository skill manifest.

**Tech Stack:** React, TypeScript, Vitest, Tauri, Rust, Python, Paramiko, repository-managed skill manifest

---

### Task 1: Lock Linux onboarding behavior with failing tests

**Files:**
- Modify: `src/content/workbuddy.test.ts`
- Modify: `src/features/onboarding/OnboardingShell.test.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src-tauri/src/commands/onboarding.rs`
- Modify: `scripts/base-skill-docs.test.ts`
- Modify: `scripts/skill-manifest.test.ts`

- [ ] Add expectations for the new `linux` base skill and `主机与运维` group.
- [ ] Add onboarding UI expectations for Linux multi-device editing.
- [ ] Add onboarding save expectations that include `linux_devices`.
- [ ] Add Rust tests for Linux env sync and environment requirements.
- [ ] Add manifest and skill-doc contract expectations for `skills/linux`.
- [ ] Run focused tests and confirm RED.

### Task 2: Add shared models and config for Linux multi-device state

**Files:**
- Modify: `src/shared/config.json`
- Modify: `src/types.ts`
- Modify: `src/content/workbuddy.ts`
- Modify: `src-tauri/src/models/onboarding.rs`
- Modify: `src/App.tsx`

- [ ] Add `linux` base-skill config and host-ops grouping.
- [ ] Add `OnboardingLinuxDeviceRecord` and `linux_devices` state fields.
- [ ] Add the skill-library category label for `host-ops`.
- [ ] Re-run focused TypeScript tests.

### Task 3: Implement frontend Linux multi-device editing and per-device testing

**Files:**
- Modify: `src/features/onboarding/useOnboarding.ts`
- Modify: `src/features/onboarding/steps/CredentialsStep.tsx`
- Modify: `src/features/onboarding/OnboardingShell.tsx`
- Modify: `src/features/onboarding/copy.ts`
- Modify: `src/styles.css`

- [ ] Add Linux device add/edit/delete handlers and dirty-state comparison.
- [ ] Skip group-level automatic connection tests for Linux.
- [ ] Add per-device Linux connection-test state and handlers.
- [ ] Render the Linux device list editor in the left column of the selected Linux card.
- [ ] Re-run focused frontend tests.

### Task 4: Implement backend Linux sync, connection testing, and environment support

**Files:**
- Modify: `src-tauri/src/commands/onboarding.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] Add `LINUX_DEVICES_JSON` env syncing.
- [ ] Add Linux connection-test env entries for one device at a time.
- [ ] Add Linux environment requirement resolution and install steps.
- [ ] Re-run focused Rust tests.

### Task 5: Create the installable Linux skill package

**Files:**
- Create: `skills/linux/SKILL.md`
- Create: `skills/linux/scripts/test_connection.py`
- Create: `skills/linux/scripts/requirements.txt`
- Create: `skills/linux/tests/test_linux_connection.py`
- Modify: `skills/manifest.json`

- [ ] Create the skill doc with required environment and confirm-before-install sections.
- [ ] Add the Paramiko-based probe and tests.
- [ ] Add the manifest entry and content hash.
- [ ] Re-run skill doc, manifest, and Python tests.

### Task 6: Verify the full change

**Files:**
- No new files beyond previous tasks.

- [ ] Run `npm test`.
- [ ] Run `cargo test --manifest-path src-tauri/Cargo.toml`.
- [ ] Run `python3 -m pytest skills/linux/tests/test_linux_connection.py`.
- [ ] Confirm Linux appears in onboarding with multi-device editing and the environment panel still works.
