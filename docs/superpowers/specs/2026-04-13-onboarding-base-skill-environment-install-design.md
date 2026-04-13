# Onboarding Base Skill Environment Check And Install Design

## Goal

Add real environment readiness checks for onboarding base skills on desktop, and let users install missing runtime dependencies from the onboarding UI with visible progress.

The first version targets:
- macOS desktop
- Windows desktop

The interaction shape is the one already approved in the mockup:
- keep the existing four-column base-skill picker at the top
- keep one detail card per selected base skill below
- inside each detail card, use a two-column layout
  - left: credentials, save settings, test connection
  - right: environment status, missing items, auto-install button, install progress, logs

## Scope

This change covers:
- onboarding frontend environment panels and progress UI
- frontend state for automatic environment detection and install-event subscriptions
- new Tauri onboarding commands for environment checks and environment installation
- real-time install progress events emitted from the desktop backend
- docs for the new onboarding environment contract

This change does not cover:
- Linux support
- privilege-escalation UI beyond the explicit install button
- parallel installation of multiple base skills at once
- non-base-skill generated role skills

## Product Behavior

### Automatic environment checks

When a user selects a base skill, the app should automatically check the local runtime requirements for that skill.

The environment check should also re-run when the requirement set changes. In the first version, that mainly applies to Gerrit when the user switches between `http` and `ssh`.

Environment checks are local-only. They should not depend on whether credentials are complete or whether the remote service is reachable.

### Card layout

Each selected base skill keeps a single card.

The card header still shows the skill name and skill description.

The card body becomes a two-column layout:
- left column
  - credential fields
  - connection-test status
  - `测试连接` button
- right column
  - environment status summary
  - required environment list
  - missing-environment summary
  - `自动安装缺失环境` button when auto-install is supported and something is missing
  - live install progress bar
  - current install step
  - install log output

On narrow screens, the layout should collapse to a single column with credentials first and environment second.

### Supported requirements

The first version uses a fixed backend registry instead of parsing `SKILL.md`.

Requirements by service:
- `confluence`: `python3`
- `jira`: `python3`
- `mail`: `python3`
- `svn`: `python3`, `svn`
- `gerrit` with `http`: `python3`, `git`
- `gerrit` with `ssh`: `python3`, `git`, `ssh`

These are the runtime requirements the onboarding app is responsible for checking and optionally installing.

### Platform install strategy

Auto-install is only supported when the host platform and package manager are both supported.

macOS:
- package manager: `brew`
- packages:
  - Python: `brew install python`
  - Git: `brew install git`
  - SVN: `brew install subversion`
  - SSH: `brew install openssh`

Windows:
- package manager: `winget`
- packages:
  - Python: `winget install --id Python.Python.3.12 -e --accept-source-agreements --accept-package-agreements`
  - Git: `winget install --id Git.Git -e --accept-source-agreements --accept-package-agreements`
  - SVN: `winget install --id Apache.Subversion -e --accept-source-agreements --accept-package-agreements`
  - SSH: reuse `Git.Git` for the first version because Git for Windows provides `ssh`

If the platform is unsupported or the package manager is unavailable, the UI should show the environment result and clearly state that automatic install is unavailable.

### Progress and confirmation

The install button itself is the confirmation step. There is no silent background install.

When the user clicks install:
- the frontend starts the install command for that service
- the backend emits progress events during the install
- the UI updates the progress bar, current step, and logs in real time
- when installation completes, the frontend re-runs the environment check automatically

## Backend Contract

### New command: `check_onboarding_skill_environment`

Input:
- `service_id`
- `credential_values`
- `trigger`
- `tested_fingerprint`

Output:
- `service_id`
- `platform`
- `status`
- `summary`
- `details`
- `requirements[]`
- `missing_requirement_ids[]`
- `install_supported`
- `install_support_message`
- `trigger`
- `tested_fingerprint`

### New command: `install_onboarding_skill_environment`

Input:
- `install_id`
- `service_id`
- `credential_values`

Output:
- `install_id`
- `service_id`
- `success`
- `summary`
- `details`
- `installed_requirement_ids[]`

### New event: `onboarding-environment-install-progress`

Payload:
- `install_id`
- `service_id`
- `status`
- `progress_percent`
- `step`
- `log_line`

The event stream is service-scoped and install-request-scoped so the frontend can ignore stale updates.

## Frontend State

The onboarding hook should track two independent states per service:
- environment check state
- environment install state

Connection testing remains separate from environment readiness.

Environment checks should reset when:
- the service is unselected
- the environment fingerprint changes

Install state should reset when:
- the service is unselected
- a new install starts

## Error Handling

Environment checks:
- unsupported service: show error state
- unsupported platform: show unsupported state with guidance
- probe command not found: mark that requirement as missing
- probe execution error: mark overall state as error with detail text

Install:
- package manager missing: fail immediately with actionable message
- install command non-zero exit: fail and keep the streamed logs visible
- stale progress events: ignore on the frontend

## Testing

Frontend tests should cover:
- the new left/right credential-and-environment card layout
- automatic environment detection after selecting a base skill
- Gerrit env requirements changing with auth mode
- install button visibility when something is missing
- live progress rendering from mocked Tauri events

Backend tests should cover:
- environment requirement resolution by service
- Gerrit HTTP vs SSH requirement selection
- install step generation for macOS and Windows
- environment-support messaging when package managers are unavailable

## Risks

### Package manager assumptions

The first version assumes Homebrew on macOS and winget on Windows. If a machine uses a different enterprise software-delivery path, auto-install will be unavailable even if the runtime could be installed manually.

### Install command variability

Package-manager output varies by machine and locale. The UI must treat logs as free text and progress percent as command-step-based, not line-count-based.
