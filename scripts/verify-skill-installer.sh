#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMP_HOME="$(mktemp -d)"
trap 'rm -rf "$TEMP_HOME"' EXIT

HOME="$TEMP_HOME" "$ROOT_DIR/scripts/install-skill.sh" jira codex

CODEX_DIR="$TEMP_HOME/.codex/skills/jira"
test -d "$CODEX_DIR"
test -f "$CODEX_DIR/SKILL.md"
test -f "$CODEX_DIR/scripts/search_jira.py"
grep -Fq "$CODEX_DIR/scripts" "$CODEX_DIR/SKILL.md"
if grep -Fq '{{script_dir}}' "$CODEX_DIR/SKILL.md"; then
  echo "codex SKILL.md still contains {{script_dir}}" >&2
  exit 1
fi

HOME="$TEMP_HOME" "$ROOT_DIR/scripts/uninstall-skill.sh" jira codex
if [[ -e "$CODEX_DIR" ]]; then
  echo "codex jira directory still exists after uninstall" >&2
  exit 1
fi

HOME="$TEMP_HOME" "$ROOT_DIR/scripts/install-skill.sh" jira claude-code

CLAUDE_DIR="$TEMP_HOME/.claude/skills/jira"
test -d "$CLAUDE_DIR"
test -f "$CLAUDE_DIR/SKILL.md"
test -f "$CLAUDE_DIR/scripts/get_jira_issue.py"
grep -Fq "$CLAUDE_DIR/scripts" "$CLAUDE_DIR/SKILL.md"
if grep -Fq '{{skill_dir}}' "$CLAUDE_DIR/SKILL.md"; then
  echo "claude SKILL.md still contains {{skill_dir}}" >&2
  exit 1
fi

HOME="$TEMP_HOME" "$ROOT_DIR/scripts/uninstall-skill.sh" jira claude-code
if [[ -e "$CLAUDE_DIR" ]]; then
  echo "claude jira directory still exists after uninstall" >&2
  exit 1
fi
