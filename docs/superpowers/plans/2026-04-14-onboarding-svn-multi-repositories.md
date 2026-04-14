# Onboarding SVN Multi-Repositories Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make SVN onboarding support multiple configured repositories, matching the Linux multi-device workflow, while keeping runtime compatibility for existing single-repository environments.

**Architecture:** Add first-class `svn_repositories` records to frontend and Rust onboarding state, render SVN as a structured multi-record editor like Linux, and write `SVN_REPOSITORIES_JSON` as the canonical runtime input. Keep the legacy single `SVN_*` variables as a fallback for backward compatibility and migration from older saved onboarding state.

**Tech Stack:** React, TypeScript, Vitest, Rust, Tauri, Python

---

### Task 1: Frontend state and UI contract

**Files:**
- Modify: `src/types.ts`
- Modify: `src/features/onboarding/useOnboarding.ts`
- Modify: `src/features/onboarding/steps/CredentialsStep.tsx`
- Modify: `src/features/onboarding/copy.ts`
- Test: `src/features/onboarding/OnboardingShell.test.tsx`
- Test: `src/content/workbuddy.test.ts`

- [ ] **Step 1: Add failing frontend tests for structured SVN repositories**

Cover:
- selecting SVN creates an initial empty repository row
- saving base skills persists structured SVN repository records
- manual connection tests run for an individual SVN repository
- workbuddy exposes SVN as a structured onboarding credential group instead of flat fields

- [ ] **Step 2: Add frontend SVN repository types and helpers**

Create a new record type mirroring Linux devices:
- `id`
- `name`
- `url`
- `username`
- `password`

Add dirty checks, fingerprints, add/update/remove helpers, and legacy `svnUrl/svnUsername/svnPassword` migration during normalization.

- [ ] **Step 3: Render SVN as a multi-record credential editor**

Use a dedicated `editor_type` branch in `CredentialsStep` so each repository has its own card with manual test action and delete action, while the service-level environment panel remains shared.

### Task 2: Rust onboarding state and environment contract

**Files:**
- Modify: `src-tauri/src/models/onboarding.rs`
- Modify: `src-tauri/src/commands/onboarding.rs`
- Test: `src-tauri/src/commands/onboarding.rs`

- [ ] **Step 1: Add failing Rust tests for SVN repository persistence**

Cover:
- home env sync writes `SVN_REPOSITORIES_JSON`
- home env sync keeps legacy single `SVN_*` fallback for the first repository
- legacy single `SVN_*` connection-test env entries still work for a single manual test

- [ ] **Step 2: Add Rust state support for `svn_repositories`**

Mirror the Linux device model with a new onboarding record struct and add it to persisted onboarding state with serde defaults.

- [ ] **Step 3: Write canonical and fallback SVN env entries**

Emit `SVN_REPOSITORIES_JSON` for saved state, and keep the first repository mirrored into `SVN_URL`, `SVN_USERNAME`, and `SVN_PASSWORD` for compatibility.

### Task 3: SVN skill runtime compatibility

**Files:**
- Modify: `skills/svn/SKILL.md`
- Modify: `skills/svn/scripts/test_connection.py`
- Modify: `skills/svn/tests/test_svn_connection.py`
- Modify: `scripts/base-skill-docs.test.ts`

- [ ] **Step 1: Add failing Python tests for canonical SVN repository config**

Cover:
- loading a repository from `SVN_REPOSITORIES_JSON`
- falling back to legacy `SVN_*` variables when JSON is absent

- [ ] **Step 2: Update the SVN skill contract**

Document `SVN_REPOSITORIES_JSON` as the canonical runtime input and note the single `SVN_*` variables remain as compatibility fallback.

- [ ] **Step 3: Update the connection probe**

Support both config sources, choosing the first configured repository when only the canonical runtime JSON is available.

### Task 4: Verification and local commit

**Files:**
- Modify: `docs/superpowers/plans/2026-04-14-onboarding-svn-multi-repositories.md`

- [ ] **Step 1: Run frontend verification**

Run:

```bash
npm test -- src/content/workbuddy.test.ts src/features/onboarding/OnboardingShell.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run Python SVN verification**

Run:

```bash
pytest skills/svn/tests/test_svn_connection.py
```

Expected: PASS.

- [ ] **Step 3: Run Rust onboarding verification**

Run:

```bash
cargo test onboarding_ --manifest-path src-tauri/Cargo.toml -- --nocapture
```

Expected: PASS.

- [ ] **Step 4: Create a local commit**

Commit the frontend, Rust, Python, and plan updates together after the verification commands pass.
