# Onboarding Early Infrastructure Credentials Design

## Goal

Move company infrastructure credential entry from the final install stage into the first onboarding module so users configure company systems before work configuration and installation.

The user-facing outcome is:
- users choose company IT tools and enter required credentials in the same module
- later onboarding steps can rely on those saved credentials already being available
- the install module focuses only on target AI apps, install scope, preview, and sync

## Current State

The current onboarding flow is visually ordered as:
1. 选择公司 IT 工具
2. 配置要交给 AI 的工作
3. 安装到 AI 工具

But the credential form is still rendered inside the install module. That causes two problems:
- users do not enter Jira, Confluence, or mail credentials until the last stage
- backend credential sync to `~/.env` only happens inside `sync_onboarding_installation`, so later steps cannot use those settings before installation

## Approved Direction

Keep the existing three-module home structure. Do not add a fourth module.

Reorganize module responsibilities like this:

### Module 1: 选择公司 IT 工具

This module becomes the company infrastructure setup step.

It contains:
- base skill / company IT tool selection
- credential fields for the currently selected tools
- one save action that persists both selections and credential values

The module description should make it clear that these credentials are saved early and used by later steps.

### Module 2: 配置要交给 AI 的工作

No structural change.

It still contains:
- role selection
- use case selection
- use case content editing

This module should be able to assume the selected infrastructure and credential values were already saved in module 1.

### Module 3: 安装到 AI 工具

Remove the credential editor from this module.

Keep:
- AI app selection
- generated install skill review
- preview
- sync / install execution

## State Model

Keep the existing onboarding state shape.

No new fields are required because:
- selected infrastructure already uses `selected_base_skill_ids`
- credential values already use `credential_values`

This change is about rendering location and save side effects, not data-model expansion.

## Save And Sync Timing

Saving the first module must do two things:
1. persist onboarding state as it does today
2. immediately sync currently selected infrastructure credentials into `~/.env`

This applies only to the selected base skills. Deselected tools must continue to have their credential values pruned from onboarding state and omitted from synced env entries.

The install command should keep syncing credentials as a final safeguard, but early sync becomes the primary path that makes credentials available before installation.

## Backend Behavior

Add a dedicated onboarding command for syncing saved infrastructure credentials to the home env file from the current onboarding state payload.

Expected behavior:
- validate all required credential fields for selected base skills
- write only managed onboarding credential keys
- preserve unrelated existing env keys
- update existing managed keys in place
- avoid writing deselected tool credentials

This command should be invoked by the frontend when saving the first onboarding module after the state save succeeds.

## Frontend Behavior

### Basic Module

Render the credential section below the base skill selection panel.

Behavior rules:
- show only fields for selected base skills
- bind to the same `credential_values` state already used in onboarding
- the module save button is enabled when either base skill selection or credential values differ from saved state

### Install Module

Remove the credentials card entirely.

Its dirty state should no longer depend on editing credentials inside that module. Credential changes are owned by the basic module once this change ships.

### Completion And Home Summary

Keep completion semantics stable:
- base module remains complete when at least one base skill is selected
- install module completion still depends on selected AI apps and install selections

No new home summary section is required in this change.

## Copy Changes

Update the first module description and credential copy so the wording reflects company infrastructure setup instead of late-stage install-only input.

The important copy behavior is:
- credentials are framed as part of company IT tool setup
- the install module no longer references credential entry

## Files In Scope

- `src/features/onboarding/OnboardingShell.tsx`
- `src/features/onboarding/useOnboarding.ts`
- `src/features/onboarding/copy.ts`
- `src/features/onboarding/steps/CredentialsStep.tsx`
- `src/features/onboarding/OnboardingShell.test.tsx`
- `src/content/workbuddy.test.ts`
- `src-tauri/src/commands/onboarding.rs`

## Testing

Required coverage:
- the basic module renders credential inputs for selected company IT tools
- the install module no longer renders the credential section
- editing a credential marks the basic module dirty, not the install module
- saving the basic module invokes backend credential sync after state save
- backend credential sync writes selected tool env keys and preserves unrelated env content

## Risks

- if dirty-state ownership is moved incorrectly, users may edit credentials without seeing the correct save affordance
- if early env sync runs before state save succeeds, frontend and env state can diverge
- if install-only assumptions remain in tests or copy, the UI will feel inconsistent

## Explicit Non-Goals

- adding new infrastructure systems such as Redmine or a generic Wiki
- changing generated skill IDs or install preview semantics
- redesigning the three-module onboarding home structure
