# Onboarding Manual Connection Tests Only Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop running onboarding connection tests automatically after saving settings and require users to trigger tests manually.

**Architecture:** Remove the save-time automatic connection-test trigger from the onboarding hook while preserving the existing manual test actions and the existing reset-to-idle behavior when credentials change. Update the credential-step hint copy so the UI no longer promises automatic testing.

**Tech Stack:** React, TypeScript, Vitest, Testing Library

---

### Task 1: Lock the save behavior in tests

**Files:**
- Modify: `src/features/onboarding/OnboardingShell.test.tsx`

- [ ] **Step 1: Replace the save-time automatic test expectation**

Change the existing save regression so it asserts that saving completed credentials does not invoke `test_onboarding_connection`.

- [ ] **Step 2: Verify the visible idle/manual state**

Assert the credential card remains in the idle/manual state after save so the UI matches the new workflow.

- [ ] **Step 3: Run the focused test**

Run:

```bash
npm test -- src/features/onboarding/OnboardingShell.test.tsx -t "does not run automatic connection tests after saving completed credentials"
```

Expected: PASS after the implementation change.

### Task 2: Remove the automatic trigger and update copy

**Files:**
- Modify: `src/features/onboarding/useOnboarding.ts`
- Modify: `src/features/onboarding/copy.ts`
- Modify: `src/features/onboarding/steps/CredentialsStep.tsx`

- [ ] **Step 1: Remove the automatic connection-test trigger from save**

Delete the save-time `runAutomaticConnectionTestsForState()` call and any now-unused helper code.

- [ ] **Step 2: Update the credential hint text**

Change the connection-test hint so it tells users to run tests manually instead of mentioning automatic save-time tests.

- [ ] **Step 3: Keep the existing reset-to-idle behavior intact**

Do not change the effect that clears stale test results when credentials or Linux device fields change.

### Task 3: Verify the affected frontend coverage

**Files:**
- Test: `src/features/onboarding/OnboardingShell.test.tsx`

- [ ] **Step 1: Run the focused onboarding shell test file**

Run:

```bash
npm test -- src/features/onboarding/OnboardingShell.test.tsx
```

Expected: PASS.
