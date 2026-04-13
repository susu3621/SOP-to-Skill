# Onboarding Gerrit Code Management Support Design

## Goal

Add Gerrit as a first-class onboarding base service and installable skill.

The user-facing outcome is:
- onboarding shows Gerrit under a new `代码管理` base-service group
- Gerrit supports both `HTTP` and `SSH` connection modes inside one service card
- non-technical users can use a recommended HTTP login path without needing to understand SSH
- the built-in skill library lists Gerrit and shows its category as `代码管理`

## Scope

This change covers:
- onboarding base-service metadata for Gerrit
- Gerrit credential entry, completion rules, and connection testing
- Gerrit packaged skill metadata in `skills/manifest.json`
- skill library category metadata and display
- Gerrit script and test scaffolding required by the onboarding connection-test flow

This change does not cover:
- generating new Gerrit use-case skills
- installing SSH keys or managing local SSH agents for the user
- adding a generic dynamic form engine for all future conditional fields
- changing existing Confluence, Jira, or Mail authentication behavior

## Current State

The current onboarding base services are:
- Confluence
- Jira
- Mail

Base-service selection is explicitly defined in `src/shared/config.json` and grouped in `src/content/workbuddy.ts`.

Connection testing already exists for current services through:
- frontend grouped credential cards
- a backend service registry in `src-tauri/src/commands/onboarding.rs`
- per-service `scripts/test_connection.py`

The skill manifest currently tracks:
- `id`
- `path`
- `version`
- `targets`
- `contentHash`

There is no skill category metadata yet, so the library cannot label Gerrit as `代码管理`.

## Approved Product Decisions

The approved behavior for this feature is:
- add one Gerrit service, not separate `gerrit-http` and `gerrit-ssh` services
- make `HTTP` the recommended default path for non-technical users
- keep `SSH` available as an advanced option in the same card
- expose Gerrit in the onboarding base-service picker and in the install selection
- add Gerrit to the repository skill manifest
- show Gerrit in the skill library as category `代码管理`

## User Experience Design

### Base-Service Grouping

Add a new onboarding base-service group:
- group id: `code-management`
- group label: `代码管理` / `Code Management`
- included skill ids: `gerrit`

Existing groups remain unchanged:
- `Wiki 系统`
- `问题管理系统`
- `通信系统`

### Gerrit Credential Card

Gerrit appears as one service card with:
- service name
- short description
- connection-mode selector
- only the fields relevant to the selected mode
- one `测试连接` button
- inline result summary and details, matching current onboarding service cards

### Connection-Mode Wording

To avoid forcing SSH terminology onto non-technical users, the visible wording should be:
- `网页/API 登录（推荐）` for HTTP
- `SSH 命令行（高级）` for SSH

Stored values can remain simple machine-friendly ids such as:
- `http`
- `ssh`

### Conditional Fields

When mode is `http`, show:
- Gerrit URL
- Gerrit 用户名
- Gerrit 密码 / HTTP 密码

When mode is `ssh`, show:
- Gerrit SSH 主机
- Gerrit SSH 端口
- Gerrit SSH 用户名

The UI should not show both sets at once. This keeps the card readable and prevents users from guessing which fields matter.

## Frontend Design

### Config And Metadata

`src/shared/config.json` should define Gerrit under `baseSkills` with:
- localized name and description
- a `gerritAuthMode` field using `single-select`
- HTTP fields
- SSH fields

`src/content/workbuddy.ts` should:
- expose Gerrit as a base skill option
- place it inside the new `code-management` group
- provide a way to filter visible credential fields by the selected Gerrit mode
- provide mode-aware required field ids for completion checks and connection testing

### Form Rendering

`src/features/onboarding/steps/CredentialsStep.tsx` currently renders only text/password inputs.

This change should add `single-select` rendering for credential fields so Gerrit can switch modes in the current onboarding card without introducing a separate UI flow.

The same component should use filtered field lists supplied by the content layer or onboarding hook so hidden Gerrit fields are not rendered.

### Completion Rules

Current service completion assumes one static required-field list per service.

Gerrit needs mode-aware completion:
- `http` mode is complete only when HTTP-required fields are populated
- `ssh` mode is complete only when SSH-required fields are populated

This logic should be implemented in the existing onboarding hook path rather than as a large generic rules engine.

### Automatic Testing

Automatic testing should keep the current behavior:
- trigger after required fields become complete
- use per-service debounced checks
- ignore stale responses

For Gerrit, the fingerprint must include:
- selected auth mode
- only the fields relevant to that mode

Switching mode should invalidate the prior fingerprint and reset Gerrit to an untested state until the new mode is complete.

## Backend Design

### Shared Service Registry

Extend the onboarding connection-service registry in `src-tauri/src/commands/onboarding.rs` to include `gerrit`.

The Gerrit entry should define:
- service id: `gerrit`
- required field ids resolver based on `gerritAuthMode`
- env mapping for HTTP mode
- env mapping for SSH mode
- probe script path: `skills/gerrit/scripts/test_connection.py`

### Environment Contract

The backend should write a temporary env file for the Gerrit probe script using:

Common:
- `GERRIT_AUTH_MODE`

HTTP mode:
- `GERRIT_URL`
- `GERRIT_USERNAME`
- `GERRIT_PASSWORD`

SSH mode:
- `GERRIT_SSH_HOST`
- `GERRIT_SSH_PORT`
- `GERRIT_SSH_USERNAME`

This stays consistent with the current onboarding probe model and avoids mutating global process env.

### Probe Script Behavior

Add `skills/gerrit/scripts/test_connection.py` with the same normalized JSON contract used by current services:
- `service_id`
- `success`
- `status`
- `summary`
- `details`

Recommended probes:
- HTTP mode: call Gerrit REST endpoint `/a/accounts/self/detail` with basic auth
- SSH mode: run `ssh -p <port> <user>@<host> gerrit version`

SSH mode should assume the user already has a usable local SSH key or agent. The script should fail clearly if SSH authentication is unavailable and should not attempt to manage keys.

### Error Handling

Expected Gerrit-specific errors include:
- missing mode
- missing HTTP credentials
- missing SSH host, port, or username
- invalid Gerrit URL
- HTTP authentication failure
- local `ssh` executable missing
- SSH auth failure or host resolution failure

Failure summaries should stay short and user-readable. Detailed diagnostics can remain in `details`.

## Skill Manifest And Library Design

### Manifest Schema

Extend repository-managed manifest entries with an optional category field:
- `category`

Add Gerrit manifest entry with:
- `id: gerrit`
- `path: skills/gerrit`
- `version`
- `targets`
- `contentHash`
- `category: code-management`

Existing manifest entries can either omit category or receive explicit categories later. This change only requires adding category support without forcing a full backfill.

### Frontend Skill Types

Expose the category metadata from backend skill info to frontend types so the library can display it in:
- skill list cards
- skill detail page

Localized labels should include:
- `代码管理` / `Code Management`

## Files And Boundaries

Expected frontend file changes:
- `src/shared/config.json`
- `src/content/workbuddy.ts`
- `src/types.ts`
- `src/App.tsx`
- `src/content/copy.ts`
- `src/features/onboarding/steps/CredentialsStep.tsx`
- `src/features/onboarding/useOnboarding.ts`
- `src/content/workbuddy.test.ts`
- `src/features/onboarding/OnboardingShell.test.tsx`
- `src/App.test.tsx`

Expected backend file changes:
- `src-tauri/src/models/skill.rs`
- `src-tauri/src/template/loader.rs`
- `src-tauri/src/commands/skill.rs`
- `src-tauri/src/commands/onboarding.rs`

Expected skill package changes:
- `skills/gerrit/SKILL.md`
- `skills/gerrit/scripts/test_connection.py`
- `skills/gerrit/tests/test_gerrit_connection.py`
- `skills/manifest.json`

Expected tooling test changes:
- `scripts/lib/skill-manifest.cjs`
- `scripts/skill-manifest.test.ts`

## Testing

Required coverage:
- content-layer tests for the new Gerrit base skill and `代码管理` group
- onboarding UI tests for Gerrit mode switching and visible credential fields
- onboarding UI tests for Gerrit automatic and manual connection-test calls
- Rust tests for Gerrit env generation and script path resolution
- Python tests for Gerrit HTTP and SSH probe behavior
- skill manifest tests for the new `category` field and Gerrit entry
- app-level tests for skill library category display

## Risks And Mitigations

### Risk: Conditional credentials leak into generic onboarding assumptions

Mitigation:
- keep Gerrit-specific filtering logic narrow and explicit
- do not generalize beyond what current Gerrit support needs

### Risk: SSH setup is opaque for non-technical users

Mitigation:
- default to HTTP
- label SSH as advanced
- return actionable failure text that suggests switching to HTTP if appropriate

### Risk: Library category rollout breaks existing skills

Mitigation:
- make manifest category optional
- default missing categories to no badge instead of erroring

## Implementation Direction

Implement the approved option:
- one Gerrit service
- HTTP as recommended default
- SSH as advanced alternative
- manifest category support
- no extra user approval gates after docs are written
