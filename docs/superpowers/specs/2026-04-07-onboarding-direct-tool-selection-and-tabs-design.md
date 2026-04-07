# Onboarding Direct Tool Selection And Work Tabs Design

**Goal:** Remove unnecessary second-level clicks from the onboarding flow, make the hero line read more directly, and split the work-configuration page into clearer `岗位` and `工作` tabs.

**Scope:** This spec only covers three follow-up interaction changes on top of the current onboarding rewrite:
- hero title wording
- direct editing inside `选择公司 IT 工具`
- tabbed navigation inside `配置要交给 AI 的工作`

## Approved Changes

### 1. Hero Title

Current:

`把公司的 SOP 交给 AI 执行，省下时间去做真正有价值的事。`

New:

`公司的 SOP 交给 AI 执行，省下时间去做真正有价值的事。`

Only the leading `把` is removed. The rest of the hero copy stays unchanged.

### 2. `选择公司 IT 工具` Becomes Direct-Edit

The first onboarding module currently opens into a second-level entry card before the checkbox list appears. That extra step adds no value because this module now has only one job.

New behavior:
- clicking `选择公司 IT 工具` on the home screen opens the module directly into the editable checkbox list
- the nested entry card and its matching detail panel are removed from this module
- the module header remains:
  - title: `选择公司 IT 工具`
  - description: `先选择公司里已经在用的 IT 工具。后续 AI 会从这些工具中获取信息。`
- the editor body shows:
  - `公司 IT 工具` checkbox list
  - save feedback
  - `保存设置` button

Design intent:
- one click from home to useful action
- no duplicate card title inside the module
- keep save semantics unchanged for this module

### 3. `配置要交给 AI 的工作` Uses Two Tabs

The current page stacks `选择岗位` and `选择工作` in one sidebar. The user asked for a clearer sequence, so this page now exposes two top-level tabs:

- `选择岗位`
- `选择工作`

#### Tab behavior

Default tab:
- open the module on `选择岗位`

`选择岗位` tab:
- shows the role radio group
- shows the `保存岗位` button
- shows role save feedback
- does not show the work list or work editor

`选择工作` tab:
- shows the work list for the currently selected role
- shows the selected work editor on the right
- keeps the existing `保存设置` behavior for work content
- if no work is available for the current role, show the existing empty-state style with updated wording

#### Layout intent

The tabs sit above the module content, not inside a narrow side panel. This keeps the interaction order explicit:
1. pick a role
2. switch to the work tab
3. edit and save work content

The page should still reuse the existing role state, work state, and save actions. This change is a UI reorganization, not a data-model rewrite.

## State And Save Rules

### Role Save

`保存岗位` must remain role-scoped:
- persists the role change and any role-driven recalculation
- must not persist unrelated unsaved edits from other modules
- must not clear unrelated unsaved local edits from the current UI

### Work Save

`保存设置` inside the `选择工作` tab remains scoped to the selected work item, matching the current behavior.

## Testing Requirements

Tests should lock these behaviors:
- the hero title uses the new wording without `把`
- entering `选择公司 IT 工具` no longer requires a nested second click before checkboxes appear
- the work module opens on the `选择岗位` tab by default
- switching to the `选择工作` tab reveals the work list and editor
- `保存岗位` and work-save behavior continue to respect their current save scopes

## Files Expected To Change

- `src/content/copy.ts`
  - hero title wording
- `src/features/onboarding/OnboardingShell.tsx`
  - direct-edit IT-tool module
  - work-module tabs
- `src/features/onboarding/OnboardingShell.test.tsx`
  - updated flow tests and new tab/direct-entry assertions
- `src/App.test.tsx`
  - hero title assertion update
- `src/styles.css`
  - tab styling if current shared styles are insufficient
