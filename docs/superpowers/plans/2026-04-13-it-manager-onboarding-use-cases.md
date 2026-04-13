# IT Manager Onboarding Use Cases Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the visible `it-manager` onboarding role and five structured IT use cases so the role picker and onboarding editor expose realistic IT-manager workflows.

**Architecture:** Keep the implementation config-driven. Add the new role and use-case definitions in `src/shared/config.json`, then expose the role through `src/content/workbuddy.ts` so all downstream onboarding builders pick it up automatically. Verify with focused `vitest` coverage before running the full frontend suite.

**Tech Stack:** TypeScript, Vitest, React onboarding config layer, shared JSON configuration

---

### Task 1: Lock the IT-manager behavior with tests

**Files:**
- Modify: `src/content/workbuddy.test.ts`
- Modify: `src/features/onboarding/OnboardingShell.test.tsx`
- Test: `src/content/workbuddy.test.ts`
- Test: `src/features/onboarding/OnboardingShell.test.tsx`

- [ ] **Step 1: Write the failing test**

```ts
it('assigns five daily IT-management use cases to it-manager', () => {
  expect(sharedConfig.roles['it-manager']?.useCases).toEqual([
    'IT 服务台工单分析与周报',
    '账号权限申请审核与开通跟踪',
    '基础应用程序的安装',
    '运维巡检异常汇总',
    '项目立项配置建立',
  ])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/content/workbuddy.test.ts src/features/onboarding/OnboardingShell.test.tsx`
Expected: FAIL because `it-manager` is not yet present in `sharedConfig.roles` and the onboarding role selector does not render `IT经理`.

- [ ] **Step 3: Extend the tests to cover structured questions**

```ts
expect(getOnboardingUseCaseOptionById('it-service-desk-report')?.structured_questions).toEqual([
  expect.objectContaining({ id: 'service-desk-ticket-source', label: '从哪里获取服务台工单清单？' }),
  expect.objectContaining({ id: 'service-desk-progress-source', label: '从哪里可以知道处理进展、SLA 和责任人？' }),
  expect.objectContaining({ id: 'service-desk-weekly-report-sop', label: '从哪里获取 IT 服务台周报模板或 SOP？' }),
  expect.objectContaining({ id: 'other', label: '其他', required: false }),
])
```

- [ ] **Step 4: Re-run the focused tests**

Run: `npm test -- src/content/workbuddy.test.ts src/features/onboarding/OnboardingShell.test.tsx`
Expected: FAIL on the new IT-manager assertions and structured-question lookups.

### Task 2: Add the IT-manager role and use-case definitions

**Files:**
- Modify: `src/shared/config.json`
- Modify: `src/content/workbuddy.ts`
- Test: `src/content/workbuddy.test.ts`

- [ ] **Step 1: Add the visible role entry**

```json
"it-manager": {
  "name": {
    "zh-CN": "IT经理",
    "en-US": "IT Manager"
  },
  "description": {
    "zh-CN": "更关注IT基础设施、系统运维和技术支持。",
    "en-US": "Focuses on IT infrastructure, system operations, and technical support."
  },
  "useCases": [
    "IT 服务台工单分析与周报",
    "账号权限申请审核与开通跟踪",
    "基础应用程序的安装",
    "运维巡检异常汇总",
    "项目立项配置建立"
  ]
}
```

- [ ] **Step 2: Add the five config-driven use cases**

```json
"IT 服务台工单分析与周报": {
  "directory": "it-service-desk-report",
  "structuredQuestions": [
    { "id": "service-desk-ticket-source", "label": { "zh-CN": "从哪里获取服务台工单清单？" } },
    { "id": "service-desk-progress-source", "label": { "zh-CN": "从哪里可以知道处理进展、SLA 和责任人？" } },
    { "id": "service-desk-weekly-report-sop", "label": { "zh-CN": "从哪里获取 IT 服务台周报模板或 SOP？" } },
    { "id": "other", "label": { "zh-CN": "其他" }, "required": false }
  ]
}
```

- [ ] **Step 3: Expose the role in the visible onboarding role list**

```ts
const visibleRoleIds = ['project-manager', 'qa-manager', 'it-manager'] as const
```

- [ ] **Step 4: Run the focused tests to verify the new role and use cases pass**

Run: `npm test -- src/content/workbuddy.test.ts src/features/onboarding/OnboardingShell.test.tsx`
Expected: PASS for the focused suite.

### Task 3: Verify the frontend suite stays green

**Files:**
- Test: `src/content/workbuddy.test.ts`
- Test: `src/features/onboarding/OnboardingShell.test.tsx`

- [ ] **Step 1: Run the full frontend tests**

Run: `npm test`
Expected: PASS with zero failing Vitest suites.

- [ ] **Step 2: Record the implementation result**

Run: `git status --short`
Expected: Show the config, workbuddy, test, and plan-file changes for this task, with no unintended file edits.
