# Jira Skill Installation

## 0. Install the skill package into an agent

From the repository root:

```bash
./scripts/install-skill.sh jira codex
./scripts/install-skill.sh jira claude-code
```

To uninstall:

```bash
./scripts/uninstall-skill.sh jira codex
./scripts/uninstall-skill.sh jira claude-code
```

## 1. Install Python dependencies

```bash
cd ~/.codex/skills/jira
python3 -m pip install -r scripts/requirements.txt
```

## 2. Configure environment variables

Set these variables directly or place them in `.env`, `.env.jira`, or `.env.atlassian`:

```bash
export JIRA_URL="https://your-instance.atlassian.net"
export JIRA_USERNAME="your.email@example.com"
export JIRA_PASSWORD="your-password-or-api-token"
```

## 3. Test the commands

```bash
python3 scripts/test_connection.py
python3 scripts/test_connection.py --env-file /path/to/.env
python3 scripts/search_jira.py --keyword "authentication"
python3 scripts/get_jira_issue.py PROJ-123
```

## 4. Git note for `requirements.txt`

This repository ignores `*.txt`, so if you change `scripts/requirements.txt`, stage it explicitly:

```bash
git add -f scripts/requirements.txt
```
