# Onboarding First-Run Guides Design

## Goal

Add a first-run guide system to onboarding so new users clearly understand:
- first, where to start on the onboarding homepage
- second, what each main module is for
- third, what 2 to 3 key actions they need inside each module

The user-facing outcome is:
- the onboarding homepage automatically shows a 3-step guided explanation the first time the app is opened
- each onboarding module also shows its own first-run guide the first time that module is opened
- guides are marked complete only after the user finishes the final step
- closing a guide early does not count as completion
- once a guide is completed, it never shows automatically again

## Scope

This change covers:
- first-run guide behavior for the onboarding homepage
- first-run guide behavior for the `basic`, `useCases`, and `install` onboarding modules
- a shared guide framework instead of one-off logic per page
- persistent completion state for each guide
- guide overlay UI, highlight behavior, and step navigation
- frontend and backend contract changes needed to store completion state
- test coverage for the new first-run-guide behavior

This change does not cover:
- re-opening completed guides manually
- mobile or touch-specific onboarding behavior
- cross-page tours outside the onboarding area
- field-by-field guidance inside module forms
- auto-advancing guides based on user actions in the page

## Current State

The app already opens into the onboarding homepage by default, and the homepage already has three top-level cards:
- `选择公司 IT 工具`
- `配置要交给 AI 的工作`
- `安装到 AI 工具`

The homepage also already uses hover/focus bubbles to explain those cards, but that behavior is passive help, not a first-run guided flow.

Inside onboarding:
- `basic` contains base-skill selection, credential editors, and one save action
- `useCases` contains role and work tabs, plus role-scoped and work-scoped save actions
- `install` contains target-agent selection, install toggles, preview, and sync install

There is currently no persistent notion of:
- whether a user has completed a first-run explanation for a page
- whether a guide was closed before completion
- a shared overlay that can temporarily take over page explanation flow

## Approved Product Decisions

The approved behavior for this feature is:
- use the lightweight guided-bubble approach, not a heavyweight tour engine
- the homepage guide uses a serial `1 / 2 / 3` explanation flow
- the homepage guide is pure explanation; the user advances only with guide buttons
- each module also has its own guide
- module guides explain only key actions, not individual fields
- completion is recorded only after the final step
- closing early does not count as completion
- completed guides do not auto-show again
- there is no “show again” or “replay guide” entry in this scope

## Guide Model

### Shared Registry

Implement a shared guide registry for the onboarding area.

Each guide definition should have:
- `guideId`
- `scope`
- ordered `steps`

Each step should define:
- `anchorId`
- `title`
- `body`
- optional `placement`
- optional `beforeEnter` behavior for UI-only view adjustments

Recommended guide ids:
- `onboarding-home`
- `onboarding-basic`
- `onboarding-use-cases`
- `onboarding-install`

This keeps the system extensible without building a general app-wide tour engine.

### Shared Runtime Behavior

Only one guide step is visible at a time.

The shared guide runtime should manage:
- whether the current page has a pending first-run guide
- which step index is active
- whether the guide is currently visible
- whether the guide can advance or close

The runtime should expose only three user actions:
- `上一步`
- `下一步`
- `关闭`

The homepage guide does not need `上一步` on the first step.

## Persistent Completion State

### Storage Location

Persist guide completion state in global app config, not inside onboarding business state.

Reasoning:
- guide completion is a user-level desktop-app preference, not onboarding content
- it should survive onboarding edits, resets, or role changes
- it belongs with other user preferences such as `preferred_locale`

Recommended config shape:

```json
{
  "preferred_locale": "zh-CN",
  "update_check_interval_hours": 1,
  "onboarding_guides": {
    "onboarding-home": { "completed": true },
    "onboarding-basic": { "completed": false },
    "onboarding-use-cases": { "completed": false },
    "onboarding-install": { "completed": false }
  }
}
```

The runtime only needs `completed: boolean` per guide in this scope.

It should not persist:
- current step index
- dismissed state
- timestamps

### Completion Rules

Completion rules must be strict:
- opening a guide does not mark it complete
- viewing some steps does not mark it complete
- clicking `关闭` does not mark it complete
- only clicking `下一步` on the final step marks it complete

If a guide is closed early:
- it disappears for the current page visit
- it remains incomplete in persisted config
- it auto-shows again the next time that page is entered

The system should restart from step 1 when re-opened automatically after an incomplete close.

## Overlay And Highlight Interaction

### Shared Overlay Pattern

Use one reusable guided bubble component across homepage and modules.

When a guide is active:
- dim the rest of the onboarding page with a lightweight overlay
- visually highlight the current anchor target
- show a floating bubble near the target
- block pointer interaction with underlying page controls
- allow interaction only with guide controls inside the bubble

This enforces the approved “pure explanation” mode.

### Positioning

The bubble should anchor beside the highlighted target by default.

Placement rules:
- prefer the side requested by the step definition
- if the requested side would overflow the visible panel, flip to the opposite side
- keep the bubble inside the onboarding panel bounds
- keep the highlight visible without covering the entire target

### Scrolling

Some targets, especially module save buttons, may appear below the fold inside the onboarding scroll container.

When the step changes:
- auto-scroll the target into view
- wait until layout stabilizes
- then compute bubble placement

This avoids a guide step pointing to an off-screen control.

### Existing Hover Help Priority

The homepage already has hover/focus detail bubbles.

When the first-run guide is active:
- suppress the hover/focus detail bubble layer
- show only the first-run guide bubble

After the guide finishes or closes:
- restore the normal hover/focus behavior

## Guide Content Per Page

### Homepage Guide

The homepage guide contains exactly 3 serial explanation steps:

1. `选择公司 IT 工具`
   - explain that users should first choose company IT tools and enter credentials
2. `配置要交给 AI 的工作`
   - explain that users next choose role and describe the work plus SOP
3. `安装到 AI 工具`
   - explain that users finally choose the target AI tool and start sync install

This guide is explanatory only. It does not enter any module.

### Basic Module Guide

The `basic` module guide should explain 3 key actions:

1. select the company IT tools that are already in use
2. fill in the credentials shown for the selected tools
3. save the module settings after the information is ready

Recommended anchor targets:
- base-skill group selection area
- credentials section container
- `保存设置` button

### Use Cases Module Guide

The `useCases` module has tabbed UI, so the guide needs controlled presentation steps.

The guide should explain 3 key actions:

1. choose a role in the `选择岗位` tab and save the role if needed
2. switch to the `选择工作` tab and pick the work item to configure
3. fill in the work description / questions and save the work configuration

Recommended anchor targets:
- role tab panel
- work tab button or work list panel
- work editor container or work save button

For the guide only, step transitions may temporarily switch the active tab so the referenced target is visible. This tab switching is presentation-only and does not mutate persisted onboarding content by itself.

### Install Module Guide

The `install` module guide should explain 3 key actions:

1. choose the target AI tools
2. review which base skills and generated skills will be installed
3. start sync installation

Recommended anchor targets:
- agent selection area
- install selection table / preview area
- `开始同步安装` button

## Anchor Strategy

Use stable guide anchors in the onboarding React tree rather than brittle text queries.

Recommended approach:
- add stable guide-anchor ids or data attributes to page regions
- attach them to semantic containers, not tiny inner elements

Examples:
- homepage card wrappers
- basic module base-skill section
- credentials section
- role tab panel
- work tab button
- work editor section
- install agent selection section
- install skill selection table
- sync button row

Avoid binding guide steps to:
- dynamic text content
- one-off generated ids from repeated form fields
- specific user-provided use case names

This keeps the guide valid even when onboarding data is empty or customized.

## Frontend Design

### File Boundaries

Recommended frontend structure:
- keep page markup in `OnboardingShell.tsx` and step components
- add a small guide registry file for the declarative guide definitions
- add a small reusable guide-overlay component
- add a dedicated hook or focused helper for guide state orchestration

Expected frontend responsibilities:
- `src/types.ts`
  - add guide config and guide completion types
- `src/features/onboarding/copy.ts`
  - add guide titles, body copy, and button labels
- `src/features/onboarding/OnboardingShell.tsx`
  - mount the guide system, expose anchor targets, suppress hover bubble while guide is active
- `src/features/onboarding/steps/CredentialsStep.tsx`
  - expose stable guide anchors for credentials-related steps
- `src/features/onboarding/steps/AgentSelectionStep.tsx`
  - expose stable guide anchors for install target selection
- `src/features/onboarding/steps/InstallSelectionStep.tsx`
  - expose stable guide anchors for install review steps
- a new guide registry file
  - declare per-guide step lists and placements
- a new guide overlay file
  - render bubble, highlight, overlay, and navigation controls

### Local Orchestration

The guide runtime should stay local to onboarding UI state except for completion persistence.

The runtime should:
- check config-backed completion flags when a page becomes active
- start the guide automatically if the current page guide is incomplete
- close locally without persisting if the user exits early
- persist completion only after the final step

It should not be merged into the large onboarding business state object that currently stores role, credentials, and install selections.

## Backend Design

### Config Contract

Extend `AppConfig` to include onboarding guide completion state.

The config commands should:
- return guide completion state from `get_config`
- accept guide completion updates through `update_config`, or a dedicated config update path if that keeps the command cleaner
- preserve backward compatibility when older config files do not include the new field

Migration behavior:
- missing `onboarding_guides` defaults to all guides incomplete
- existing locale and update settings remain untouched

### Persistence Frequency

Persist guide completion only on successful final-step completion.

Do not persist on:
- guide open
- step change
- early close

This keeps writes infrequent and preserves the approved completion semantics.

## Accessibility

The guide should remain keyboard-usable:
- focus should move into the guide bubble when it opens
- guide controls should be reachable by keyboard
- `Esc` may close the guide if consistent with current app behavior
- highlighted content should still be visually obvious without relying only on color

The guide is desktop-only in scope, so no touch-specific behavior is required.

## Error Handling

Guide failures should fail soft.

If a target anchor is missing:
- do not crash onboarding
- skip the guide for that page in the current session or fall back to a centered bubble
- log the issue for debugging

If config persistence fails when marking completion:
- allow the current guide flow to end without crashing
- do not falsely treat the guide as completed unless the write succeeds
- auto-show the guide again on the next page entry because completion was not persisted

## Testing

Required coverage should lock these behaviors:

### App And Homepage

- first app open still lands on onboarding homepage
- incomplete homepage guide auto-opens on first visit
- homepage guide shows steps `1 / 2 / 3` in the approved order
- homepage hover/focus help is suppressed while the guide is active
- closing the homepage guide early does not mark it complete
- completing the homepage guide marks it complete and prevents future auto-show

### Basic Module

- first entry into `basic` auto-opens the `basic` guide if incomplete
- the guide points to tool selection, credentials, and save controls
- closing early keeps the guide incomplete
- finishing the final step marks the guide complete

### Use Cases Module

- first entry into `useCases` auto-opens the guide if incomplete
- the guide can present role and work guidance even though the module uses tabs
- guide-driven tab switching is presentation-only and does not save data by itself
- completing the guide prevents future auto-show

### Install Module

- first entry into `install` auto-opens the guide if incomplete
- the guide points to target selection, install review, and sync action
- early close keeps it incomplete
- completion prevents future auto-show

### Config Persistence

- old config files without `onboarding_guides` still load successfully
- completed guide flags persist through config save/load
- unrelated config fields are preserved when guide state is updated

## Non-Goals

- replay entry for completed guides
- resuming from the last viewed step after early close
- deep field-by-field form tours
- guidance outside onboarding
- analytics for guide completion

## Files Expected To Change

- `src/types.ts`
  - add first-run guide and config types
- `src/features/onboarding/copy.ts`
  - add guide-specific copy
- `src/features/onboarding/OnboardingShell.tsx`
  - mount guide runtime, wire homepage and module guides, suppress hover bubble while active
- `src/features/onboarding/steps/CredentialsStep.tsx`
  - add stable anchors for basic-module guide targets
- `src/features/onboarding/steps/AgentSelectionStep.tsx`
  - add stable anchors for install target selection
- `src/features/onboarding/steps/InstallSelectionStep.tsx`
  - add stable anchors for install review targets
- `src/hooks/useSkills.ts`
  - surface the new config state to the frontend if the existing config flow is reused
- `src-tauri/src/models/skill.rs`
  - extend `AppConfig`
- `src-tauri/src/commands/config.rs`
  - load, update, and persist guide completion state
- `src/App.test.tsx`
  - lock homepage first-run guide behavior if top-level app setup owns the first visit flow
- `src/features/onboarding/OnboardingShell.test.tsx`
  - cover homepage and module guide flows
- backend config tests
  - verify migration and persistence semantics for the new config field
