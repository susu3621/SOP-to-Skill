---
name: local-filesystem
description: Use when reading or writing SOPs, templates, project docs, or wiki-like content stored in a local filesystem directory.
---
# Local Filesystem Skill

Use this skill for wiki-like documentation stored on the current machine.

## Required Environment

- `python3` for the bundled connectivity probe
- Read/write access to the configured local directory
- Required environment variable:
  - `LOCAL_FILESYSTEM_PATH`
- The bundled connection probe supports `.env` and `.env.local-filesystem`

Check before running local filesystem workflows:

```bash
python3 --version
python3 scripts/test_connection.py --test-only --json
```

## Missing Environment Handling

1. If `python3` or another required executable is missing, stop and summarize exactly which tools are unavailable.
2. If a required tool is missing, ask the user for confirmation before installing anything.
3. After the user confirms, install the missing dependency automatically with the machine's package manager.
4. Re-run the environment checks and `python3 {{script_dir}}/test_connection.py` before reading, writing, moving, or deleting files.

## Runtime Inputs

- Use `LOCAL_FILESYSTEM_PATH` as the root directory for local wiki content.
- Ask the user for the target file or subdirectory when the task does not specify it.
- Keep all reads and writes inside the configured root unless the user explicitly provides another path.

## Common Tasks

### Verify access

```bash
python3 scripts/test_connection.py --test-only --json
```

### List wiki files

```bash
find "$LOCAL_FILESYSTEM_PATH" -maxdepth 2 -type f
```

### Read a document

```bash
sed -n '1,220p' "$LOCAL_FILESYSTEM_PATH/path/to/doc.md"
```

## Notes

- This skill treats a directory as a lightweight wiki source.
- The connection probe validates that the configured path exists and is a directory.
