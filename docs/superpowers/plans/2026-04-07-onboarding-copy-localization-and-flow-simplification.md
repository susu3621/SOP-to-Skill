# Onboarding Copy Localization And Flow Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the home/setup copy into plain Chinese, keep only `SOP`/`AI`/`Skill`/`IT` as generic English terms, and reorganize the three setup modules so users move from company IT tools to AI work configuration and then installation.

**Architecture:** Keep the current React structure and onboarding state model, but update user-facing copy at the `copy.ts`, `App.tsx`, and `OnboardingShell.tsx` boundaries. The first setup module becomes company IT tools only, the second module absorbs role selection plus use-case editing, and tests lock both the new copy and the new module flow before code changes land.

**Tech Stack:** React, TypeScript, Vitest, Vite

---

## File Structure

- `src/content/copy.ts`
  Owns the home masthead title/body and other top-level shared copy.
- `src/App.tsx`
  Renders the app shell, top navigation, Skills/installed/settings copy, and mounts the onboarding shell.
- `src/App.test.tsx`
  Smoke-tests the app shell and catches regressions in masthead/nav/home copy.
- `src/features/onboarding/OnboardingShell.tsx`
  Renders the home setup cards, module headers, nested entry cards, and the current role/base-skill/use-case/install flow.
- `src/features/onboarding/OnboardingShell.test.tsx`
  Owns the setup-home and module interaction assertions; this is where copy/order/module-boundary regressions should be locked.

### Task 1: Lock the home masthead and app-shell language with failing tests

**Files:**
- Modify: `src/App.test.tsx`
- Test: `src/App.test.tsx`

- [ ] **Step 1: Write the failing app-shell copy tests**

Add assertions to `src/App.test.tsx` inside `opens the onboarding home menu instead of the legacy long-form shell`:

```tsx
expect(
  screen.getByRole('heading', {
    name: '把公司的 SOP 交给 AI 执行，省下时间去做真正有价值的事。',
  })
).toBeInTheDocument()
expect(
  screen.getByText(
    '先选公司常用的 IT 工具，再告诉 AI 要做哪些工作，最后安装到 AI 工具里，让重复工作按公司的 SOP 自动完成。'
  )
).toBeInTheDocument()
expect(screen.getByRole('button', { name: '开始设置' })).toBeInTheDocument()
expect(screen.getByRole('button', { name: 'Skill 库' })).toBeInTheDocument()
expect(screen.queryByRole('button', { name: 'Onboarding' })).not.toBeInTheDocument()
expect(screen.getByRole('button', { name: '选择公司 IT 工具' })).toBeInTheDocument()
expect(screen.getByRole('button', { name: '配置要交给 AI 的工作' })).toBeInTheDocument()
expect(screen.getByRole('button', { name: '安装到 AI 工具' })).toBeInTheDocument()
```

Also add a second test covering the empty Skill-library copy:

```tsx
it('uses singular Skill wording in the empty skill library state', async () => {
  const user = userEvent.setup()
  render(<App />)

  await screen.findByRole('heading', { name: '开始设置' })
  await user.click(screen.getByRole('button', { name: 'Skill 库' }))

  expect(screen.getByRole('heading', { name: '可用 Skill' })).toBeInTheDocument()
  expect(
    screen.getByText(
      '暂无可用 Skill。请将 Skill 目录包放到仓库的 `skills/` 目录，或应用数据目录中的 `skills/` 目录。'
    )
  ).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the focused app-shell tests to verify they fail**

Run:

```bash
npm test -- src/App.test.tsx
```

Expected:
- FAIL because the masthead still renders the old abstract title/body
- FAIL because top navigation still shows `Onboarding`
- FAIL because the home card titles still render `基础信息设置 / 用例配置 / 安装技能`
- FAIL because the Skill library still renders plural `Skills`

### Task 2: Rewrite the masthead, top navigation, and app-shell copy

**Files:**
- Modify: `src/content/copy.ts`
- Modify: `src/App.tsx`
- Test: `src/App.test.tsx`

- [ ] **Step 1: Replace the home masthead copy in `src/content/copy.ts`**

Update the shared copy values:

```ts
appTitle: {
  'zh-CN': '把公司的 SOP 交给 AI 执行，省下时间去做真正有价值的事。',
  'en-US': 'Hand your company SOPs to AI so you can spend time on work that matters.',
},
heroBody: {
  'zh-CN':
    '先选公司常用的 IT 工具，再告诉 AI 要做哪些工作，最后安装到 AI 工具里，让重复工作按公司的 SOP 自动完成。',
  'en-US':
    'Choose the company IT tools first, decide which work AI should handle, then install it into an AI tool so repeated SOP work can run automatically.',
},
```

Keep the existing keys so `App.tsx` call sites do not change shape.

- [ ] **Step 2: Rewrite app-shell labels in `src/App.tsx`**

Apply these visible copy changes in `src/App.tsx`:

```tsx
<button className="button--ghost" type="button" onClick={() => setView('onboarding')}>
  开始设置
</button>
<button className="button--ghost" type="button" onClick={() => setView('skills-list')}>
  Skill 库
</button>
```

And update the Skill pages:

```tsx
<span className="panel__eyebrow">Skill 库</span>
<h2 className="panel__title">可用 Skill</h2>
<p className="panel__body">浏览并安装可用 Skill。</p>
...
<p className="muted">
  暂无可用 Skill。请将 Skill 目录包放到仓库的 `skills/` 目录，或应用数据目录中的
  `skills/` 目录。
</p>
...
<h2 className="panel__title">已安装 Skill</h2>
<p className="panel__body">管理已经安装到各个 AI 工具中的 Skill。</p>
...
<p className="muted">暂无已安装 Skill。</p>
```

Do not rename `Skill` itself or product/tool proper names such as `Codex`.

- [ ] **Step 3: Run the app-shell tests again**

Run:

```bash
npm test -- src/App.test.tsx
```

Expected:
- PASS

- [ ] **Step 4: Commit the app-shell copy rewrite**

```bash
git add src/content/copy.ts src/App.tsx src/App.test.tsx
git commit -m "feat: localize app shell copy for onboarding flow"
```

### Task 3: Lock the setup-home card order and Chinese copy with failing tests

**Files:**
- Modify: `src/features/onboarding/OnboardingShell.test.tsx`
- Test: `src/features/onboarding/OnboardingShell.test.tsx`

- [ ] **Step 1: Write failing setup-home tests**

Update `src/features/onboarding/OnboardingShell.test.tsx` so the setup-home expectations match the new wording and order.

In `shows the default role while leaving unsaved sections incomplete for a fresh state`, replace:

```tsx
const basicCard = screen.getByRole('button', { name: '基础信息设置' })
const useCaseCard = screen.getByRole('button', { name: '用例配置' })
const installCard = screen.getByRole('button', { name: '安装技能' })
```

with:

```tsx
const toolsCard = screen.getByRole('button', { name: '选择公司 IT 工具' })
const workCard = screen.getByRole('button', { name: '配置要交给 AI 的工作' })
const installCard = screen.getByRole('button', { name: '安装到 AI 工具' })
```

and keep the completion assertions on those three cards.

In `renders contextual details for the hovered home entry`, assert the new details:

```tsx
expect(within(detailPanel as HTMLElement).getByRole('heading', { name: '选择公司 IT 工具' })).toBeInTheDocument()
expect(within(detailPanel as HTMLElement).getByText('先选公司常用系统')).toBeInTheDocument()
expect(within(detailPanel as HTMLElement).getByText('配置要交给 AI 的工作')).toBeInTheDocument()
expect(within(detailPanel as HTMLElement).getByText('安装到 AI 工具')).toBeInTheDocument()
```

Also add a new test for the section helper copy:

```tsx
it('renders the setup section helper copy in plain chinese', async () => {
  render(<App />)

  expect(await screen.findByRole('heading', { name: '开始设置' })).toBeInTheDocument()
  expect(
    screen.getByText('按下面 3 步设置好以后，AI 就能按公司的 SOP 去完成你选好的工作。')
  ).toBeInTheDocument()
  expect(screen.queryByText('Onboarding')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run the focused onboarding-shell tests to verify they fail**

Run:

```bash
npm test -- src/features/onboarding/OnboardingShell.test.tsx
```

Expected:
- FAIL because the setup-home card titles and detail copy still use the old wording
- FAIL because the home helper area still exposes `Onboarding`

### Task 4: Reorder the setup flow and move role selection into the work-configuration module

**Files:**
- Modify: `src/features/onboarding/OnboardingShell.tsx`
- Modify: `src/features/onboarding/OnboardingShell.test.tsx`
- Test: `src/features/onboarding/OnboardingShell.test.tsx`

- [ ] **Step 1: Rewrite the setup-home entry copy and order in `OnboardingShell.tsx`**

Update `onboardingHomeEntries`:

```tsx
const onboardingHomeEntries: Record<Exclude<OnboardingView, 'home'>, EntryCopy> = {
  basic: {
    title: '选择公司 IT 工具',
    summary: '先选公司常用系统',
    description: '先选公司里已经在用的 IT 工具。AI 后面要从这些工具里取信息，才能按公司的 SOP 做事。',
    items: ['选择公司 IT 工具'],
  },
  useCases: {
    title: '配置要交给 AI 的工作',
    summary: '先选岗位，再选工作',
    description: '先选岗位，再决定哪些工作要交给 AI 去做，并补充对应的 SOP、信息来源和执行要求。',
    items: ['选择岗位', '选择工作', '补充 SOP / 信息来源 / 执行要求'],
  },
  install: {
    title: '安装到 AI 工具',
    summary: '选择工具并开始安装',
    description: '把前面整理好的 Skill 安装到你正在使用的 AI 工具里，之后就可以直接调用。',
    items: ['选择 AI 工具', '确认安装内容', '开始安装'],
  },
}
```

Also update the home header block:

```tsx
<span className="panel__eyebrow">开始设置</span>
<h2 className="panel__title">开始设置</h2>
<p className="panel__body">
  按下面 3 步设置好以后，AI 就能按公司的 SOP 去完成你选好的工作。
</p>
```

- [ ] **Step 2: Simplify the first module so it only covers company IT tools**

Replace the current `basicInfoEntries` shape with a single IT-tool entry:

```tsx
const basicInfoEntries: Record<'baseSkills', EntryCopy> = {
  baseSkills: {
    title: '选择公司 IT 工具',
    summary: '多选公司常用系统',
    description: '选择公司里已经在用的 IT 工具。后续 AI 会从这些工具里获取信息。',
    items: onboardingBaseSkills.map((skill) => skill.name),
  },
}
```

Then remove the role entry card from the `view === 'basic'` branch and render only one card:

```tsx
<EntryCard
  active={hoveredBasicEntry === 'baseSkills'}
  complete={completion.baseSkills}
  index="1"
  summary={basicInfoEntries.baseSkills.summary}
  title={basicInfoEntries.baseSkills.title}
  onClick={() => {
    setBasicEntryView('baseSkills')
    setHoveredBasicEntry('baseSkills')
  }}
  onFocus={() => setHoveredBasicEntry('baseSkills')}
  onHover={() => setHoveredBasicEntry('baseSkills')}
  onLeave={() => setHoveredBasicEntry(null)}
/>;
```

Update the module header copy:

```tsx
<ModuleHeader
  description="先选择公司里已经在用的 IT 工具。后续 AI 会从这些工具中获取信息。"
  eyebrow="选择公司 IT 工具"
  title="选择公司 IT 工具"
  ...
/>;
```

Update `BasicEditorPanel` so it no longer accepts or renders role selection:

```tsx
interface BasicEditorPanelProps {
  selectedBaseSkillIds: string[]
  ...
  onToggleBaseSkill: (skillId: string) => void
}
```

and keep only the `BaseSkillSelectionPanel`.

- [ ] **Step 3: Move role selection into the work-configuration module**

In the `view === 'useCases'` branch, update the module header copy:

```tsx
<ModuleHeader
  description="先选岗位，再补充这个岗位下要交给 AI 的具体工作内容和 SOP 要求。"
  eyebrow="配置要交给 AI 的工作"
  title="配置要交给 AI 的工作"
  ...
/>;
```

Then extend the sidebar so role selection appears above the use-case list:

```tsx
<section className="summary-card onboarding-module-grid__sidebar">
  <h3>选择岗位</h3>
  <p>先选岗位，再看这个岗位下可以交给 AI 的工作。</p>
  <RoleSelectionPanel selectedRoleId={state.selected_role_id} onSelectRole={selectRole} />
  <div className="button-row">
    <button
      className="button--ghost"
      disabled={!dirty.role || savingScope === 'role'}
      type="button"
      onClick={() => void saveState('role')}
    >
      {savingScope === 'role' ? '保存中...' : '保存岗位'}
    </button>
  </div>
  <h3>选择工作</h3>
  <p>当前岗位下可以交给 AI 的工作。</p>
  <UseCaseList
    activeUseCaseId={activeUseCase?.use_case_id ?? null}
    configuredById={completion.useCaseIds}
    useCases={state.role_use_case_contents}
    onSelect={setSelectedUseCaseId}
  />
</section>
```

Leave `UseCaseConfigStep` in the content panel, but adjust any surrounding wording from `用例` to `工作` where it is generic rather than a model identifier.

- [ ] **Step 4: Update interaction tests for the new module boundaries**

In `src/features/onboarding/OnboardingShell.test.tsx`, update the flow tests so they click the new card names and assert the new module text.

Examples:

```tsx
await user.click(screen.getByRole('button', { name: '选择公司 IT 工具' }))
expect(await screen.findByRole('heading', { name: '选择公司 IT 工具' })).toBeInTheDocument()
expect(screen.queryByRole('button', { name: '选择岗位' })).not.toBeInTheDocument()
expect(screen.getByRole('button', { name: '选择公司 IT 工具' })).toBeInTheDocument()
```

and:

```tsx
await user.click(screen.getByRole('button', { name: '配置要交给 AI 的工作' }))
expect(await screen.findByRole('heading', { name: '配置要交给 AI 的工作' })).toBeInTheDocument()
expect(screen.getByText('选择岗位')).toBeInTheDocument()
expect(screen.getByText('选择工作')).toBeInTheDocument()
```

Update any save-flow tests that currently enter through `基础信息设置 -> 选择岗位` so they now enter through `配置要交给 AI 的工作`.

- [ ] **Step 5: Run the onboarding-shell tests again**

Run:

```bash
npm test -- src/features/onboarding/OnboardingShell.test.tsx
```

Expected:
- PASS

- [ ] **Step 6: Run the app-shell tests and production build**

Run:

```bash
npm test -- src/App.test.tsx
npm run build
```

Expected:
- PASS
- build succeeds with exit code 0

- [ ] **Step 7: Commit the onboarding flow rewrite**

```bash
git add src/features/onboarding/OnboardingShell.tsx src/features/onboarding/OnboardingShell.test.tsx
git commit -m "feat: simplify onboarding copy and flow"
```
