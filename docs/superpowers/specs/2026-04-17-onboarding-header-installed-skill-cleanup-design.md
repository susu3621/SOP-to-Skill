# Onboarding Header And Installed Skill Cleanup Design

**Date:** 2026-04-17

## Goal

Fix the onboarding shell so the top-level controls are easier to understand, the onboarding home only shows truly installed local Skills, and users can reliably discover both the `新增用例` entry and the installed Skill deletion flow.

## Scope

This design covers feedback items `927`, `928`, `929`, `931`, `932`, and `933`.

In scope:

1. reduce visible top-header buttons by moving secondary actions into a `更多` menu
2. keep a clear, always-visible return path back to the onboarding home
3. add a persistent hint for the `新增用例` action inside the work-configuration sidebar
4. make the onboarding home installed-skill summary reflect only locally installed Skills
5. make installed Skill deletion easy to find and verify in the installed view

Out of scope:

1. skill import/export
2. Linux connection-test diagnostic expansion
3. new backend delete contracts beyond the existing uninstall command
4. changing onboarding persistence or install-preview semantics

## User-Facing Changes

### Header Simplification

The masthead should keep one primary onboarding button and one primary library button visible. Secondary actions move into a compact `更多` menu.

Visible actions:

1. contextual onboarding button
   - `开始设置` when the user is not already inside onboarding home
   - `返回首页` when the user is inside an onboarding sub-view
2. `Skill 库`
3. update action / current version block
4. `更多` menu

The `更多` menu should include:

1. `已安装 Skill`
2. `导出日志`
3. locale switching (`中文`, `English`)

### Stable Return-To-Home Flow

Users should be able to return to the onboarding home without scrolling back to the top of the current module.

Implementation decision:

1. keep the module-local `返回首页` button in the onboarding module header
2. also surface a contextual top-level `返回首页` action in the masthead when the onboarding shell is inside `basic`, `useCases`, or `install`

This gives users a global path back to home and preserves the local module context.

### Add-Use-Case Guidance

Inside the `选择工作` sidebar, add a persistent hint block near the `新增用例` button.

The hint should explain that new ideas can be recorded by clicking the button and creating a custom use case. This is a static guidance element, not a one-time tour or saved onboarding flag.

### Installed Skill Summary On Home

The onboarding home summary must stop rendering planned/generated install selections as if they were installed Skills.

Implementation decision:

1. derive the installed-skill summary exclusively from the real `installedSkills` prop
2. show only local installed records that exist in Tauri metadata
3. render a simple installed-skill list with readable app + version context
4. if there are no local installed Skills, show the existing empty state copy

The old generated production/test table is removed from the home summary because it represents install intent, not installed reality.

### Installed Skill Deletion

The app already has a working `uninstall_skill` command. This change does not introduce a new delete protocol.

Instead:

1. make the installed view easier to reach from the new `更多` menu
2. rename the visible action to `删除 Skill`
3. keep the existing uninstall command as the underlying behavior
4. refresh installed state after deletion, as the current hook already does

## Architecture

Frontend:

1. `src/App.tsx`
   - add masthead menu state
   - add contextual onboarding-home action
   - add installed-view entry to the menu
   - wire deletion copy / actions in the installed view
2. `src/features/onboarding/OnboardingShell.tsx`
   - report onboarding sub-view changes to the parent shell
   - accept a parent-triggered request to go back home
   - replace the home installed-skill summary with real installed data
   - add the persistent `新增用例` guidance block
3. `src/content/copy.ts`
   - add menu labels and installed deletion copy
4. `src/features/onboarding/copy.ts`
   - add use-case guidance copy
5. `src/styles.css`
   - style the masthead menu, the home-summary installed list, and the use-case hint block

Testing:

1. `src/App.test.tsx`
   - menu visibility
   - contextual return-home action
   - installed-skill delete action
2. `src/features/onboarding/OnboardingShell.test.tsx`
   - home summary reflects only installed local Skills
   - add-use-case hint renders in the work sidebar

## Testing Strategy

Add or update tests that prove:

1. the masthead collapses secondary actions into a `更多` menu
2. the menu exposes `已安装 Skill`, `导出日志`, and locale actions
3. the top-level onboarding action becomes `返回首页` when a sub-module is open
4. clicking the top-level `返回首页` action returns the onboarding shell to the home screen
5. the onboarding home summary does not show generated install candidates when there are no installed Skills
6. the home summary lists real installed Skills when installed metadata exists
7. the work sidebar shows a persistent hint for `新增用例`
8. the installed view exposes `删除 Skill` and calls the existing uninstall command
