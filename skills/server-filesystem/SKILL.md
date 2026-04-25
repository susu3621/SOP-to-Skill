---
name: server-filesystem
description: Use when reading or writing SOPs, templates, project docs, or wiki-like content stored on a remote server filesystem over SSH.
---
# Server Filesystem Skill

Use this skill for wiki-like documentation stored on a remote server.

## Required Environment

- `python3`
- `paramiko`
- Network access to the server over SSH
- Required environment variables:
  - `SERVER_FILESYSTEM_IP`
  - `SERVER_FILESYSTEM_USERNAME`
  - `SERVER_FILESYSTEM_PASSWORD`
- The bundled connection probe supports `.env` and `.env.server-filesystem`

Check before running server filesystem workflows:

```bash
python3 --version
python3 -c "import paramiko; print(paramiko.__version__)"
python3 scripts/test_connection.py --test-only --json
```

## Missing Environment Handling

1. If `python3`, `paramiko`, or another required executable is missing, stop and summarize exactly which tools are unavailable.
2. If a required tool is missing, ask the user for confirmation before installing anything.
3. After the user confirms, install the missing dependency automatically with the machine's package manager or `python3 -m pip install -r {{script_dir}}/requirements.txt`.
4. Re-run the environment checks and `python3 {{script_dir}}/test_connection.py` before remote login, file reads, file writes, moves, or deletes.

## Runtime Inputs

- Use `SERVER_FILESYSTEM_IP`, `SERVER_FILESYSTEM_USERNAME`, and `SERVER_FILESYSTEM_PASSWORD` for SSH access.
- Ask the user for the target directory or file path on the server when the task does not specify it.
- Prefer read-only inspection before making server-side changes.

## Common Tasks

### Verify access

```bash
python3 scripts/test_connection.py --test-only --json
```

### Inspect a remote directory

```bash
ssh "$SERVER_FILESYSTEM_USERNAME@$SERVER_FILESYSTEM_IP" 'pwd && ls -la'
```

### Read a remote document

```bash
ssh "$SERVER_FILESYSTEM_USERNAME@$SERVER_FILESYSTEM_IP" 'sed -n "1,220p" /path/to/doc.md'
```

## Notes

- This version is username-password only.
- Custom SSH ports and key-based authentication are out of scope for this package version.
- The bundled probe verifies basic SSH reachability with Paramiko.
