---
name: jira
description: Use when reading Jira issue details or searching Jira issues by keyword, updated time, reporter, or assignee.
---
# Jira Read-Only Skill

Use this skill for read-only Jira workflows. It supports single-condition issue search and detailed issue lookup by Jira key, including execution context from comments, changelog, parent, subtasks, linked issues, and resolution fields.

## Quick Decision Matrix

| Task                            | Tool                                                        | Notes                                                |
| ------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------- |
| Search by keyword               | `scripts/search_jira.py --keyword`                        | Returns one-line summaries                           |
| Search by updated date range    | `scripts/search_jira.py --updated-after/--updated-before` | Supports lower bound, upper bound, or both           |
| Search by reporter              | `scripts/search_jira.py --reporter`                       | Value is passed through to JQL                       |
| Search by assignee              | `scripts/search_jira.py --assignee`                       | Value is passed through to JQL                       |
| Verify Jira authentication only | `scripts/test_jira_login.py`                              | Checks login without running a search                |
| Inspect one issue in detail     | `scripts/get_jira_issue.py`                               | Fetches a single issue by key with sectioned context |

## Prerequisites

- Required environment variables:
  - `JIRA_URL`
  - `JIRA_USERNAME`
  - `JIRA_PASSWORD`
- Python dependencies from `scripts/requirements.txt`

## Core Workflows

### Search Jira

Use the search script for single-condition issue lookups:

```bash
python3 {{script_dir}}/search_jira.py --keyword "authentication"
python3 {{script_dir}}/search_jira.py --updated-after 2026-03-01 --updated-before 2026-03-10
python3 {{script_dir}}/search_jira.py --reporter "alice"
python3 {{script_dir}}/search_jira.py --assignee "bob"
```

### Get Issue Details

```bash
python3 {{script_dir}}/get_jira_issue.py PROJ-123
```

The detail script prints a header summary plus these sections:

- `parent`
- `subtasks`
- `linked_issues`
- `comments`
- `changelog`

### Verify Login

```bash
python3 {{script_dir}}/test_jira_login.py
python3 {{script_dir}}/test_jira_login.py --env-file /path/to/.env
```

## Utility Scripts

| Script                         | Purpose                                                     |
| ------------------------------ | ----------------------------------------------------------- |
| `scripts/jira_auth.py`       | Shared credential discovery for Jira scripts                |
| `scripts/search_jira.py`     | Search Jira by keyword, updated date, reporter, or assignee |
| `scripts/test_jira_login.py` | Verify Jira authentication directly                         |
| `scripts/get_jira_issue.py`  | Fetch Jira issue details by key                             |

## Notes

- `{{skill_dir}}` and `{{script_dir}}` are resolved during installation so the commands point at the installed skill package.
- Search supports exactly one active search mode in V1.
- `jira_auth.py` automatically loads `.env`, `.env.jira`, and `.env.atlassian` when present.
- Search results are formatted as one line per issue so you can scan first, then fetch details by key.
- Detail output is sectioned for scanning and includes resolution metadata, comments, changelog, parent, subtasks, and linked issues when Jira returns them.
