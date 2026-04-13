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

1. If `python3`, `paramiko`, or another required executable is missing, stop and summarize exactly which tools are unavailable.
2. If a required tool is missing, ask the user for confirmation before installing anything.
3. After the user confirms, install the missing dependency automatically with the machine's package manager or `pip`.
4. Re-run the environment checks and `python3 {{script_dir}}/test_connection.py` before remote login, file edits, or command execution.

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
