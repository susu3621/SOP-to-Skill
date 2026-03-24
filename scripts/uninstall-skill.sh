#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: ./scripts/uninstall-skill.sh <skill-id> <codex|claude-code>

Examples:
  ./scripts/uninstall-skill.sh jira codex
  ./scripts/uninstall-skill.sh jira claude-code
EOF
}

if [[ $# -ne 2 ]]; then
  usage >&2
  exit 1
fi

SKILL_ID="$1"
TARGET_APP="$2"

case "$TARGET_APP" in
  codex)
    TARGET_DIR="$HOME/.codex/skills/$SKILL_ID"
    ;;
  claude-code)
    TARGET_DIR="$HOME/.claude/skills/$SKILL_ID"
    ;;
  *)
    echo "Unsupported target app: $TARGET_APP" >&2
    usage >&2
    exit 1
    ;;
esac

if [[ ! -e "$TARGET_DIR" ]]; then
  echo "Skill is not installed: $TARGET_DIR" >&2
  exit 1
fi

rm -rf "$TARGET_DIR"
echo "Uninstalled $SKILL_ID from $TARGET_DIR"
