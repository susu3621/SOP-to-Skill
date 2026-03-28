# Onboarding Menu Structure Design

**Date:** 2026-03-27

## Goal

Restructure the onboarding page from a single flowing screen into a menu-based desktop entry page that matches the mental model of `./scripts/test-onboarding.sh`.

The first onboarding screen should expose exactly three top-level entries:

1. `基础信息设置`
2. `用例配置`
3. `安装技能`

Each entry then opens its own focused sub-screen instead of stacking all sections on one page.

## User-Facing Structure

### Home

The onboarding home becomes a desktop-oriented horizontal three-card entry screen.

- The three cards are arranged horizontally on desktop.
- Each card contains only:
  - step number
  - title
  - one short summary line
- Detailed notes do not live inside the cards.
- A shared detail panel below the cards updates on hover/focus to describe the currently highlighted entry.
- Clicking a card opens the selected module.

### Basic Info

This screen contains exactly two entry actions:

1. `选择岗位`
2. `选择基础技能`

This screen is responsible only for role and base-skill selection. It should not include use-case editing or installation execution.

### Use Cases

This screen lists the role-scoped use case entries for configuration:

1. `记录计划 (item-8bb0-5f55-8ba1-5212)`
2. `记录日志 (item-8bb0-5f55-65e5-5fd7)`
3. `项目周报 (item-9879-76ee-5468-62a5)`

Selecting a use case opens its editor. The current editor content remains the existing editable fields for description, info sources, and rules.

### Install

This screen is responsible for installation flow only:

1. choose installation targets
2. review managed install set
3. execute installation

Credential editing remains available where the current flow requires it, but it should no longer dominate the onboarding home screen.

## Architecture

The current `OnboardingShell` is split conceptually into:

- a top-level onboarding navigator
- a home menu view
- one view per top-level module

The existing state and mutation logic in `useOnboarding` should stay centralized. The restructure is a view/navigation change, not a data-model rewrite.

## Navigation Model

The onboarding experience needs local navigation state independent from the app-wide `view`.

Recommended local state:

- top-level section: `home | basic | useCases | install`
- basic sub-section: `role | baseSkills`
- selected use case id for the use-case editor

This keeps the app shell stable while allowing the onboarding module to behave like a nested configurator.

## Interaction Rules

- Hovering or focusing a home entry updates the detail panel.
- Clicking a home entry navigates into that module.
- Each module provides a visible way back to the onboarding home.
- Use-case configuration is blocked until a role is selected, matching the CLI logic.
- Install execution is blocked until the required selections exist, matching the existing behavior.

## Error Handling

- If no role is selected, the use-case screen shows the existing blocked-state guidance instead of empty editors.
- If no install target is selected, the install screen keeps the current warning/disabled behavior.
- Preview and sync errors remain rendered in the install module, not on the onboarding home.

## Testing Strategy

Add tests that prove:

1. the onboarding home shows exactly the three top-level entries
2. hovering/focusing entries updates the shared detail panel
3. entering `基础信息设置` shows only role and base-skill actions
4. entering `用例配置` shows role-scoped use-case entries instead of the full editor stack
5. entering `安装技能` shows install-target and install-selection behavior
6. the old long scrolling onboarding layout is no longer the default home presentation

## Implementation Notes

- Preserve existing onboarding state shape where possible.
- Prefer adding focused view components rather than making `OnboardingShell.tsx` larger.
- Reuse existing step components for the inner screens instead of duplicating logic.
