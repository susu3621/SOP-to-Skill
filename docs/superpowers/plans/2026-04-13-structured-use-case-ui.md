# Structured Use Case UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the freeform use-case editor with a structured question-and-answer UI where built-in use cases keep locked system guidance and custom use cases can define their own description and questions.

**Architecture:** Add a config-backed question definition layer for built-in use cases, extend the onboarding state to persist structured question answers, and render the work editor from that structure. Keep the existing package staging command but teach it to render structured answers into generated `SKILL.md` output instead of relying on the old `info_sources` / `rules` textareas.

**Tech Stack:** React 18, TypeScript, CSS, Vitest, Testing Library, Tauri command contracts, Rust serde models

---

### Task 1: Add Structured Use Case Types And Config Helpers

**Files:**
- Modify: `src/types.ts`
- Modify: `src/shared/config.json`
- Modify: `src/content/workbuddy.ts`
- Modify: `src/content/workbuddy.test.ts`

- [x] Add failing tests for config-backed weekly-report question definitions and custom-use-case defaults.
- [x] Run `npm test -- src/content/workbuddy.test.ts` and verify the new assertions fail for missing structured helpers.
- [x] Implement shared types and helpers for locked built-in questions, editable custom questions, and single-value answers.
- [x] Re-run `npm test -- src/content/workbuddy.test.ts` and verify it passes.

### Task 2: Migrate Onboarding State And Generated Skill Rendering

**Files:**
- Modify: `src/types.ts`
- Modify: `src/features/onboarding/useOnboarding.ts`
- Modify: `src-tauri/src/models/onboarding.rs`
- Modify: `src-tauri/src/onboarding/generator.rs`
- Modify: `src/App.test.tsx`

- [x] Add failing coverage for legacy-state normalization into structured questions plus generated markdown output that lists question answers.
- [x] Run focused tests for the affected frontend and Rust-adjacent contracts if available from JS, starting with `npm test -- src/App.test.tsx`.
- [x] Implement backward-compatible normalization so old `info_sources` / `rules` data falls into structured answers, then update the generator to prefer structured answers.
- [x] Re-run the targeted tests and confirm they pass.

### Task 3: Replace The Work Editor With Structured Question Editing

**Files:**
- Modify: `src/features/onboarding/steps/UseCaseConfigStep.tsx`
- Modify: `src/features/onboarding/copy.ts`
- Modify: `src/features/onboarding/OnboardingShell.test.tsx`
- Modify: `src/styles.css`

- [x] Add failing UI tests for built-in weekly-report rendering locked system description and fixed questions, and for custom use cases editing description plus question labels.
- [x] Run `npm test -- src/features/onboarding/OnboardingShell.test.tsx` and verify the new assertions fail against the old textarea editor.
- [x] Implement the structured editor UI with one answer input per question, built-in locked prompts, and editable custom questions.
- [x] Re-run `npm test -- src/features/onboarding/OnboardingShell.test.tsx` and confirm the new behavior passes.

### Task 4: Full Regression Verification

**Files:**
- Modify: `src/features/onboarding/OnboardingShell.test.tsx`
- Modify: `src/content/workbuddy.test.ts`
- Modify: `src/App.test.tsx`

- [x] Re-read the approved UI requirements and compare them against the updated tests and generated output.
- [x] Run `npm test -- src/content/workbuddy.test.ts src/App.test.tsx src/features/onboarding/OnboardingShell.test.tsx`.
- [x] Run `npm test` if the focused suite passes.
- [x] Record any remaining gaps instead of claiming completion without evidence.
