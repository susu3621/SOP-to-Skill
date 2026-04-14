---
name: svn
description: Use when working with SVN repositories for checkout, update, status, history inspection, and standard working-copy operations.
---
# SVN Skill

Use this skill for standard SVN workflows in repositories that still rely on Subversion.

## Required Environment

- `svn`
- `python3` for the bundled connectivity probe
- Network access to the SVN server over HTTP or HTTPS
- Required environment variables:
  - `SVN_REPOSITORIES_JSON` as the canonical multi-repository configuration
  - `SVN_URL`
  - `SVN_USERNAME`
  - `SVN_PASSWORD`
- The bundled connection probe supports `.env` and `.env.svn`

Check before running SVN workflows:

```bash
svn --version
python3 --version
```

## Missing Environment Handling

1. If `svn`, `python3`, or another required executable is missing, stop and summarize exactly which tools are unavailable.
2. If a required tool is missing, ask the user for confirmation before installing anything.
3. After the user confirms, install the missing dependency automatically with the machine's package manager.
4. Re-run the environment checks and `python3 {{script_dir}}/test_connection.py` before checkout, update, history, or commit operations.

## Common Commands

### Checkout

```bash
svn checkout <repo-url> <target-dir>
```

### Update

```bash
svn update
```

### Inspect current changes

```bash
svn status
svn diff
```

### View history

```bash
svn log -l 20
svn info
svn ls <repo-url>
```

### Add or revert files

```bash
svn add <path>
svn revert <path>
```

### Commit

```bash
svn commit -m "brief change summary"
```

## Notes

- Prefer `svn status` before committing so the working-copy delta is explicit.
- Use `svn info` or `svn ls` first when you need to confirm repository access.
- The bundled probe is intentionally limited to HTTP/HTTPS username-password access.
- When both `SVN_REPOSITORIES_JSON` and legacy `SVN_*` variables exist, the bundled probe prefers the first complete repository from `SVN_REPOSITORIES_JSON`.
