# SOP To Skill Rename And Custom Use Cases Design

**Date:** 2026-04-06

## Goal

Rename the visible product from the earlier `Skill for non-engineer` / `Skill Configurator` positioning to `SOP to Skill`, and let users create and delete custom use cases that flow through the same save, preview, package-generation, and installation path as built-in use cases.

## Scope

This change applies to the current desktop app shell and onboarding flow.

In scope:

1. visible app naming such as header title, desktop window title, HTML title, and user-facing descriptive copy
2. onboarding use case creation for custom scenarios
3. onboarding use case deletion for custom scenarios
4. install preview and generated skill selection for both built-in and custom use cases

Out of scope:

1. renaming the git repository, local workspace folder, npm package name, or GitHub release URL
2. changing the internal updater feed path or adding a data migration for app storage paths
3. redesigning the entire onboarding information architecture
4. adding custom guidance prompts beyond the fields that already exist in the editor

## Naming Direction

### Product Name

The visible product name becomes `SOP to Skill`.

This should replace user-facing references to `Skill Configurator` and the earlier non-engineer framing in the desktop app shell. The UI should read like a practical tool that turns operating procedures into installable skills.

### Supporting Copy

The main explanatory copy should make the conversion goal explicit without using compiler jargon as the primary label.

- primary title: `SOP to Skill`
- supporting line: explain that the app turns team SOPs into reusable AI skills
- onboarding and install descriptions should prefer `SOP`, `流程`, `技能`, `安装` wording over generic `配置器` wording

### Internal Identifiers

Internal identifiers remain stable in this round.

- keep `package.json` package name unchanged
- keep the Tauri `identifier` unchanged
- keep existing updater URLs and app-data root behavior unchanged

This avoids breaking release continuity or forcing a migration that the user did not ask for.

## Custom Use Case Model

### Unified Record Model

Built-in and custom use cases should share the same onboarding record structure and the same downstream install pipeline.

The source of truth for editable and installable use cases should be the current `role_use_case_contents` list, not a second parallel custom list.

### Custom Identifier Rule

Each custom use case gets a generated stable identifier with a `custom-` prefix.

- user input: use case name only
- generated id format: `custom-<normalized-slug>`
- if the slug already exists, append a numeric suffix such as `custom-weekly-risk-review-2`
- the generated id is created once and remains stable after creation

The generated id doubles as the downstream use case directory key so package naming and installation stay deterministic.

### Built-In Versus Custom Behavior

- built-in use cases continue to use their existing ids and prompts from shared config
- custom use cases do not receive built-in prompt text
- custom use cases are the only use cases that can be deleted

The existing project-manager-only role exposure remains unchanged. No separate multi-role custom-use-case persistence is introduced in this round.

## Interaction Design

### Add Use Case Entry Point

In the `用例配置` module, add a lightweight creation control near the use case list instead of creating a separate flow.

- show an input for `用例名称`
- show a primary action such as `新增用例`
- show a short hint that the system will generate a `custom-` identifier automatically

After successful creation:

- append the new custom use case to the current use case list
- auto-select it in the sidebar
- open it in the existing editor panel
- initialize `description`, `info_sources`, and `rules` as empty strings

### Edit Experience

Once created, the custom use case uses the same editor surface as built-in use cases.

- description stays editable
- SOP / rules field stays editable
- save behavior remains per-use-case

No new editor fields are introduced in this round. The current page should remain a single-use-case editor with a sidebar list rather than a bulk-edit form.

### Delete Experience

Custom use cases can be deleted from the active editor panel.

- the delete action appears only when the active use case id starts with `custom-`
- deletion requires an explicit confirmation step
- after deletion, the app should select the next available use case, or the previous one if the deleted item was last

Deleting a custom use case must also remove its generated install skill ids from the managed install selection state, including both selected and candidate install id lists, so the install page does not keep stale entries.

## Install And Generation Flow

### Candidate Resolution

Install candidate skills should be derived from the current onboarding use case records for the current role, not only from static shared config use cases.

For each use case record:

1. use `use_case_id` as the directory key
2. generate production skill id as `<role_id>-<use_case_id>`
3. generate test skill id as `test-<role_id>-<use_case_id>`

This applies equally to built-in and custom use cases.

### Preview And Sync

The install preview should reflect the current combined use case list.

- newly added custom use cases appear in generated install candidates immediately
- deleted custom use cases disappear from generated install candidates
- explicit user deselection behavior should continue to work when candidate sets change

### Package Staging

Generated packages for custom use cases should use the same staging command path as built-in use cases.

Because custom ids already use a normalized `custom-...` directory key, the generator can stage packages without needing a second custom-directory mapping layer.

## Testing Strategy

Update or add tests that prove:

1. visible app naming now shows `SOP to Skill`
2. creating a custom use case adds a new sidebar item and selects it
3. custom use cases generate managed install skill ids with the `custom-` prefix preserved
4. deleting a custom use case removes it from the sidebar and from install candidates
5. built-in use cases still keep their existing prompt-backed editing behavior

## Architecture Notes

The implementation should stay focused in the current React onboarding flow plus the existing Tauri onboarding preview contracts.

- update user-facing copy in the React layer and packaging metadata
- keep one use case record model in TypeScript and Rust contracts
- move install candidate derivation to the actual current onboarding use case records
- preserve existing save and sync entry points instead of introducing new commands
