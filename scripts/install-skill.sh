#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: ./scripts/install-skill.sh <skill-id> <codex|claude-code> [target-root]

Examples:
  ./scripts/install-skill.sh jira codex
  ./scripts/install-skill.sh jira claude-code
  ./scripts/install-skill.sh jira codex /tmp/custom-codex-skills
EOF
}

if [[ $# -lt 2 || $# -gt 3 ]]; then
  usage >&2
  exit 1
fi

SKILL_ID="$1"
TARGET_APP="$2"
TARGET_ROOT="${3:-}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_DIR="$ROOT_DIR/skills/$SKILL_ID"

require_home() {
  if [[ -z "${HOME:-}" ]]; then
    echo "HOME environment variable is required when target-root is not provided." >&2
    exit 1
  fi
}

if [[ ! -d "$SOURCE_DIR" ]]; then
  echo "Skill source directory not found: $SOURCE_DIR" >&2
  exit 1
fi

if [[ ! -f "$SOURCE_DIR/SKILL.md" ]]; then
  echo "Skill package is missing SKILL.md: $SOURCE_DIR" >&2
  exit 1
fi

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

mkdir -p "$(dirname "$TARGET_DIR")"
rm -rf "$TARGET_DIR"
mkdir -p "$TARGET_DIR"
cp -R "$SOURCE_DIR"/. "$TARGET_DIR"/

SKILL_DIR="$TARGET_DIR"
SCRIPT_DIR="$TARGET_DIR/scripts"

SKILL_DIR="$SKILL_DIR" SCRIPT_DIR="$SCRIPT_DIR" perl -0pi -e '
  my $skill_dir = $ENV{SKILL_DIR};
  my $script_dir = $ENV{SCRIPT_DIR};
  s/\{\{skill_dir\}\}/$skill_dir/g;
  s/\{\{script_dir\}\}/$script_dir/g;
' "$TARGET_DIR/SKILL.md"

echo "Installed $SKILL_ID to $TARGET_DIR"
