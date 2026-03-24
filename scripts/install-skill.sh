#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: ./scripts/install-skill.sh <skill-id> <codex|claude-code>

Examples:
  ./scripts/install-skill.sh jira codex
  ./scripts/install-skill.sh jira claude-code
EOF
}

if [[ $# -ne 2 ]]; then
  usage >&2
  exit 1
fi

SKILL_ID="$1"
TARGET_APP="$2"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_DIR="$ROOT_DIR/skills/$SKILL_ID"

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
