# Jira Read-Only Skill for Claude Code

This directory provides a read-only Jira skill set. It is intended for issue search by keyword, updated date, reporter, or assignee, plus detailed issue lookup by Jira key.

## Features

- Search Jira issues from a standard CLI by keyword
- Search Jira issues by updated date range
- Search Jira issues by reporter
- Search Jira issues by assignee
- Verify Jira authentication independently
- Fetch one Jira issue in detail by key with sectioned execution context
- Auto-load Jira credentials from `.env`, `.env.jira`, or `.env.atlassian`

## Installation

Install Python dependencies:

```bash
cd /path/to/jira
python3 -m pip install -r scripts/requirements.txt
```

## Required Environment Variables

Script-based access uses these variables:

```bash
export JIRA_URL="https://your-instance.atlassian.net"
export JIRA_USERNAME="your.email@example.com"
export JIRA_PASSWORD="your-password-or-api-token"
```

The shared auth helper also auto-loads `.env`, `.env.jira`, and `.env.atlassian` when they are present.

## Quick Start

### 1. Search by keyword

```bash
python3 scripts/search_jira.py --keyword "authentication"
```

### 2. Search by updated date

```bash
python3 scripts/search_jira.py --updated-after 2026-03-01 --updated-before 2026-03-10
```

### 3. Search by reporter

```bash
python3 scripts/search_jira.py --reporter "alice"
```

### 4. Search by assignee

```bash
python3 scripts/search_jira.py --assignee "bob"
```

### 5. Get issue details by key

```bash
python3 scripts/get_jira_issue.py PROJ-123
```

### 6. Verify authentication only

```bash
python3 scripts/test_jira_login.py
python3 scripts/test_jira_login.py --env-file /path/to/.env
```

## Search Behavior

- V1 supports exactly one active search mode per command.
- Time search supports `--updated-after`, `--updated-before`, or both together.
- Search output is one summary line per issue:
  - `KEY | Summary | Status | Reporter | Assignee | Updated | URL`
- Reporter and assignee values are passed through directly to Jira JQL.

## Issue Detail Output

The detail script returns a header summary containing:

- `key`
- `summary`
- `status`
- `issue_type`
- `priority`
- `reporter`
- `assignee`
- `created`
- `updated`
- `resolution`
- `resolution_date`
- `labels`
- `components`
- `fix_versions`
- `description`
- `url`

It then prints these fixed sections for scanning:

- `parent`
- `subtasks`
- `linked_issues`
- `comments`
- `changelog`

Each section is always printed. When Jira returns no data for a section, the script prints `-`.

## Repository Layout

```text
scripts/
  jira_auth.py
  search_jira.py
  test_jira_login.py
  get_jira_issue.py
  requirements.txt

examples/
  .env.example

tests/
  test_search_jira.py
  test_get_jira_issue.py
```

## Notes

- `scripts/requirements.txt` is intentionally tracked even though the repository ignores `*.txt`, so use `git add -f` if you modify it.
- `scripts/search_jira.py` and `scripts/get_jira_issue.py` are read-only and never update Jira data.
