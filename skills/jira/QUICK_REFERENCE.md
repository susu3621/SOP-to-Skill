# Jira Skill Quick Reference

## Required Environment

```bash
export JIRA_URL="https://your-instance.atlassian.net"
export JIRA_USERNAME="your.email@example.com"
export JIRA_PASSWORD="your-password-or-api-token"
```

## Search Commands

```bash
python3 scripts/search_jira.py --keyword "authentication"
python3 scripts/search_jira.py --updated-after 2026-03-01 --updated-before 2026-03-10
python3 scripts/search_jira.py --reporter "alice"
python3 scripts/search_jira.py --assignee "bob"
python3 scripts/search_jira.py --keyword "authentication" --limit 20
```

## Detail Command

```bash
python3 scripts/get_jira_issue.py PROJ-123
```

## Auth Probe

```bash
python3 scripts/test_jira_login.py
python3 scripts/test_jira_login.py --env-file /path/to/.env
```

## Output Shapes

Search output:

```text
PROJ-123 | Login fails on VPN | In Progress | Alice | Bob | 2026-03-05T09:30:00.000+0000 | https://jira.example.com/browse/PROJ-123
```

Detail output:

```text
key: PROJ-123
summary: Login fails on VPN
status: In Progress
resolution: Fixed
resolution_date: 2026-03-06T10:00:00.000+0000
...
url: https://jira.example.com/browse/PROJ-123

[parent]
PROJ-100 | Authentication epic | In Progress

[subtasks]
PROJ-124 | Verify VPN logs | Done | Bob

[linked_issues]
blocks | PROJ-200 | Gateway firmware update | In Progress

[comments]
2026-03-05T09:00:00.000+0000 | Alice
Need driver package from vendor.

[changelog]
2026-03-04T15:00:00.000+0000 | Alice
status: Open -> In Progress
```

## Constraints

- Use exactly one search mode in V1.
- Reporter and assignee values are passed through directly to Jira.
- `.env`, `.env.jira`, and `.env.atlassian` are loaded automatically when present.
- Issue detail output is sectioned and includes `parent`, `subtasks`, `linked_issues`, `comments`, `changelog`, `resolution`, and `resolution_date`.
