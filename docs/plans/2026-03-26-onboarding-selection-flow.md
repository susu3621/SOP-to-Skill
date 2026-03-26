# Onboarding Selection Flow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 CLI onboarding 配置器从“主数据 CRUD 面板”改为“预置项选择 + 用例内容编辑”流程。

**Architecture:** 共享配置中的岗位、基础技能、用例映射和 agent 目标继续作为预置来源。配置存储层新增“当前选中项”状态，交互层只允许选择岗位、基础技能和安装目标；真正允许编辑的内容仅保留在用例描述、信息来源和规则字段。

**Tech Stack:** Node.js, CommonJS, Vitest

---

### Task 1: Add failing store tests for seeded selections

**Files:**
- Modify: `scripts/onboarding-config-store.test.ts`
- Modify: `scripts/lib/onboarding-config-store.cjs`

- [ ] Step 1: Write a failing test asserting store initialization seeds default selectable agents and role-bound use cases from shared config.
- [ ] Step 2: Run `npm test -- --run scripts/onboarding-config-store.test.ts` and verify it fails for the expected missing state.
- [ ] Step 3: Implement minimal store changes to persist selected roles, selected base skills, seeded agents, and role-bound use cases.
- [ ] Step 4: Re-run `npm test -- --run scripts/onboarding-config-store.test.ts` and verify it passes.

### Task 2: Add failing manager tests for selection-oriented menus

**Files:**
- Modify: `scripts/onboarding-manager.test.ts`
- Modify: `scripts/lib/onboarding-manager.cjs`

- [ ] Step 1: Write failing tests for helper outputs that describe role selection, base skill selection, role-filtered use case editing, and agent-target installation.
- [ ] Step 2: Run `npm test -- --run scripts/onboarding-manager.test.ts` and verify the new expectations fail.
- [ ] Step 3: Implement minimal manager helpers and menu flow changes to remove create/edit/delete flows for preseeded entities.
- [ ] Step 4: Re-run `npm test -- --run scripts/onboarding-manager.test.ts` and verify it passes.

### Task 3: Wire use case editing to role-specific choices only

**Files:**
- Modify: `scripts/lib/onboarding-manager.cjs`
- Modify: `scripts/onboarding-config-store.test.ts`
- Modify: `scripts/onboarding-manager.test.ts`

- [ ] Step 1: Write a failing test asserting that only use case content fields are editable once a role and one of its mapped use cases are selected.
- [ ] Step 2: Run targeted tests to verify it fails.
- [ ] Step 3: Implement the smallest code path to edit only `description`, `infoSources`, and `rules` for an existing role-bound use case record.
- [ ] Step 4: Re-run targeted tests to verify they pass.

### Task 4: Verify the full CLI regression surface

**Files:**
- Test: `scripts/onboarding-manager.test.ts`
- Test: `scripts/onboarding-config-store.test.ts`
- Test: `npm test`

- [ ] Step 1: Run `npm test -- --run scripts/onboarding-manager.test.ts scripts/onboarding-config-store.test.ts`.
- [ ] Step 2: Run `npm test`.
- [ ] Step 3: Report actual verification status and any remaining gaps.
