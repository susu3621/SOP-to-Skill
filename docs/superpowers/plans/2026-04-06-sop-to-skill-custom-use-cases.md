# SOP To Skill Rename And Custom Use Cases Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the visible desktop product to `SOP to Skill` and let users add or delete custom use cases that join the same installable skill pipeline as built-in use cases.

**Architecture:** Keep the existing onboarding state contract and install commands, but move generated-use-case derivation to the current `role_use_case_contents` records instead of the static config list. Preserve the built-in prompt-backed experience for bundled use cases, while treating custom use cases as first-class editable records identified by a stable `custom-` id.

**Tech Stack:** React 18, TypeScript, CSS, Vitest, Testing Library, Tauri metadata

---

### Task 1: Rename Visible Product Surfaces To `SOP to Skill`

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/content/copy.ts`
- Modify: `src/App.test.tsx`
- Modify: `index.html`
- Modify: `src-tauri/tauri.conf.json`

- [ ] **Step 1: Write the failing test**

Extend `src/App.test.tsx` so the rendered shell asserts the visible product name and document title are updated:

```tsx
render(<App />)

expect(await screen.findByRole('heading', { name: 'SOP to Skill' })).toBeInTheDocument()
expect(
  screen.getByText('把团队 SOP 整理成可复用、可安装的 AI Skills。')
).toBeInTheDocument()
expect(document.title).toBe('SOP to Skill')
expect(screen.queryByText('AI 时代先受益的，是每天被重复工作困住的人。')).not.toBeInTheDocument()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/App.test.tsx`
Expected: FAIL because the header copy still renders the previous marketing title and `document.title` is still `Skill Configurator`.

- [ ] **Step 3: Write minimal implementation**

Update the shared copy and app metadata to make `SOP to Skill` the visible product name:

```ts
export const pageCopy = {
  appTitle: {
    'zh-CN': 'SOP to Skill',
    'en-US': 'SOP to Skill',
  },
  heroBody: {
    'zh-CN': '把团队 SOP 整理成可复用、可安装的 AI Skills。',
    'en-US': 'Turn team SOPs into reusable, installable AI skills.',
  },
}
```

Update metadata files with matching visible names:

```html
<title>SOP to Skill</title>
<meta
  name="description"
  content="Turn team SOPs into reusable, installable AI skills."
/>
```

```json
{
  "productName": "SOP to Skill",
  "app": {
    "windows": [
      {
        "title": "SOP to Skill"
      }
    ]
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/App.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/content/copy.ts src/App.test.tsx index.html src-tauri/tauri.conf.json
git commit -m "feat: rename visible app to SOP to Skill"
```

### Task 2: Preserve Custom Use Cases In The Shared Onboarding Model

**Files:**
- Modify: `src/content/workbuddy.ts`
- Modify: `src/content/workbuddy.test.ts`
- Modify: `src/features/onboarding/useOnboarding.ts`

- [ ] **Step 1: Write the failing test**

Add helper coverage in `src/content/workbuddy.test.ts` for three behaviors:

1. custom ids use the `custom-` prefix
2. duplicate custom names get a numeric suffix
3. `createDefaultRoleUseCaseContents()` keeps same-role custom records instead of dropping them

Use assertions like:

```ts
expect(createCustomUseCaseId('Weekly Risk Review', [])).toBe('custom-weekly-risk-review')
expect(
  createCustomUseCaseId('Weekly Risk Review', ['custom-weekly-risk-review'])
).toBe('custom-weekly-risk-review-2')
expect(createCustomUseCaseId('周风险复盘', [])).toBe('custom-use-case')

const normalized = createDefaultRoleUseCaseContents('project-manager', [
  {
    role_id: 'project-manager',
    use_case_id: 'custom-weekly-risk-review',
    use_case_name: '周风险复盘',
    description: '',
    info_sources: '',
    rules: '',
  },
])

expect(normalized).toEqual(
  expect.arrayContaining([
    expect.objectContaining({
      use_case_id: 'custom-weekly-risk-review',
      use_case_name: '周风险复盘',
    }),
  ])
)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/content/workbuddy.test.ts`
Expected: FAIL because the helper functions do not exist yet and normalization still rebuilds only bundled use cases.

- [ ] **Step 3: Write minimal implementation**

Add shared helper functions in `src/content/workbuddy.ts` and update normalization to preserve current-role custom records:

```ts
export const customUseCaseIdPrefix = 'custom-'

export function isCustomUseCaseId(useCaseId: string) {
  return useCaseId.startsWith(customUseCaseIdPrefix)
}

export function createCustomUseCaseId(useCaseName: string, existingIds: string[]) {
  const base =
    useCaseName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'use-case'

  let candidate = `${customUseCaseIdPrefix}${base}`
  let suffix = 2

  while (existingIds.includes(candidate)) {
    candidate = `${customUseCaseIdPrefix}${base}-${suffix}`
    suffix += 1
  }

  return candidate
}
```

Preserve custom records after bundled defaults are rebuilt:

```ts
const defaultRecords = getApplicableUseCasesForRole(roleId).map((useCase) => {
  const existingRecord = existing.find(
    (record) => record.role_id === roleId && record.use_case_id === useCase.id
  )
  const defaultDescription = buildDefaultUseCaseDescription(useCase)

  return {
    role_id: roleId,
    use_case_id: useCase.id,
    use_case_name: useCase.name,
    description: resolveUseCaseDescription(
      existingRecord?.description,
      defaultDescription,
      [useCase.description, useCase.description_prompt]
    ),
    info_sources: existingRecord?.info_sources ?? '',
    rules: clearLegacyAutofillText(existingRecord?.rules, [useCase.rules_prompt]),
  }
})
const customRecords = existing.filter(
  (record) => record.role_id === roleId && isCustomUseCaseId(record.use_case_id)
)

return [...defaultRecords, ...customRecords]
```

In `src/features/onboarding/useOnboarding.ts`, switch dynamic use-case derivation away from the static `onboardingUseCases` list:

```ts
function buildSelectedUseCasesFromContents(
  roleId: string,
  roleUseCaseContents: OnboardingEditableUseCaseRecord[]
): OnboardingUseCase[] {
  return roleUseCaseContents
    .filter((record) => record.role_id === roleId)
    .map((record) => ({
      id: record.use_case_id,
      name: record.use_case_name,
      directory: record.use_case_id,
      applicable_role_ids: [roleId],
    }))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/content/workbuddy.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/content/workbuddy.ts src/content/workbuddy.test.ts src/features/onboarding/useOnboarding.ts
git commit -m "feat: preserve custom onboarding use cases"
```

### Task 3: Add Custom Use Case Creation And Deletion In The Onboarding UI

**Files:**
- Modify: `src/features/onboarding/OnboardingShell.tsx`
- Modify: `src/features/onboarding/useOnboarding.ts`
- Modify: `src/features/onboarding/OnboardingShell.test.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Write the failing test**

Add onboarding integration tests that cover creation and deletion:

```tsx
await user.click(screen.getByRole('button', { name: '用例配置' }))
await user.type(screen.getByLabelText('新增用例名称'), '周风险复盘')
await user.click(screen.getByRole('button', { name: '新增用例' }))

expect(screen.getByRole('button', { name: '周风险复盘' })).toBeInTheDocument()
expect(screen.getByText(/^custom-/)).toBeInTheDocument()
expect(screen.getByLabelText('用例描述')).toHaveValue('')
expect(screen.getByLabelText('当前流程 / SOP / 模板')).toHaveValue('')
expect(screen.getByRole('button', { name: '删除该用例' })).toBeInTheDocument()
```

Seed a saved custom use case and verify deletion:

```tsx
vi.spyOn(window, 'confirm').mockReturnValue(true)

await user.click(screen.getByRole('button', { name: '周风险复盘' }))
await user.click(screen.getByRole('button', { name: '删除该用例' }))

expect(screen.queryByRole('button', { name: '周风险复盘' })).not.toBeInTheDocument()
expect(window.confirm).toHaveBeenCalled()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/onboarding/OnboardingShell.test.tsx`
Expected: FAIL because the sidebar does not yet have an add-use-case form or custom-only delete action.

- [ ] **Step 3: Write minimal implementation**

Expose create/delete actions from `useOnboarding`:

```ts
const createUseCase = useCallback((useCaseName: string) => {
  const trimmedName = useCaseName.trim()
  if (!trimmedName) return null

  const useCaseId = createCustomUseCaseId(
    trimmedName,
    state.role_use_case_contents.map((record) => record.use_case_id)
  )

  const nextRoleUseCaseContents = [
    ...state.role_use_case_contents,
    {
      role_id: state.selected_role_id,
      use_case_id: useCaseId,
      use_case_name: trimmedName,
      description: '',
      info_sources: '',
      rules: '',
    },
  ]

  updateState((current) => ({
    ...current,
    role_use_case_contents: nextRoleUseCaseContents,
    ...reconcileInstallSelection(
      current,
      current.selected_role_id,
      current.selected_base_skill_ids,
      nextRoleUseCaseContents
    ),
  }))

  return useCaseId
}, [state.role_use_case_contents, updateState])
```

Render the creator near the use case list and show delete only for custom items:

```tsx
<label className="field">
  <span>新增用例名称</span>
  <input
    value={newUseCaseName}
    onChange={(event) => setNewUseCaseName(event.target.value)}
  />
</label>
<button type="button" onClick={handleCreateUseCase}>新增用例</button>
```

```tsx
{activeUseCase && isCustomUseCaseId(activeUseCase.use_case_id) ? (
  <button
    className="button--ghost"
    type="button"
    onClick={() => {
      if (window.confirm(`确认删除用例「${activeUseCase.use_case_name}」吗？`)) {
        deleteUseCase(activeUseCase.use_case_id)
      }
    }}
  >
    删除该用例
  </button>
) : null}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/features/onboarding/OnboardingShell.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/onboarding/OnboardingShell.tsx src/features/onboarding/useOnboarding.ts src/features/onboarding/OnboardingShell.test.tsx src/styles.css
git commit -m "feat: add custom onboarding use case management"
```

### Task 4: Derive Install Candidates From The Current Use Case Records

**Files:**
- Modify: `src/features/onboarding/useOnboarding.ts`
- Modify: `src/features/onboarding/OnboardingShell.test.tsx`
- Modify: `src/features/onboarding/steps/InstallSelectionStep.tsx`

- [ ] **Step 1: Write the failing test**

Add an onboarding integration test that creates a custom use case, navigates to `安装技能`, and verifies the generated packages use the `custom-` id. Also verify deletion removes the stale install group.

Use checks like:

```tsx
await user.click(screen.getByRole('button', { name: '安装技能' }))

expect(screen.getByText('周风险复盘')).toBeInTheDocument()
expect(
  screen.getByRole('checkbox', { name: '周风险复盘 生产包' })
).toBeChecked()
expect(
  screen.getByRole('checkbox', { name: '周风险复盘 测试包' })
).toBeChecked()

await user.click(screen.getByRole('button', { name: '返回首页' }))
await user.click(screen.getByRole('button', { name: '用例配置' }))
await user.click(screen.getByRole('button', { name: '删除该用例' }))
await user.click(screen.getByRole('button', { name: '返回首页' }))
await user.click(screen.getByRole('button', { name: '安装技能' }))

expect(screen.queryByText('周风险复盘')).not.toBeInTheDocument()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/onboarding/OnboardingShell.test.tsx`
Expected: FAIL because the install page still derives generated groups from the static bundled use-case config.

- [ ] **Step 3: Write minimal implementation**

Update `useOnboarding.ts` so every install-related calculation uses the current state records:

```ts
function buildManagedSkillIds(
  roleId: string,
  baseSkillIds: string[],
  roleUseCaseContents: OnboardingEditableUseCaseRecord[]
) {
  const selectedBaseSkillIds = unique(
    baseSkillIds.filter((skillId) => onboardingBaseSkills.some((skill) => skill.id === skillId))
  )
  const generatedSkillIds = buildSelectedUseCasesFromContents(roleId, roleUseCaseContents).flatMap(
    (useCase) => {
      const generated = buildGeneratedSkillIdsForRoleUseCase(roleId, useCase.directory)
      return [generated.production_skill_id, generated.test_skill_id]
    }
  )

  return unique([...selectedBaseSkillIds, ...generatedSkillIds])
}
```

Update related derivations:

```ts
const selectedUseCases = useMemo(
  () => buildSelectedUseCasesFromContents(state.selected_role_id, state.role_use_case_contents),
  [state.selected_role_id, state.role_use_case_contents]
)

const installCandidateGroups = useMemo(
  () =>
    selectedUseCases.map((useCase) => ({
      use_case_id: useCase.id,
      use_case_name: useCase.name,
      ...buildGeneratedSkillIdsForRoleUseCase(state.selected_role_id, useCase.directory),
    })),
  [selectedUseCases, state.selected_role_id]
)
```

When staging packages, stop looking up bundled directories and use the record id directly:

```ts
use_case_directory: useCaseContent.use_case_id
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/features/onboarding/OnboardingShell.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/onboarding/useOnboarding.ts src/features/onboarding/OnboardingShell.test.tsx src/features/onboarding/steps/InstallSelectionStep.tsx
git commit -m "feat: derive onboarding install candidates from current use cases"
```

### Task 5: Run Verification

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/content/copy.ts`
- Modify: `src/content/workbuddy.ts`
- Modify: `src/content/workbuddy.test.ts`
- Modify: `src/features/onboarding/OnboardingShell.tsx`
- Modify: `src/features/onboarding/OnboardingShell.test.tsx`
- Modify: `src/features/onboarding/useOnboarding.ts`
- Modify: `src/features/onboarding/steps/InstallSelectionStep.tsx`
- Modify: `src/styles.css`
- Modify: `index.html`
- Modify: `src-tauri/tauri.conf.json`

- [ ] **Step 1: Run focused frontend tests**

Run: `npm test -- src/App.test.tsx src/content/workbuddy.test.ts src/features/onboarding/OnboardingShell.test.tsx`
Expected: PASS

- [ ] **Step 2: Run full frontend test suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 3: Review diff**

Run: `git status --short`
Expected: only the intended app rename, onboarding custom-use-case, style, spec, and plan changes in the worktree.
