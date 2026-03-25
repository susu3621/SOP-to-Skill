#!/bin/bash
#
# Skill Configurator Onboarding Test Script
#
# This is a wrapper script that calls the Node.js test script.
# For full options, run: ./scripts/test-onboarding.sh --help
#
# Prerequisites:
#   - Node.js and npm
#   - Playwright browsers installed: npx playwright install
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Default options
HEADLESS="--headless"
BUILD_SKILL=""
ROLE=""
TOOLS=""
CONFIG_FILE=""
OUTPUT_DIR="./test-output"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

show_help() {
    cat << EOF
Usage: $0 [options]

Options:
  --headed          Run with browser UI visible
  --headless        Run in headless mode (default)
  --build-skill     Generate skill configuration after test
  --config <file>   Load test configuration from JSON file
  --output <dir>    Output directory for results (default: ./test-output)
  --role <preset>   Use a role preset (e.g., project-manager, sales-manager)
  --tools <preset>  Use a tools preset (e.g., jira-confluence, notion)
  --list-presets    List available role and tools presets
  --help            Show this help message

Available Role Presets:
  project-manager    - 项目经理
  sales-manager      - 销售经理
  qa-manager         - 质量经理
  delivery-manager   - 交付经理
  rd-manager         - 研发经理

Available Tool Presets:
  jira-confluence    - Jira & Confluence
  saleseasy          - 销售易
  notion             - Notion
  zentao             - 禅道
  full-stack         - All Tools

Example:
  $0 --headed
  $0 --build-skill --role project-manager --tools jira-confluence
  $0 --config my-config.json --build-skill
EOF
    exit 0
}

# Parse arguments
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
        --config)
            CONFIG_FILE="--config $2"
            shift 2
            ;;
        --output)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        --role)
            ROLE="--role $2"
            shift 2
            ;;
        --tools)
            TOOLS="--tools $2"
            shift 2
            ;;
        --list-presets)
            node "$SCRIPT_DIR/test-onboarding.cjs" --list-presets
            exit 0
            ;;
        --help)
            show_help
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            show_help
            ;;
    esac
done

echo ""
echo "========================================"
echo "  Skill Configurator Onboarding Test"
echo "========================================"
echo ""

# Run the Node.js test script
cd "$PROJECT_ROOT"

echo -e "${BLUE}[INFO]${NC} Running test script..."

CMD="node \"$SCRIPT_DIR/test-onboarding.cjs\" $HEADLESS $BUILD_SKILL $CONFIG_FILE --output \"$OUTPUT_DIR\" $ROLE $TOOLS"

if eval $CMD; then
    echo ""
    echo -e "${GREEN}[SUCCESS]${NC} Test completed!"
    exit 0
else
    echo ""
    echo -e "${RED}[ERROR]${NC} Test failed"
    exit 1
fi
