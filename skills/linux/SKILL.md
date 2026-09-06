---
name: linux
description: Use when working with Linux hosts for remote login, file inspection, configuration checks, and standard server operations through SSH.
---
# Linux Skill

Use this skill for standard Linux host access and server-side operations over SSH.

## Required Environment

- `python3`
- `paramiko`
- Network access to each Linux host over SSH
- Required environment variables:
  - `LINUX_DEVICES_JSON` for normal multi-device runtime
  - `LINUX_DEVICE_NAME`
  - `LINUX_HOST`
  - `LINUX_USERNAME`
  - `LINUX_PASSWORD`
- The bundled connection probe supports `.env` and `.env.linux`

Check before running Linux workflows:

```bash
python3 --version
python3 -c "import paramiko; print(paramiko.__version__)"
```

## Missing Environment Handling

Check only dependencies needed by the requested operation. Reuse available authorized tools for equivalent reads or conversions when the bundled probe is unnecessary. A missing optional probe or renderer does not block independent work.

If a required dependency has no suitable alternative, report the exact blocked step. Install within the user's existing environment/setup authorization; ask only when installation requires additional scope. Do not install unrelated tools or substitute credentials. Verify the chosen workflow before claiming completion.

## Runtime Inputs

- Use `LINUX_DEVICES_JSON` as the canonical list of configured Linux hosts.
- Each record should contain:
  - `id`
  - `name`
  - `host`
  - `username`
  - `password`
- Prefer referring to a machine by `name` when you communicate with the user, and use `host` for the actual SSH connection target.

## Common Tasks

### Verify access

```bash
python3 scripts/test_connection.py --test-only --json
```

### Use a configured host list

- Read `LINUX_DEVICES_JSON`
- Select the target device by `name`
- Connect with SSH using the corresponding `host`, `username`, and `password`

## Notes

- This version is username-password only.
- Custom SSH ports and key-based authentication are out of scope for this package version.
- The bundled probe is intentionally limited to verifying basic SSH reachability with Paramiko.
