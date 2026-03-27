# Onboarding Dual Skill Sync Design

## Overview

Refactor the onboarding flow so the CLI configurator and the Mac app follow the same installation model:

- `scripts/test-onboarding.sh` generates both a production use-case skill package and a test-use-case skill package for each selected role/use-case combination
- the Mac app stops treating onboarding install as a generic single-skill wizard
- the Mac app instead manages one onboarding-derived skill set and synchronizes that set to every selected Agent

This change is scoped to onboarding-driven skills. The existing generic skill browser can remain available as a separate entry, but it is no longer the primary installation path for onboarding.

## Approved Product Decisions

- Production and test packages are separate sibling skills
- Production package naming stays unchanged: `<roleId>-<useCaseDirectory>`
- Test package naming adds a `test-` prefix: `test-<roleId>-<useCaseDirectory>`
- Install selection is shared across all selected Agents
- The default install selection includes:
  - all selected base skills
  - all production use-case packages for the selected role
  - all test use-case packages for the selected role
- Unchecking a base skill means delete it from the final install set and also remove it from the earlier base-skill selection state
- Onboarding should install all role-applicable use cases by default; it is no longer a single-use-case flow

## Goals

1. Keep CLI and Mac onboarding behavior aligned around one install model.
2. Make the generated test package explicit and independently installable/removable.
3. Let users review and adjust the final install set before sync.
4. Keep the install result understandable when multiple Agents are selected.

## Non-Goals

- Replacing the existing generic skill marketplace/listing UX
- Adding new Agent targets beyond the currently supported install backends
- Sharing the same storage directory between the CLI manager and the Mac app
- Converting the Mac app to call Node.js scripts at runtime

## Shared Domain Rules

### Skill Identity

Base skills keep their existing ids, for example:

- `jira`
- `confluence`
- `mail`

Generated role/use-case packages are always a pair:

- production: `<roleId>-<useCaseDirectory>`
- test: `test-<roleId>-<useCaseDirectory>`

Example:

- `project-manager-weekly-report`
- `test-project-manager-weekly-report`

### Generated Package Variants

Each role/use-case package pair is generated from the same onboarding inputs:

- selected Agent ids
- selected base skill ids
- selected role id
- use-case description
- use-case info sources
- use-case rules

The production variant is the normal generated package.

The test variant is a separate package whose content includes the current local/test-only safety guidance that today is injected by `localOnly: true`, such as:

- write outputs to `/tmp/skills-for-no-engineer`
- do not perform real sending
- print the final result instead of performing the final update action

The test package must be independently installable and removable without affecting the production package.

### Install Selection

The install selection is one global onboarding choice shared by all selected Agents.

The candidate install set is:

- all selected base skills
- all generated production packages for the selected role
- all generated test packages for the selected role

The default selected install set equals the full candidate set.

If a base skill is unchecked in the install step:

- remove it from the selected install set
- remove it from the selected base-skill state
- remove any now-invalid credential fields derived from that base skill

If a generated package is unchecked in the install step:

- remove it only from the selected install set
- do not remove the underlying use case or role selection

When the selected role changes:

- rebuild the generated production/test package candidates
- discard any previously selected generated package ids that no longer apply to the new role
- keep any still-valid base-skill selections

## CLI Design

### `scripts/test-onboarding.sh`

The shell entrypoint remains a thin wrapper around `test-onboarding.cjs`.

The behavior change happens in the onboarding manager and skill generator:

- use-case package generation must produce both production and test artifacts in one pass
- the manager must treat both generated package ids as desired install candidates
- syncing a selected role/use-case should copy both generated directories when both remain selected

### CLI Store Shape

The onboarding store should continue to separate concerns, but installation state needs two additional concepts:

- `selectedAgentIds`
- `selectedInstallSkillIds`

The logical state becomes:

- selected Agent ids
- selected role id
- selected base skill ids
- selected install skill ids
- role-scoped use-case editable content
- actual installed skill ids per Agent

The store remains the source of truth for CLI behavior such as:

- default install selection
- role-scoped package discovery
- add/remove sync planning
- base-skill deselection side effects

## Mac App Design

### Page Organization

The Mac onboarding flow should be split into dedicated onboarding pages instead of leaving the entire experience inside the current monolithic `App.tsx` view logic.

Recommended onboarding page sequence:

1. Agent selection
2. Role and base-skill selection
3. Role-scoped use-case content editing
4. Install selection and sync preview
5. Credentials
6. Completion

This is intentionally different from the current demo-like 8-page sequence:

- role and base-skill selection belong together because they jointly determine the install candidates
- use-case editing is no longer a single-choice step; it edits all applicable preset use cases for the chosen role
- install selection becomes the explicit review/sync step before credentials and final execution

### Onboarding Shell

Introduce an onboarding shell component responsible for:

- loading onboarding state
- step navigation
- summary display
- calling onboarding-specific backend commands
- rendering dedicated step components

Each step component should own only its local presentation and field interactions, not the install derivation rules.

### Install Selection Screen

The install screen is the key product change.

It should render one shared install set for all selected Agents, grouped into:

- selected Agents
- base skills
- generated role/use-case packages

Generated role/use-case packages should be displayed by use case, with two independently selectable items beneath each use case:

- production package
- test package

Default state:

- both boxes checked for every applicable use case

The screen should also show a sync preview for each selected Agent:

- skills to add
- skills to remove
- unchanged skills

The screen is allowed to update shared onboarding state immediately when the user toggles options, because unchecking a base skill has approved downstream effects on the rest of the flow.

This screen previews the sync result. The actual sync execution still happens only after the user completes the credentials step and confirms the onboarding flow.

### Generic Skill Browser

The current generic skill list/detail/install wizard can remain for non-onboarding browsing, but onboarding should not depend on it.

Onboarding install must not reuse the current single-skill wizard as its primary mechanism, because the user is managing a derived set, not a single template.

## Tauri Backend Design

### Why Not Reuse Node.js At Runtime

The Mac app should not shell out to the Node.js CLI manager:

- desktop packaging should not depend on a user-installed Node runtime
- the current CLI manager is interactive and shaped for terminal prompts, not app API calls
- batch sync, partial failure reporting, and state persistence are cleaner inside Tauri commands

### New Onboarding Command Surface

Add onboarding-specific commands in Rust for the app flow, covering:

- load current onboarding state
- save onboarding state changes
- compute candidate install items and default selections
- compute sync previews for selected Agents
- generate production/test role-use-case packages into app-managed staging directories
- synchronize the selected install set to all selected Agents

The Mac app should treat these commands as the source of truth for install candidates and sync results instead of reimplementing the derivation logic in React.

### Generated Package Staging

The Mac app backend should generate onboarding packages into an app-managed staging directory under the Tauri data root, separate from the repository `skills/` directory.

That staging area should contain:

- one directory per generated production package
- one directory per generated test package

The generated package content should follow the same semantic rules as the CLI-generated package content, even though the Rust implementation is separate from the CommonJS implementation.

### Supported Targets

The onboarding sync flow should support the same Agent targets currently handled by the CLI manager:

- `codex`
- `claude-code`
- `workbuddy`

If shared config includes Agent entries beyond that set, those unsupported targets should not appear as selectable sync targets in the Mac app until backend support is added.

## Synchronization Semantics

For each selected Agent:

1. Load the Agent's currently installed onboarding-managed skill ids.
2. Compare them to the selected install skill ids.
3. Build an add/remove plan.
4. Remove deselected packages.
5. Install selected packages that are missing or require regeneration.
6. Persist the Agent's resulting installed skill ids.

Force-reinstall behavior may remain CLI-only unless explicitly needed in the Mac flow.

For the selected Agents, onboarding becomes the authoritative manager for the onboarding-derived install set:

- selected base-skill ids
- selected generated production package ids
- selected generated test package ids

If a selected Agent currently has one of those skill ids installed and the user deselects it from onboarding, onboarding sync removes it even if it was originally installed through the generic skill browser.

The sync operation should return per-Agent results so the completion step can show:

- added skills
- removed skills
- unchanged skills
- failures

Partial failure should be visible instead of collapsing everything into a single generic error.

## Error Handling

### Missing Mappings

If a role/use-case package cannot be generated because a use case is missing its directory mapping, generation must fail with an explicit error naming the offending use case.

### Unsupported Agent Targets

If state contains an Agent id that the current backend cannot install, the backend should reject that target clearly rather than silently ignoring it.

### Partial Sync Failures

If one Agent fails to sync:

- other selected Agents should still attempt sync
- the completion screen should show which Agent failed and why
- successful Agent results should not be discarded

### Credential Pruning

When a base skill is removed from the selected install set, any credential answers that belong exclusively to that base skill must be removed before the credentials step renders.

## Testing Strategy

### CLI Tests

Expand the current Node/Vitest coverage to prove:

- a role/use-case generation call returns both production and test package ids
- the test package name uses the `test-` prefix
- the test package content includes the local/test-only safety guidance
- default install selection includes both generated variants
- deselecting a base skill updates both the selected base skills and the selected install set
- sync planning includes add/remove behavior for both generated variants

### Rust Tests

Add Rust unit tests for:

- production/test generated package id calculation
- onboarding sync plan calculation
- generated package staging behavior
- multi-Agent sync result reporting
- error reporting for unsupported targets or missing use-case directory mappings

### React Tests

Update frontend tests so the onboarding flow verifies:

- role/base-skill grouping behavior
- role-scoped use-case editing
- install selection defaults both generated variants to checked
- unchecking a base skill removes it from later credential requirements
- completion displays per-Agent sync outcomes

## Implementation Notes

- Keep the existing generic skill browser operational, but decouple onboarding from it.
- Prefer small focused onboarding components over one large view file.
- Keep derivation rules centralized in backend/store logic rather than scattered in UI components.
- Match CLI and Mac semantics, not necessarily line-for-line implementation.

## Open Constraints To Respect During Implementation

- Do not overwrite unrelated user changes already present in the repository.
- Keep the current target-installation primitives intact where possible and layer onboarding sync on top of them.
- Treat the new test package as a first-class sibling package, not as a hidden flag on the production package.
