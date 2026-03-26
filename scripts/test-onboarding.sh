#!/bin/bash
#
# Skill Configurator Onboarding Test Script
#
# 支持两种模式：
# 1. 命令行模式：直接传入所有参数
# 2. 交互模式：不带参数运行，按提示逐步输入
#
# Prerequisites:
#   - Node.js and npm
#   - Playwright browsers installed: npx playwright install
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FORWARD_ARGS=("$@")

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Show help
show_help() {
    cat << EOF
Skill Configurator Onboarding Test Script

用法:
  $0                              # 交互模式，按提示逐步输入
  $0 [options]                    # 命令行模式，直接传入参数

命令行选项:
  --headed          显示浏览器界面
  --headless        无界面模式 (默认)
  --build-skill     测试完成后生成 Skill 配置
  --local-only      跳过浏览器，仅在本地生成 Skill 配置
  --output <dir>    输出目录 (默认: ./test-output)
  --role <preset>   岗位预设 (见下方列表)
  --tools <preset>  工具预设，可多次使用 (见下方列表)
  --use-case <name> 用例名称
  --info <text>     信息来源
  --rules <text>    用例规则
  --help            显示帮助

岗位预设:
  project-manager   项目经理 (用例: 记录日志, 记录计划, 项目周报)
  sales-manager     销售经理 (用例: 记录日志, 记录计划)
  qa-manager        质量经理 (用例: 记录日志, 记录计划)
  delivery-manager  交付经理 (用例: 记录日志, 记录计划)
  rd-manager        研发经理 (用例: 记录日志, 记录计划)

工具预设:
  jira              Jira
  confluence        Confluence
  saleseasy         销售易
  notion            Notion
  zentao            禅道

示例:
  # 交互模式
  $0

  # 命令行模式
  $0 --role project-manager --tools jira --tools confluence \\
     --use-case "项目周报" --info "Jira看板" --local-only
EOF
    exit 0
}

# Check prerequisites
check_prerequisites() {
    if ! command -v node &> /dev/null; then
        echo -e "${RED}错误: 需要安装 Node.js${NC}"
        exit 1
    fi
}

# Parse arguments
HEADLESS="--headless"
BUILD_SKILL=""
OUTPUT_DIR="./test-output"
HAS_ARGS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --headed)
            HEADLESS="--headed"
            shift
            ;;
        --headless)
            HEADLESS="--headless"
            shift
            ;;
        --build-skill)
            BUILD_SKILL="--build-skill"
            shift
            ;;
        --output)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        --help)
            show_help
            ;;
        --role|--tools|--use-case|--info|--rules)
            HAS_ARGS=true
            shift 2
            ;;
        *)
            shift
            ;;
    esac
done

check_prerequisites

cd "$PROJECT_ROOT"

# Run the Node.js script with all arguments
# The Node.js script handles both interactive and command-line modes
exec node "$SCRIPT_DIR/test-onboarding.cjs" "${FORWARD_ARGS[@]}"
