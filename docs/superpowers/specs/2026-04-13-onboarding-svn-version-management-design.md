# Onboarding SVN Version Management Support Design

## Goal

Add `SVN` as a first-class onboarding infrastructure skill, with the same three-layer shape already used by `Gerrit`:
- selectable under onboarding base skills
- testable through the onboarding connection-test flow
- installable from a repository-managed `skills/svn` package

At the same time, rename the current `代码管理 / Code Management` grouping to `版本管理 / Version Management` so `Gerrit` and `SVN` live under one consistent category.

## Scope

This change covers:
- `src/shared/config.json` base skill definition for `svn`
- onboarding frontend grouping and credential rendering
- backend onboarding connection-test support for `svn`
- a new bundled `skills/svn` directory
- repository skill manifest metadata for `svn`
- visible category/group copy rename from `代码管理` to `版本管理`

This change does not cover:
- `svn+ssh`
- client certificate authentication
- repository browsing or advanced multi-repo workflows

The first version is intentionally limited to `HTTP/HTTPS + 用户名 + 密码`.

## Product Shape

### Onboarding base skill

`SVN` appears alongside `Gerrit` in the onboarding infrastructure picker.

Credential fields:
- `svnUrl`
- `svnUsername`
- `svnPassword`

The copy should position SVN as a version-management system that AI can use to read repository information and execute standard repository operations.

### Group rename

The existing onboarding infrastructure group:
- `代码管理`
- `Code Management`

becomes:
- `版本管理`
- `Version Management`

That rename applies both to:
- onboarding infrastructure groups
- bundled skill library category labels

`Gerrit` stays in the same conceptual bucket; only the displayed/category id naming changes to include SVN cleanly.

## Backend connection testing

The onboarding connection-test registry in `src-tauri/src/commands/onboarding.rs` should treat `svn` as a supported service.

Required fields:
- `svnUrl`
- `svnUsername`
- `svnPassword`

Managed env keys written to onboarding-controlled env files:
- `SVN_URL`
- `SVN_USERNAME`
- `SVN_PASSWORD`

The backend should resolve the probe script from:
- `skills/svn/scripts/test_connection.py`

## `skills/svn` package

Create a repository-managed `skills/svn` package with:
- `SKILL.md`
- `scripts/test_connection.py`
- `tests/test_svn_connection.py`

The skill should focus on common SVN operations relevant to IT and operations workflows:
- checkout
- update
- status
- log
- add
- commit
- revert
- repository/path inspection

The connection script should use a minimal, non-interactive probe:
- execute `svn info <url> --non-interactive --username <user> --password <password> --no-auth-cache`

Success output should follow the same normalized JSON contract already used by bundled connection probes.

## Skill manifest

`skills/manifest.json` should gain a new `svn` entry:
- `id: svn`
- `path: skills/svn`
- `targets: ["claude-code", "codex", "workbuddy"]`
- `category: version-management`

The existing `gerrit` manifest entry should also move from `code-management` to `version-management`.

## Testing

Frontend tests should prove:
- `SVN` is exposed as a base skill
- the version-management group contains both `gerrit` and `svn`
- the onboarding infrastructure editor renders SVN fields
- visible labels use `版本管理`
- skill-library category labels use `版本管理`

Backend tests should prove:
- `svn` env entries are built correctly
- missing SVN required fields are rejected
- `skills/svn/scripts/test_connection.py` is resolved
- managed env syncing includes SVN keys

Skill tests should prove:
- the SVN probe loads config from env
- the probe constructs the expected `svn info` command
- the normalized JSON payload is stable

## Risks and constraints

### Authentication model mismatch

Some enterprise SVN deployments rely on `svn+ssh` or certificate auth. This design explicitly does not cover those yet. The first version should fail clearly rather than pretending broader compatibility.

### Group/category rename impact

Existing tests and UI copy refer to `代码管理`. This change should update only the live UI/tests and leave historical docs intact.
