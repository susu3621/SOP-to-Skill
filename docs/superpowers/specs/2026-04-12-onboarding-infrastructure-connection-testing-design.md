# Onboarding Infrastructure Connection Testing Design

## Goal

Add connection testing for all current infrastructure services in onboarding: Confluence, Jira, and Mail.

The user-facing outcome is:
- every selected infrastructure service shows its own credential inputs and its own `测试连接` action
- the app automatically tests a service after its required fields become complete
- failed tests do not block saving onboarding settings
- all service-side probe scripts use the same filename: `scripts/test_connection.py`

## Scope

This change covers:
- onboarding credential UI for Confluence, Jira, and Mail
- frontend state for per-service connection test status
- a single backend Tauri command for running connection tests
- unified script naming for all current infrastructure probe scripts
- test and doc updates that reference the old probe script names

This change does not cover:
- adding new infrastructure services
- replacing Python probe scripts with native Rust implementations
- blocking save or install on connection-test failures

## Current State

The onboarding basic module already renders credential inputs for selected base skills, but it has no connection-test controls or test status.

Probe scripts already exist, but naming is inconsistent:
- `skills/confluence/scripts/test_confluence_login.py`
- `skills/jira/scripts/test_jira_login.py`
- `skills/mail/scripts/test_mail_login.py`

The desktop app currently syncs saved credentials into `~/.env`, but it does not execute the probe scripts from the onboarding UI.

## Approved Product Decisions

The approved behavior for this feature is:
- cover all current base services: Confluence, Jira, and Mail
- rename each service probe script to `scripts/test_connection.py`
- add one manual `测试连接` button per service
- trigger automatic testing when a service has all required fields populated
- allow `保存设置` even if the latest test failed or has never run

## Script Naming And Ownership

Each current infrastructure skill keeps its own script directory and implementation details, but the probe filename becomes uniform:

- `skills/confluence/scripts/test_connection.py`
- `skills/jira/scripts/test_connection.py`
- `skills/mail/scripts/test_connection.py`

The script bodies stay service-specific. Only the filename and app-facing invocation contract become uniform.

All internal references in tests, READMEs, quick references, installation guides, and skill docs should move to `test_connection.py` so the repository has one canonical name per service.

## Backend Design

### Unified Connection-Test Command

Add one Tauri command instead of one command per service.

Proposed command shape:
- command name: `test_onboarding_connection`
- input:
  - `service_id`
  - `credential_values`
  - `trigger`
- output:
  - normalized status object with success flag, summary message, details, trigger, and tested field fingerprint

The backend uses `service_id` to look up:
- the skill directory under `get_skills_dir()`
- the required onboarding credential field ids for that service
- the env variables that must be written for the probe
- the script path `scripts/test_connection.py`

### Shared Service Registry

Introduce one backend registry for current infrastructure services so test execution and env-sync logic share the same mapping rules.

Each registry entry should define:
- service id: `confluence`, `jira`, `mail`
- required onboarding field ids
- env key mapping
- extra derived env entries where needed
- probe script relative path

Mail requires derived env defaults from existing onboarding behavior:
- `MAIL_HOST=smtp.exmail.qq.com`
- `MAIL_PORT=465`
- `MAIL_FROM=<mailUsername>`
- `MAIL_USE_SSL=true`
- `MAIL_USE_STARTTLS=false`

This avoids duplicating credential-to-env translation in multiple backend functions.

### Test Execution Path

The backend should test the current unsaved form values without mutating global process env and without writing to the real home env file.

Recommended flow:
1. validate required fields for the selected service
2. build temporary env content from the provided credential values
3. write a temporary env file
4. execute the service probe script with `--env-file <temp-file>`
5. capture exit code, stdout, and stderr
6. convert the result into a normalized response
7. remove the temporary env file

### Python Command Resolution

The app should try a small cross-platform interpreter fallback chain:
- Windows: `py -3`, then `python`
- macOS/Linux: `python3`, then `python`

If no interpreter works, return a clear error that the local Python runtime required for bundled skill scripts is unavailable.

### Result Normalization

The frontend should not parse raw probe output. The backend should return a stable structure such as:
- `service_id`
- `success`
- `status`
- `summary`
- `details`
- `trigger`
- `tested_fingerprint`

`details` can include trimmed stdout/stderr for diagnostics, but the UI should mainly rely on `summary`.

## Frontend Design

### Credential Layout

Replace the flat credential list with service-grouped cards inside the basic module.

Each selected service card shows:
- service name
- service description or short helper copy
- only that service's credential fields
- current test status
- last test summary
- manual `测试连接` button

If no credential-requiring service is selected, the existing empty-state copy remains.

### Per-Service Test State

Track connection-test state per service in onboarding state local UI memory, not in persisted onboarding JSON.

Each service needs:
- `status`: `idle | pending | success | error`
- `summary`
- `details`
- `last_trigger`: `manual | automatic | null`
- `tested_fingerprint`
- `request_id`

This state is transient UI feedback, not business configuration.

### Automatic Test Trigger

Automatic testing should run when:
- the service is selected
- all required fields for that service are non-empty
- the current field fingerprint differs from the last tested fingerprint
- no newer request has superseded the pending one

To avoid firing on every keystroke, use a short debounce per service after edits settle.

Recommended debounce:
- about 600 to 800 ms after the latest relevant field change

If a required field becomes empty again:
- clear any success state tied to old values
- return the service to `idle`
- do not auto-test until the service is complete again

### Manual Test Trigger

Each service card exposes its own `测试连接` button.

Manual tests:
- are allowed whenever required fields are complete
- use the same backend command as auto tests
- overwrite the visible status with the newest result
- can rerun even if the fingerprint matches the last automatic test

### Save Behavior

Saving the basic module continues to:
- persist onboarding state
- sync selected credentials to `~/.env`

Saving does not depend on connection-test state.

Examples of allowed save cases:
- never tested
- automatic test still pending
- latest test failed
- latest test succeeded

## Concurrency And Stale Results

The frontend must ignore stale async results.

If the user edits fields while a test is in flight:
- issue a new request id for the next test
- only apply the response if it matches the latest request id for that service

This prevents an older success or error from overwriting a newer input state.

## Types And File Boundaries

Expected frontend file changes:
- `src/types.ts`
  - add connection-test types
- `src/content/workbuddy.ts`
  - expose grouped credential metadata by service
- `src/features/onboarding/useOnboarding.ts`
  - manage per-service test state and auto-test orchestration
- `src/features/onboarding/steps/CredentialsStep.tsx`
  - render service cards, status, and per-service buttons
- `src/features/onboarding/OnboardingShell.tsx`
  - pass test handlers and state into the credentials step
- `src/features/onboarding/copy.ts`
  - add connection-test copy

Expected backend file changes:
- `src-tauri/src/commands/onboarding.rs`
  - add unified connection-test command
  - add shared service registry and temp env execution helpers
- `src-tauri/src/lib.rs`
  - register the new command

Expected skill file changes:
- rename each current probe script to `scripts/test_connection.py`
- update tests and docs that still reference old filenames

## Error Handling

User-visible failure cases should map to clear summaries:
- missing required fields
- probe script not found
- Python runtime unavailable
- process launch failed
- connection/authentication failed inside the script

The UI should show:
- a short failure summary inline on the service card
- optional expanded detail text only if already supported by the current visual style

The UI should not show raw stack traces unless that is the only available backend message.

## Testing

Required coverage:

Frontend:
- selected services render as separate credential cards
- each card has its own `测试连接` button
- manual test calls the unified backend command with the right service id
- auto test starts only after required fields become complete
- stale async test responses do not overwrite newer state
- save remains enabled after a failed test

Backend:
- service registry maps each service to the correct required fields and env entries
- connection-test command rejects incomplete credentials
- connection-test command resolves the correct script path
- connection-test command normalizes success and failure output
- temp env execution does not mutate the real home env file

Skill-script tests:
- each service test file points to `scripts/test_connection.py`
- renamed scripts preserve the previous probe behavior

Docs:
- quick references, installation guides, and skill docs use the new script name consistently

## Risks

- auto-test can become noisy if debounce and fingerprint rules are wrong
- grouped credential UI can regress if existing flat-field assumptions remain in tests
- backend execution can be brittle on Windows if interpreter fallback is incomplete
- duplicated credential mapping between env sync and testing would drift over time

## Recommended Mitigations

- use per-service field fingerprints plus debounce before auto-running tests
- centralize service metadata in one backend registry and one frontend grouping helper
- normalize backend responses so the UI has a stable contract
- keep save flow independent from test status to avoid blocking onboarding progress
