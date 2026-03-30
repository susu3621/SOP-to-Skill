# Onboarding Home Summary And Header Nav Design

**Date:** 2026-03-30

## Goal

Simplify the top-level app chrome by removing the visible `设置` button from the header, and make the onboarding home more informative by listing the user's already selected onboarding content directly below the `开始设置` entry area.

## Scope

This change is limited to the visible app header and the onboarding home screen.

In scope:

1. remove the header `设置` navigation button
2. add an `已设置内容` summary section to the onboarding home
3. render onboarding selections as readable text grouped by category

Out of scope:

1. removing the underlying `settings` view or Tauri tray navigation
2. changing onboarding save semantics or introducing inline editing on the home screen
3. changing the install flow, sync behavior, or backend state contracts

## User-Facing Changes

### Header Navigation

The visible header navigation should keep:

- `Onboarding`
- `Skills`
- `已安装`

The `设置` button should no longer appear in the app header.

The `settings` screen may still exist as an internal route so current tray or deep-link behavior does not break.

### Onboarding Home Summary

Below the existing top-level onboarding entry cards and their detail copy, add a dedicated `已设置内容` section that summarizes the current onboarding state.

The summary should show these groups:

1. `已选岗位`
2. `基础技能`
3. `已配置用例`
4. `安装目标`
5. `安装技能`

Each group should render human-readable names, not raw IDs where a display name exists.

If a group is empty, show `未设置`.

## Data Mapping

The summary should read from existing onboarding state already available in `OnboardingShell` through `useOnboarding`.

- `已选岗位`: `state.selected_role_id` mapped through role display name helpers
- `基础技能`: `state.selected_base_skill_ids` mapped to base skill names
- `已配置用例`: `state.role_use_case_contents` filtered by `completion.useCaseIds`
- `安装目标`: `state.selected_agent_ids` mapped to supported agent names
- `安装技能`: `state.selected_install_skill_ids`, using display names where possible

For generated install skills that do not have a friendlier name in shared config, the existing skill id string is acceptable.

## Presentation

The summary section should be read-only and visually lighter than the onboarding entry cards.

- use grouped text blocks or lightweight summary cards
- do not add action buttons inside the summary
- keep the home screen focused on navigation first and status second

## Architecture

The implementation should stay in the React frontend.

- update header navigation in `src/App.tsx`
- extend onboarding home rendering in `src/features/onboarding/OnboardingShell.tsx`
- reuse existing helper functions in `src/content/workbuddy.ts` for readable labels where available
- update styles in `src/styles.css`
- add test coverage in `src/App.test.tsx` and `src/features/onboarding/OnboardingShell.test.tsx`

## Testing Strategy

Add or update tests that prove:

1. the header no longer renders the `设置` button
2. the onboarding home still renders the three top-level entry cards
3. the onboarding home renders `已设置内容`
4. the summary lists the selected role, base skills, configured use cases, install targets, and install skills
5. empty summary groups show `未设置` when the underlying selection list is empty
