# Onboarding Linux Multi-Device Base Skill Design

## Goal

Add `Linux` as a new onboarding base skill and a real installable skill package.

This base skill should let users configure multiple Linux devices in onboarding, with one structured record per device:
- device name
- IP or host
- username
- password

The device name is required so AI can distinguish machines by role instead of relying only on IPs.

## Scope

This change covers:
- a new `linux` base skill in shared config
- a new onboarding base-skill group for host and operations tools
- multi-device Linux credential editing in the onboarding basic module
- onboarding state persistence for multiple Linux devices
- syncing Linux device data into managed environment variables
- a real `skills/linux` package and repository manifest entry
- Linux environment detection and auto-install support for the local machine that runs the skill

This change does not cover:
- SSH key authentication
- custom ports
- per-device sudo credential escalation flows
- remote terminal streaming UI

The first version is username-password only.

## Product Shape

### Base skill picker

The top area keeps the existing grouped-card structure.

Add a new group:
- `主机与运维`
- `Host & Operations`

Put `Linux` in that group.

### Linux editing model

`Linux` does not use the same flat credential form as Confluence, Jira, Gerrit, SVN, or Mail.

Instead, the selected Linux card renders a device list editor on the left side.

Each device record contains:
- `name`
- `host`
- `username`
- `password`

Actions:
- add device
- delete device
- edit any field inline

The card still keeps the right-side environment panel from the current environment-install feature.

### Device test behavior

Each Linux device row gets its own `测试连接` button and inline status.

That avoids ambiguous behavior when one Linux base skill contains multiple hosts.

Group-level automatic connection testing should stay disabled for Linux. Manual per-device testing is clearer and safer.

## Data Model

### Onboarding state

Add `linux_devices` to onboarding state as a first-class array, not a JSON string hidden inside `credential_values`.

Each item:
- `id`
- `name`
- `host`
- `username`
- `password`

Reasons:
- the UI needs repeated structured editing
- per-device connection testing needs stable item ids
- state diffs and pruning are cleaner than embedding JSON inside a flat map

### Credential model compatibility

Keep the existing `credential_values: Record<string, string>` for the current flat base skills.

Linux becomes the only structured multi-record base skill in this version.

## Environment Sync

When onboarding credentials sync into the managed `~/.env`, Linux devices should be serialized into:
- `LINUX_DEVICES_JSON`

The value is a JSON array containing all configured devices.

If Linux is deselected, `LINUX_DEVICES_JSON` should be removed from the managed env section.

## Linux Skill Package

Create `skills/linux` and add it to `skills/manifest.json`.

Category:
- `host-ops`

The package should include:
- `SKILL.md`
- `scripts/test_connection.py`
- `scripts/requirements.txt`
- `tests/test_linux_connection.py`

### Runtime approach

Use `python3` plus `paramiko` for the first version.

Why:
- works with IP/host + username + password directly
- avoids relying on `sshpass`
- keeps behavior aligned across macOS and Windows

## Environment Detection And Install

Local machine requirements for the Linux base skill:
- `python3`
- `paramiko`

Auto-install support:
- macOS:
  - `brew install python`
  - `python3 -m pip install -r skills/linux/scripts/requirements.txt`
- Windows:
  - `winget install --id Python.Python.3.12 -e --accept-source-agreements --accept-package-agreements`
  - `py -3 -m pip install -r skills/linux/scripts/requirements.txt`

The right-side environment panel should treat Linux like other base skills:
- auto-check on selection
- show missing requirements
- show install button when supported
- stream install progress

## Connection Testing

Onboarding per-device connection testing for Linux uses the bundled `skills/linux/scripts/test_connection.py`.

The onboarding backend passes one device at a time through temp env vars:
- `LINUX_DEVICE_NAME`
- `LINUX_HOST`
- `LINUX_USERNAME`
- `LINUX_PASSWORD`

The skill itself reads `LINUX_DEVICES_JSON` during actual runtime usage.

## Testing

Frontend tests should prove:
- Linux is available as a base skill
- the host-ops group renders
- Linux shows a multi-device editor rather than flat credential fields
- users can add and remove Linux devices
- saving the basic module persists Linux devices

Backend tests should prove:
- onboarding state serialization supports `linux_devices`
- managed env sync writes `LINUX_DEVICES_JSON`
- Linux environment detection resolves `python3` and `paramiko`
- Linux connection-test env entries are built correctly

Skill tests should prove:
- the Linux probe loads single-device env config
- the probe constructs a Paramiko connection correctly
- the repository manifest includes `skills/linux`

## Risks

### Password-at-rest handling

This version stores Linux passwords in the same onboarding state model as other credentials. It matches the current product pattern, but it is not a secure vault design.

### Multi-device UX growth

The first version supports add, edit, delete, and per-device test. If the list grows large, the UI may later need search, grouping, or tags. That is out of scope here.
