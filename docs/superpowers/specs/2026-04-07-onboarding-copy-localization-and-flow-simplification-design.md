# Onboarding Copy Localization And Flow Simplification Design

## Goal

Rewrite the home-screen and setup-flow copy so it reads naturally to first-line office workers, remove unnecessary English jargon, and reorganize the three setup modules so the flow matches how a user thinks about the task.

The user-facing outcomes are:
- The home hero copy becomes more concrete and relatable to junior employees
- `Onboarding` and similar jargon are replaced with plain Chinese
- The setup flow becomes `选择公司 IT 工具 -> 配置要交给 AI 的工作 -> 安装到 AI 工具`
- Role selection moves into the "configure work" step, so the user chooses a role before choosing which work to hand to AI

## Current State

The current copy still reflects an earlier product framing:
- The home title is abstract: `AI 时代先受益的，是每天被重复工作困住的人。`
- The home subtitle is still broad and conceptual
- The top navigation still shows `Onboarding`
- The main setup area still uses module names like `基础信息设置`
- Role selection is grouped with base tools, even though the user wants role to drive the work-selection step
- The app still shows `Skills` in plural in several places

This makes the product feel more like an internal prototype than a tool for ordinary employees trying to automate routine SOP work.

## Language Rules

Only these generic English words should remain in the UI:
- `SOP`
- `AI`
- `Skill`
- `IT`

Also keep third-party or product proper names as-is, for example:
- `SOP to Skill`
- `Codex`
- `Claude Code`
- `WorkBuddy`
- `Jira`
- `Confluence`

Everything else should use natural Chinese.

That means:
- `Onboarding` -> `开始设置`
- `Agent` as a generic concept -> `AI 工具`
- `Skills` as a plural heading -> rewrite using `Skill` or a Chinese phrase built around `Skill`

## Recommended Structure

Use the existing three-module home layout, but rewrite and reorder it instead of introducing a new multi-page wizard.

### Module Order

The home screen and setup flow should use this order:
1. `选择公司 IT 工具`
2. `配置要交给 AI 的工作`
3. `安装到 AI 工具`

This keeps the implementation close to the current code while matching the user's mental model:
- first decide where company information lives
- then decide what work AI should do
- finally install the resulting Skill into an AI tool

## Home Hero Copy

Use this exact Chinese copy on the home masthead:

- Main title:
  `把公司的 SOP 交给 AI 执行，省下时间去做真正有价值的事。`
- Supporting body:
  `先选公司常用的 IT 工具，再告诉 AI 要做哪些工作，最后安装到 AI 工具里，让重复工作按公司的 SOP 自动完成。`

The tone should feel practical and encouraging, not visionary or abstract.

## Home Setup Section

### Section Header

Keep the section title as:
- `开始设置`

Use this body copy:
- `按下面 3 步设置好以后，AI 就能按公司的 SOP 去完成你选好的工作。`

Replace the current eyebrow:
- `Onboarding` -> `开始设置`

### Entry 1: Select Company IT Tools

Use:
- Title: `选择公司 IT 工具`
- Summary: `先选公司常用系统`
- Description: `先选公司里已经在用的 IT 工具。AI 后面要从这些工具里取信息，才能按公司的 SOP 做事。`
- Item framing: tools already present in the company, such as Jira or Confluence

This module should only cover the current base-tool selection. It should no longer include role selection.

### Entry 2: Configure Work For AI

Use:
- Title: `配置要交给 AI 的工作`
- Summary: `先选岗位，再选工作`
- Description: `先选岗位，再决定哪些工作要交给 AI 去做，并补充对应的 SOP、信息来源和执行要求。`
- Item list:
  - `选择岗位`
  - `选择工作`
  - `补充 SOP / 信息来源 / 执行要求`

This becomes the place where role selection lives.

### Entry 3: Install To AI Tools

Use:
- Title: `安装到 AI 工具`
- Summary: `选择工具并开始安装`
- Description: `把前面整理好的 Skill 安装到你正在使用的 AI 工具里，之后就可以直接调用。`
- Item list:
  - `选择 AI 工具`
  - `确认安装内容`
  - `开始安装`

This step should use `AI 工具` consistently instead of `Agent` or other generic English labels.

## Internal Module Reorganization

### Module 1: Company IT Tools

Current `基础信息设置` mixes:
- role selection
- base skill selection

After this change, the first module should only contain company IT-tool selection.

Recommended visible text:
- Module header title: `选择公司 IT 工具`
- Module header description: `先选择公司里已经在用的 IT 工具。后续 AI 会从这些工具中获取信息。`

The existing base-skill chooser can stay technically the same, but its wording should read like company IT systems rather than generic setup.

### Module 2: Work Configuration

This module should combine:
- role selection
- use-case/work selection
- use-case content editing

Recommended visible text:
- Module header title: `配置要交给 AI 的工作`
- Module header description: `先选岗位，再补充这个岗位下要交给 AI 的具体工作内容和 SOP 要求。`

Recommended substructure:
1. role selector at the top
2. work/use-case list below the selected role
3. editor panel for the selected work

This preserves the current data model while making the flow easier to understand:
- choose a role
- see the relevant work items
- configure the work details

### Module 3: Installation

Keep the existing install-preview and sync behavior, but rewrite the wording.

Recommended visible text:
- Module header title: `安装到 AI 工具`
- Module header description: `选择要安装到的 AI 工具，确认 Skill 列表后开始安装。`

Generic wording such as `安装目标` should become `AI 工具`.

## Global Copy Rules

Apply these rewrites wherever they are user-visible:

- `Onboarding` -> `开始设置`
- `Skills 库` -> `Skill 库`
- `可用 Skills` -> `可用 Skill`
- `已安装的 Skills` -> `已安装 Skill`
- `浏览并安装 Skills 到你的目标应用程序。` -> rewrite into Chinese using singular `Skill`
- generic `Agent` wording -> `AI 工具`

Do not rename:
- product names
- tool names
- technical IDs shown inside install tables

## Implementation Boundaries

Expected implementation areas:
- `src/content/copy.ts`
- `src/App.tsx`
- `src/features/onboarding/OnboardingShell.tsx`
- `src/features/onboarding/OnboardingShell.test.tsx`
- any tests that assert the old English labels or old module copy

No data-model rewrite is required. This is primarily a copy and presentation restructuring pass.

## Testing

Required checks:
- the home masthead renders the new title and supporting body
- top navigation no longer shows `Onboarding`
- the setup home uses the new three-module names and order
- the first module no longer advertises role selection
- the second module contains role-first wording
- user-visible generic English is limited to `SOP`, `AI`, `Skill`, and `IT`
- existing onboarding interaction tests still pass after the copy rewrite

## Risks

- Changing copy without updating tests will break several existing assertions
- Moving role selection into the second module changes user expectations; the UI text must make that dependency explicit
- Replacing `Skills` with `Skill` can sound awkward if some sentences are translated too literally, so the surrounding Chinese needs to be rewritten rather than mechanically renamed

## Explicit Non-Goals

- Changing the underlying onboarding state model
- Renaming technical IDs or generated skill IDs
- Removing English from third-party product names
- Reworking the install-page table layout in this change
