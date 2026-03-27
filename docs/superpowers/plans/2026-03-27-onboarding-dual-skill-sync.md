# Onboarding Dual Skill Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 CLI onboarding 与 Mac onboarding 共享同一套安装语义：同时生成生产/测试岗位 skill，允许在 Mac 安装阶段勾选最终 skill 集合，并把该集合同步到所有已选 Agent。

**Architecture:** 先把 CLI 侧的生成和安装集合规则抽成纯函数并落盘，再在 Rust 侧实现同语义的 onboarding 状态、批量同步与包生成命令，最后将 React onboarding 改成专用 shell + 分步组件，消费新的 Tauri onboarding API，而不是复用现有单 skill 安装向导。Spec: `docs/superpowers/specs/2026-03-27-onboarding-dual-skill-sync-design.md`

**Tech Stack:** Node.js CommonJS, Vitest, Rust, Tauri, React, TypeScript

---

### Task 1: Add Failing CLI Tests For Dual Package Generation

**Files:**
- Create: `scripts/onboarding-skill-set.test.ts`
- Create: `scripts/lib/onboarding-skill-set.cjs`
- Modify: `scripts/skill-generator.test.ts`
- Modify: `scripts/lib/skill-generator.cjs`

- [ ] **Step 1: Write the failing tests**

Add Vitest coverage that asserts:

- `project-manager-weekly-report` and `test-project-manager-weekly-report` are both derived for the same role/use-case pair
- the test variant uses the `test-` prefix instead of a suffix
- the test variant content still includes the current local-only guidance
- the production variant does not include that test-only guidance

- [ ] **Step 2: Run the targeted tests and verify they fail**

Run:

```bash
npm test -- --run scripts/onboarding-skill-set.test.ts scripts/skill-generator.test.ts
```

Expected:

- FAIL because `scripts/lib/onboarding-skill-set.cjs` does not exist yet
- FAIL because `generateSkillArtifacts` still only models one generated package

- [ ] **Step 3: Implement the smallest dual-package generation layer**

Implement:

- a pure helper module in `scripts/lib/onboarding-skill-set.cjs` for:
  - production/test generated skill ids
  - default generated install candidates for a selected role
- `scripts/lib/skill-generator.cjs` support for generating either variant explicitly, or both variants through a small wrapper that returns two artifact payloads

- [ ] **Step 4: Re-run the targeted tests and verify they pass**

Run:

```bash
npm test -- --run scripts/onboarding-skill-set.test.ts scripts/skill-generator.test.ts
```

Expected:

- PASS for production/test naming and content assertions

- [ ] **Step 5: Commit**

```bash
git add scripts/onboarding-skill-set.test.ts scripts/lib/onboarding-skill-set.cjs scripts/skill-generator.test.ts scripts/lib/skill-generator.cjs
git commit -m "test: add dual onboarding package generation"
```

### Task 2: Add Failing CLI Store Tests For Shared Agent And Install Selection State

**Files:**
- Modify: `scripts/onboarding-config-store.test.ts`
- Modify: `scripts/lib/onboarding-config-store.cjs`
- Modify: `scripts/lib/onboarding-skill-set.cjs`

- [ ] **Step 1: Write the failing tests**

Add tests that assert store initialization now seeds:

- `selectedAgentIds` from `sharedConfig.testDefaults.agentApps`
- `selectedInstallSkillIds` with:
  - selected base skills
  - all role-applicable production package ids
  - all role-applicable test package ids

Also add tests that assert:

- removing a base skill removes it from `selectedBaseSkillIds`
- removing a base skill also removes it from `selectedInstallSkillIds`
- changing the selected role rebuilds generated install candidates and drops stale generated ids

- [ ] **Step 2: Run the targeted tests and verify they fail**

Run:

```bash
npm test -- --run scripts/onboarding-config-store.test.ts
```

Expected:

- FAIL because installations state does not yet persist `selectedAgentIds`
- FAIL because no persisted `selectedInstallSkillIds` exist

- [ ] **Step 3: Implement the minimal store changes**

Update `scripts/lib/onboarding-config-store.cjs` so `installations.json` persists:

- `selectedAgentIds`
- `selectedInstallSkillIds`
- per-agent `installedSkillIds`

Keep normalization in the store:

- invalid Agent ids are filtered out
- invalid install skill ids are filtered out
- generated package ids are rebuilt from the currently selected role and use cases

- [ ] **Step 4: Re-run the targeted tests and verify they pass**

Run:

```bash
npm test -- --run scripts/onboarding-config-store.test.ts
```

Expected:

- PASS for seeded selection state and pruning behavior

- [ ] **Step 5: Commit**

```bash
git add scripts/onboarding-config-store.test.ts scripts/lib/onboarding-config-store.cjs scripts/lib/onboarding-skill-set.cjs
git commit -m "feat: persist onboarding install selection state"
```

### Task 3: Add Failing CLI Manager Tests For Shared Install Selection And Dual Sync

**Files:**
- Modify: `scripts/onboarding-manager.test.ts`
- Modify: `scripts/lib/onboarding-manager.cjs`
- Modify: `scripts/test-onboarding.cjs`

- [ ] **Step 1: Write the failing tests**

Add tests that assert the manager layer now:

- exposes one shared install selection for all selected Agents
- stages both the production and test generated package directories
- computes desired install ids from:
  - selected base skills
  - selected generated production ids
  - selected generated test ids
- removes deselected onboarding-managed skills from each selected Agent

- [ ] **Step 2: Run the targeted tests and verify they fail**

Run:

```bash
npm test -- --run scripts/onboarding-manager.test.ts
```

Expected:

- FAIL because manager helpers still assume one generated package per use case
- FAIL because install flow still picks a single target at a time

- [ ] **Step 3: Implement the smallest manager refactor**

Refactor `scripts/lib/onboarding-manager.cjs` so it:

- reads and updates `selectedAgentIds`
- reads and updates `selectedInstallSkillIds`
- stages both generated variants for each role-applicable use case
- synchronizes the selected install set to each selected Agent
- treats the onboarding-selected install set as authoritative for onboarding-managed skill ids

Keep `scripts/test-onboarding.cjs` as the entrypoint, with only the minimal wiring changes required.

- [ ] **Step 4: Re-run the targeted tests and verify they pass**

Run:

```bash
npm test -- --run scripts/onboarding-manager.test.ts scripts/onboarding-config-store.test.ts scripts/onboarding-skill-set.test.ts scripts/skill-generator.test.ts
```

Expected:

- PASS for CLI install selection and sync-plan coverage

- [ ] **Step 5: Commit**

```bash
git add scripts/onboarding-manager.test.ts scripts/lib/onboarding-manager.cjs scripts/test-onboarding.cjs
git commit -m "feat: sync dual onboarding packages across selected agents"
```

### Task 4: Add Failing Rust Tests For Onboarding State And Sync Planning

**Files:**
- Create: `src-tauri/src/models/onboarding.rs`
- Modify: `src-tauri/src/models/mod.rs`
- Create: `src-tauri/src/onboarding/mod.rs`
- Create: `src-tauri/src/onboarding/state.rs`
- Create: `src-tauri/src/onboarding/sync.rs`

- [ ] **Step 1: Write the failing Rust unit tests**

Add unit tests that assert Rust onboarding helpers can:

- derive production/test generated skill ids for a role/use-case pair
- compute the default selected install set
- prune deselected base skills from credential-relevant selection state
- build per-Agent add/remove/unchanged previews for multiple selected Agents

- [ ] **Step 2: Run the Rust tests and verify they fail**

Run:

```bash
cd src-tauri && cargo test onboarding --lib
```

Expected:

- FAIL because onboarding model and sync modules do not exist yet

- [ ] **Step 3: Implement the pure onboarding domain layer**

Create a small Rust onboarding domain with:

- serializable onboarding state structs in `src-tauri/src/models/onboarding.rs`
- pure selection normalization in `src-tauri/src/onboarding/state.rs`
- pure sync-plan derivation in `src-tauri/src/onboarding/sync.rs`

Keep this layer free of Tauri command code so it can be tested directly.

- [ ] **Step 4: Re-run the Rust tests and verify they pass**

Run:

```bash
cd src-tauri && cargo test onboarding --lib
```

Expected:

- PASS for onboarding state normalization and sync previews

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/models/onboarding.rs src-tauri/src/models/mod.rs src-tauri/src/onboarding/mod.rs src-tauri/src/onboarding/state.rs src-tauri/src/onboarding/sync.rs
git commit -m "feat: add rust onboarding selection models"
```

### Task 5: Add Failing Rust Tests For Package Staging And Batch Sync Commands

**Files:**
- Create: `src-tauri/src/onboarding/generator.rs`
- Create: `src-tauri/src/commands/onboarding.rs`
- Modify: `src-tauri/src/commands/mod.rs`
- Modify: `src-tauri/src/commands/skill.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Write the failing Rust command tests**

Add tests covering:

- staging one production package and one test package under the app data directory
- returning both generated package ids in preview payloads
- synchronizing the selected install set to multiple selected Agents
- preserving partial success information when one Agent sync fails

- [ ] **Step 2: Run the Rust tests and verify they fail**

Run:

```bash
cd src-tauri && cargo test onboarding --lib
```

Expected:

- FAIL because no onboarding Tauri commands or staging helpers exist

- [ ] **Step 3: Implement onboarding command handlers**

Add a dedicated onboarding command module that can:

- load and save onboarding state under the Tauri data root
- return install candidates and sync previews
- generate staged production/test packages
- call reusable install/uninstall primitives for `codex`, `claude-code`, and `workbuddy`
- return per-Agent sync results

If `src-tauri/src/commands/skill.rs` contains install logic that must be reused, extract the reusable pieces without changing the generic single-skill API behavior.

- [ ] **Step 4: Re-run the Rust tests and verify they pass**

Run:

```bash
cd src-tauri && cargo test onboarding --lib
```

Expected:

- PASS for staged package generation and batch sync behavior

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/onboarding/generator.rs src-tauri/src/commands/onboarding.rs src-tauri/src/commands/mod.rs src-tauri/src/commands/skill.rs src-tauri/src/lib.rs
git commit -m "feat: add onboarding sync tauri commands"
```

### Task 6: Add Failing Frontend Tests For The New Onboarding Flow

**Files:**
- Create: `src/features/onboarding/OnboardingShell.test.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/types.ts`

- [ ] **Step 1: Write the failing React tests**

Add tests that assert the app now supports:

- grouped Agent + role + base-skill onboarding
- role-scoped use-case editing for all applicable use cases
- an install-selection step where production and test packages both default to checked
- deselecting a base skill removes its credential fields before the credentials step
- a completion view that shows per-Agent sync results instead of only static summary text

Mock the new Tauri onboarding commands directly in the test harness.

- [ ] **Step 2: Run the targeted frontend tests and verify they fail**

Run:

```bash
npm test -- --run src/App.test.tsx src/features/onboarding/OnboardingShell.test.tsx
```

Expected:

- FAIL because the onboarding shell and new step contract do not exist yet
- FAIL because `App.tsx` still renders the old 8-step demo flow

- [ ] **Step 3: Add only the minimal frontend types needed for the tests to compile**

Add onboarding-specific TypeScript interfaces in `src/types.ts` for:

- onboarding state
- editable use-case records
- install candidate groups
- sync preview/result payloads

Do not implement the new UI yet.

- [ ] **Step 4: Re-run the targeted frontend tests and verify they still fail for the expected missing UI behavior**

Run:

```bash
npm test -- --run src/App.test.tsx src/features/onboarding/OnboardingShell.test.tsx
```

Expected:

- FAIL on missing UI behavior, not on missing TypeScript types

- [ ] **Step 5: Commit**

```bash
git add src/features/onboarding/OnboardingShell.test.tsx src/App.test.tsx src/types.ts
git commit -m "test: cover onboarding dual package flow"
```

### Task 7: Implement The Frontend Onboarding Shell And Step Components

**Files:**
- Create: `src/features/onboarding/useOnboarding.ts`
- Create: `src/features/onboarding/OnboardingShell.tsx`
- Create: `src/features/onboarding/steps/AgentSelectionStep.tsx`
- Create: `src/features/onboarding/steps/RoleBaseSkillsStep.tsx`
- Create: `src/features/onboarding/steps/UseCaseConfigStep.tsx`
- Create: `src/features/onboarding/steps/InstallSelectionStep.tsx`
- Create: `src/features/onboarding/steps/CredentialsStep.tsx`
- Create: `src/features/onboarding/steps/CompletionStep.tsx`
- Modify: `src/App.tsx`
- Modify: `src/content/workbuddy.ts`
- Modify: `src/styles.css`

- [ ] **Step 1: Implement the onboarding hook against the new Tauri commands**

Create `src/features/onboarding/useOnboarding.ts` to:

- load onboarding state
- push state updates to the backend
- request install previews
- trigger final sync

- [ ] **Step 2: Implement the onboarding shell and step components**

Replace the old monolithic onboarding rendering with a dedicated shell that:

- owns the onboarding step order
- renders grouped role/base-skill selection
- renders role-scoped use-case editing
- renders the shared install-selection view
- renders credential fields only for currently selected base skills
- renders per-Agent completion results

- [ ] **Step 3: Integrate the shell into `App.tsx` without breaking the generic skill browser**

Keep:

- generic skills list/detail/install pages
- installed-skills page
- settings page

Remove the old onboarding-specific 8-step rendering from `App.tsx` once the shell is wired.

- [ ] **Step 4: Re-run the targeted frontend tests and verify they pass**

Run:

```bash
npm test -- --run src/App.test.tsx src/features/onboarding/OnboardingShell.test.tsx src/content/workbuddy.test.ts
```

Expected:

- PASS for the onboarding flow and existing content assertions

- [ ] **Step 5: Commit**

```bash
git add src/features/onboarding/useOnboarding.ts src/features/onboarding/OnboardingShell.tsx src/features/onboarding/steps/AgentSelectionStep.tsx src/features/onboarding/steps/RoleBaseSkillsStep.tsx src/features/onboarding/steps/UseCaseConfigStep.tsx src/features/onboarding/steps/InstallSelectionStep.tsx src/features/onboarding/steps/CredentialsStep.tsx src/features/onboarding/steps/CompletionStep.tsx src/App.tsx src/content/workbuddy.ts src/styles.css
git commit -m "feat: add onboarding shell with dual package install selection"
```

### Task 8: Verify The Full Regression Surface

**Files:**
- Test: `scripts/onboarding-skill-set.test.ts`
- Test: `scripts/skill-generator.test.ts`
- Test: `scripts/onboarding-config-store.test.ts`
- Test: `scripts/onboarding-manager.test.ts`
- Test: `src/App.test.tsx`
- Test: `src/features/onboarding/OnboardingShell.test.tsx`
- Test: `src/content/workbuddy.test.ts`
- Test: `src-tauri/src/onboarding/*.rs`
- Test: `src-tauri/src/commands/onboarding.rs`

- [ ] **Step 1: Run the CLI and frontend targeted suites**

Run:

```bash
npm test -- --run scripts/onboarding-skill-set.test.ts scripts/skill-generator.test.ts scripts/onboarding-config-store.test.ts scripts/onboarding-manager.test.ts src/App.test.tsx src/features/onboarding/OnboardingShell.test.tsx src/content/workbuddy.test.ts
```

Expected:

- PASS for all onboarding-related Vitest coverage

- [ ] **Step 2: Run the full frontend test suite**

Run:

```bash
npm test
```

Expected:

- PASS

- [ ] **Step 3: Run the Rust test suite**

Run:

```bash
cd src-tauri && cargo test
```

Expected:

- PASS

- [ ] **Step 4: Run the production build checks**

Run:

```bash
npm run build
cd src-tauri && cargo check
```

Expected:

- PASS for both TypeScript/Vite build and Rust compile checks

- [ ] **Step 5: Report actual verification status and any remaining gaps**

Document:

- command outputs that passed
- any flaky or environment-dependent failures
- any intentionally deferred follow-up work
