---
name: jira
description: Use when reading Jira issue details, searching Jira issues, or creating and updating Jira issues.
---
# Jira Skill

Use this skill for Jira workflows including reading and writing. It supports issue search, detailed issue lookup, issue creation, and issue updates.

## Quick Decision Matrix

| Task                            | Tool                                                        | Notes                                                |
| ------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------- |
| Search by keyword               | `scripts/search_jira.py --keyword`                        | Returns one-line summaries                           |
| Search by updated date range    | `scripts/search_jira.py --updated-after/--updated-before` | Supports lower bound, upper bound, or both           |
| Search by reporter              | `scripts/search_jira.py --reporter`                       | Value is passed through to JQL                       |
| Search by assignee              | `scripts/search_jira.py --assignee`                       | Value is passed through to JQL                       |
| **Create a new issue**          | `scripts/manage_jira_issue.py --project`                  | Specify project key and summary                      |
| **Update an existing issue**    | `scripts/manage_jira_issue.py --issue`                    | Update by issue key                                  |
| **Add comment to issue**        | `scripts/manage_jira_issue.py --issue --comment`          | Add comment without changing fields                  |
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

### Create Issue

Create a new Jira issue:

```bash
# Basic creation with required fields
python3 {{script_dir}}/manage_jira_issue.py --project PROJ --summary "Issue title"

# With description
python3 {{script_dir}}/manage_jira_issue.py --project PROJ --summary "Bug report" --description "Detailed description"

# With additional fields
python3 {{script_dir}}/manage_jira_issue.py \
    --project PROJ \
    --summary "Bug report" \
    --type Bug \
    --priority High \
    --assignee username \
    --labels frontend urgent

# Create as subtask
python3 {{script_dir}}/manage_jira_issue.py \
    --project PROJ \
    --summary "Subtask title" \
    --type Subtask \
    --parent PROJ-100

# With components
python3 {{script_dir}}/manage_jira_issue.py \
    --project PROJ \
    --summary "Feature request" \
    --components API Database

# Preview without creating
python3 {{script_dir}}/manage_jira_issue.py \
    --project PROJ \
    --summary "Test issue" \
    --dry-run
```

### Update Issue

Update an existing issue:

```bash
# Update summary and description
python3 {{script_dir}}/manage_jira_issue.py --issue PROJ-123 --summary "New title" --description "New description"

# Update specific fields
python3 {{script_dir}}/manage_jira_issue.py --issue PROJ-123 --priority Low --assignee username

# Add labels
python3 {{script_dir}}/manage_jira_issue.py --issue PROJ-123 --labels bug verified

# Add a comment only
python3 {{script_dir}}/manage_jira_issue.py --issue PROJ-123 --comment "Status update: fixed in v1.2"

# Update with custom fields
python3 {{script_dir}}/manage_jira_issue.py --issue PROJ-123 --custom-fields '{"customfield_10001": "value"}'

# Preview changes
python3 {{script_dir}}/manage_jira_issue.py --issue PROJ-123 --summary "New title" --dry-run
```

**Create Options:**
- `--project, -p`: Project key (required for create)
- `--summary, -s`: Issue title (required for create)
- `--description, -d`: Issue description
- `--type, -t`: Issue type (default: Task). Examples: Task, Bug, Story, Epic, Subtask
- `--priority`: Priority name. Examples: Highest, High, Medium, Low, Lowest
- `--assignee, -a`: Assignee username
- `--labels, -l`: Space-separated list of labels
- `--components, -c`: Space-separated list of component names
- `--parent`: Parent issue key (for subtasks)
- `--custom-fields`: Custom fields as JSON string

**Update Options:**
- `--issue, -i`: Issue key to update (required for update)
- All field options above can be used for partial updates
- `--comment`: Add a comment to the issue

**Common Options:**
- `--dry-run`: Preview payload without making changes

## Utility Scripts

| Script                         | Purpose                                                     |
| ------------------------------ | ----------------------------------------------------------- |
| `scripts/jira_auth.py`       | Shared credential discovery for Jira scripts                |
| `scripts/search_jira.py`     | Search Jira by keyword, updated date, reporter, or assignee |
| `scripts/get_jira_issue.py`  | Fetch Jira issue details by key                             |
| `scripts/manage_jira_issue.py` | Create or update Jira issues                              |
| `scripts/test_jira_login.py` | Verify Jira authentication directly                         |

## Notes

- `{{skill_dir}}` and `{{script_dir}}` are resolved during installation so the commands point at the installed skill package.
- Search supports exactly one active search mode in V1.
- `jira_auth.py` automatically loads `.env`, `.env.jira`, and `.env.atlassian` when present.
- Search results are formatted as one line per issue so you can scan first, then fetch details by key.
- Detail output is sectioned for scanning and includes resolution metadata, comments, changelog, parent, subtasks, and linked issues when Jira returns them.
