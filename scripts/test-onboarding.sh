#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

show_help() {
  cat <<'EOF'
Skill Configurator Onboarding Config Manager

用法:
  ./scripts/test-onboarding.sh
  ./scripts/test-onboarding.sh --storage-dir <dir>
  ./scripts/test-onboarding.sh --force-reinstall
  ./scripts/test-onboarding.sh --help

说明:
  安装阶段可使用 --force-reinstall 先卸载已记录技能，再按当前配置全量重装
  默认会进入交互式配置管理器，提供三个入口：
    1. 基础信息设置
    2. 用例配置
    3. 安装技能
EOF
}

if [[ "${1:-}" == "--help" ]]; then
  show_help
  exit 0
fi

if ! command -v node >/dev/null 2>&1; then
  echo "错误: 需要安装 Node.js" >&2
  exit 1
fi

cd "$PROJECT_ROOT"
exec node "$SCRIPT_DIR/test-onboarding.cjs" "$@"
