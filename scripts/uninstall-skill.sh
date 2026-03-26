#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: ./scripts/uninstall-skill.sh <skill-id> <codex|claude-code> [target-root]

Examples:
  ./scripts/uninstall-skill.sh jira codex
  ./scripts/uninstall-skill.sh jira claude-code
  ./scripts/uninstall-skill.sh jira codex /tmp/custom-codex-skills
EOF
}

if [[ $# -lt 2 || $# -gt 3 ]]; then
  usage >&2
  exit 1
fi

SKILL_ID="$1"
TARGET_APP="$2"
TARGET_ROOT="${3:-}"

require_home() {
  if [[ -z "${HOME:-}" ]]; then
    echo "HOME environment variable is required when target-root is not provided." >&2
    exit 1
  fi
}

case "$TARGET_APP" in
  codex)
    DEFAULT_ROOT_SUBPATH=".codex/skills"
    ;;
  claude-code)
    DEFAULT_ROOT_SUBPATH=".claude/skills"
    ;;
  *)
    echo "Unsupported target app: $TARGET_APP" >&2
    usage >&2
    exit 1
    ;;
esac

if [[ -n "$TARGET_ROOT" ]]; then
  INSTALL_ROOT="$TARGET_ROOT"
else
  require_home
  INSTALL_ROOT="$HOME/$DEFAULT_ROOT_SUBPATH"
fi

TARGET_DIR="$INSTALL_ROOT/$SKILL_ID"

if [[ ! -e "$TARGET_DIR" ]]; then
  echo "Skill is not installed: $TARGET_DIR" >&2
  exit 1
fi

rm -rf "$TARGET_DIR"
echo "Uninstalled $SKILL_ID from $TARGET_DIR"
