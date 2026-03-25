#!/bin/bash
#
# Skill Configurator Onboarding Test Script
#
# Usage:
#   ./scripts/test-onboarding.sh [options]
#
# Options:
#   --headless    Run in headless mode (no browser UI)
#   --json        Output results as JSON
#   --build-skill Generate skill configuration after test
#   --help        Show this help message
#
# Prerequisites:
#   - Node.js and npm
#   - npx (comes with npm)
#   - Playwright browsers installed (npx playwright install)
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
OUTPUT_DIR="$PROJECT_ROOT/test-output"

# Default options
HEADLESS=false
JSON_OUTPUT=false
BUILD_SKILL=false
DEV_SERVER_PID=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
declare -A TEST_CONFIG=(
    ["agentApps"]="workbuddy,claude-code"
    ["role"]="项目经理"
    ["baseSkills"]="jira,confluence"
    ["useCase"]="发送周报"
    ["infoSources"]="Jira 项目看板、Confluence 周报模板、例会纪要目录"
    ["reportRules"]="采用公司标准周报模板，按风险、里程碑、待办三部分组织"
    ["jiraUsername"]="test.user@example.com"
    ["jiraPassword"]="test-jira-token"
    ["confluenceUsername"]="test.user@example.com"
    ["confluencePassword"]="test-confluence-token"
)

usage() {
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --headless    Run in headless mode (no browser UI)"
    echo "  --json        Output results as JSON"
    echo "  --build-skill Generate skill configuration after test"
    echo "  --help        Show this help message"
    echo ""
    echo "Example:"
    echo "  $0 --headless --build-skill"
    exit 0
}

parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --headless)
                HEADLESS=true
                shift
                ;;
            --json)
                JSON_OUTPUT=true
                shift
                ;;
            --build-skill)
                BUILD_SKILL=true
                shift
                ;;
            --help)
                usage
                ;;
            *)
                echo -e "${RED}Unknown option: $1${NC}"
                usage
                ;;
        esac
    done
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi

    if ! command -v npx &> /dev/null; then
        log_error "npx is not installed"
        exit 1
    fi

    log_success "Prerequisites OK"
}

start_dev_server() {
    log_info "Starting development server..."

    cd "$PROJECT_ROOT"
    npm run dev > /dev/null 2>&1 &
    DEV_SERVER_PID=$!

    # Wait for server to be ready
    local max_wait=30
    local waited=0
    while ! curl -s http://localhost:1420 > /dev/null 2>&1; do
        sleep 1
        waited=$((waited + 1))
        if [ $waited -ge $max_wait ]; then
            log_error "Dev server failed to start within ${max_wait}s"
            cleanup
            exit 1
        fi
    done

    log_success "Dev server running at http://localhost:1420"
}

stop_dev_server() {
    if [ -n "$DEV_SERVER_PID" ]; then
        log_info "Stopping development server..."
        kill $DEV_SERVER_PID 2>/dev/null || true
        DEV_SERVER_PID=""
    fi
}

cleanup() {
    stop_dev_server
}

run_playwright_test() {
    log_info "Running Playwright test..."

    mkdir -p "$OUTPUT_DIR"

    local headless_flag=""
    if [ "$HEADLESS" = true ]; then
        headless_flag="--headless"
    fi

    # Create temporary test file
    local test_file="$OUTPUT_DIR/onboarding-test.spec.ts"
    cat > "$test_file" << 'TESTEOF'
import { test, expect } from '@playwright/test';

const TEST_CONFIG = {
    agentApps: ['workbuddy', 'claude-code'],
    role: '项目经理',
    baseSkills: ['jira', 'confluence'],
    useCase: '发送周报',
    infoSources: 'Jira 项目看板、Confluence 周报模板、例会纪要目录',
    reportRules: '采用公司标准周报模板，按风险、里程碑、待办三部分组织',
    credentials: {
        jiraUsername: 'test.user@example.com',
        jiraPassword: 'test-jira-token',
        confluenceUsername: 'test.user@example.com',
        confluencePassword: 'test-confluence-token',
    }
};

test.describe('WorkBuddy Onboarding Flow', () => {
    test('complete onboarding flow', async ({ page }) => {
        // Navigate to app
        await page.goto('http://localhost:1420');

        // Step 1: Select Agent Apps
        console.log('Step 1: Selecting Agent Apps...');
        await expect(page.getByRole('heading', { name: /先选择你要使用的 Agent 应用/i })).toBeVisible();

        for (const app of TEST_CONFIG.agentApps) {
            await page.getByLabel(app, { exact: false }).check();
        }

        // Verify selection
        for (const app of TEST_CONFIG.agentApps) {
            await expect(page.getByLabel(app, { exact: false })).toBeChecked();
        }

        await page.getByRole('button', { name: /下一步/ }).click();

        // Step 2: Select Role
        console.log('Step 2: Selecting Role...');
        await expect(page.getByRole('heading', { name: /选择你的岗位/i })).toBeVisible();
        await page.getByLabel(TEST_CONFIG.role).check();
        await page.getByRole('button', { name: /下一步/ }).click();

        // Step 3: Select Base Skills
        console.log('Step 3: Selecting Base Skills...');
        await expect(page.getByRole('heading', { name: /基础工具/i })).toBeVisible();

        for (const skill of TEST_CONFIG.baseSkills) {
            await page.getByLabel(skill).check();
        }
        await page.getByRole('button', { name: /下一步/ }).click();

        // Step 4: Select Use Case
        console.log('Step 4: Selecting Use Case...');
        await expect(page.getByRole('heading', { name: /岗位用例/i })).toBeVisible();
        await page.getByLabel(TEST_CONFIG.useCase).check();
        await page.getByRole('button', { name: /下一步/ }).click();

        // Step 5: Enter Info Sources
        console.log('Step 5: Entering Info Sources...');
        await expect(page.getByRole('heading', { name: /基础信息来源/i })).toBeVisible();
        await page.getByLabel('基础信息来源').fill(TEST_CONFIG.infoSources);
        await page.getByRole('button', { name: /下一步/ }).click();

        // Step 6: Enter Report Rules
        console.log('Step 6: Entering Report Rules...');
        await page.getByLabel('用例规则或模板').fill(TEST_CONFIG.reportRules);
        await page.getByRole('button', { name: /下一步/ }).click();

        // Step 7: Enter Credentials
        console.log('Step 7: Entering Credentials...');
        await expect(page.getByRole('heading', { name: /补充账号与凭证/i })).toBeVisible();

        // Fill credentials for selected skills
        if (TEST_CONFIG.baseSkills.includes('jira')) {
            await page.getByLabel('Jira 用户名').fill(TEST_CONFIG.credentials.jiraUsername);
            await page.getByLabel('Jira 密码').fill(TEST_CONFIG.credentials.jiraPassword);
        }

        if (TEST_CONFIG.baseSkills.includes('confluence')) {
            await page.getByLabel('Confluence 用户名').fill(TEST_CONFIG.credentials.confluenceUsername);
            await page.getByLabel('Confluence 密码').fill(TEST_CONFIG.credentials.confluencePassword);
        }

        await page.getByRole('button', { name: /完成设置/ }).click();

        // Step 8: Verify Completion
        console.log('Step 8: Verifying Completion...');
        await expect(page.getByRole('heading', { name: /设置完成/i })).toBeVisible();

        // Verify summary shows correct values
        await expect(page.getByText(TEST_CONFIG.role)).toBeVisible();
        await expect(page.getByText(/Jira/)).toBeVisible();
        await expect(page.getByText(/Confluence/)).toBeVisible();

        console.log('Onboarding flow completed successfully!');

        // Store results for skill generation
        await page.evaluate((config) => {
            localStorage.setItem('test_config', JSON.stringify(config));
        }, TEST_CONFIG);
    });

    test('verify floating summary', async ({ page }) => {
        await page.goto('http://localhost:1420');

        // Check summary toggle button exists
        await expect(page.getByRole('button', { name: /配置摘要/ })).toBeVisible();

        // Click to show summary
        await page.getByRole('button', { name: /配置摘要/ }).click();

        // Verify summary panel is visible
        await expect(page.getByText('当前配置')).toBeVisible();
    });

    test('verify progress indicator', async ({ page }) => {
        await page.goto('http://localhost:1420');

        // Select an agent app first
        await page.getByLabel('WorkBuddy').check();
        await page.getByRole('button', { name: /下一步/ }).click();

        // Verify progress dots exist
        const progressDots = await page.locator('.progress-dot').count();
        expect(progressDots).toBe(8);

        // Verify current step is highlighted
        await expect(page.locator('.progress-dot--active')).toBeVisible();
    });
});
TESTEOF

    # Run Playwright test
    cd "$PROJECT_ROOT"

    local output_format="list"
    if [ "$JSON_OUTPUT" = true ]; then
        output_format="json"
    fi

    if npx playwright test "$test_file" $headless_flag --reporter="$output_format" --output="$OUTPUT_DIR"; then
        log_success "All tests passed!"
        return 0
    else
        log_error "Some tests failed"
        return 1
    fi
}

build_skill_config() {
    log_info "Building skill configuration..."

    local skill_dir="$OUTPUT_DIR/skill-config"
    mkdir -p "$skill_dir"

    # Generate skill.json
    cat > "$skill_dir/skill.json" << SKILLEOF
{
  "name": "workbuddy-weekly-report",
  "version": "1.0.0",
  "description": "WorkBuddy 周报发送能力配置",
  "author": "test-script",
  "generatedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "config": {
    "agentApps": ["$(IFS='","'; echo "${TEST_CONFIG[agentApps]}")"],
    "role": "${TEST_CONFIG[role]}",
    "baseSkills": ["$(IFS='","'; echo "${TEST_CONFIG[baseSkills]}")"],
    "useCase": "${TEST_CONFIG[useCase]}",
    "infoSources": "${TEST_CONFIG[infoSources]}",
    "reportRules": "${TEST_CONFIG[reportRules]}"
  },
  "credentials": {
    "jira": {
      "username": "${TEST_CONFIG[jiraUsername]}",
      "password": "${TEST_CONFIG[jiraPassword]}"
    },
    "confluence": {
      "username": "${TEST_CONFIG[confluenceUsername]}",
      "password": "${TEST_CONFIG[confluencePassword]}"
    }
  },
  "targets": ["workbuddy", "claude-code"]
}
SKILLEOF

    # Generate SKILL.md
    cat > "$skill_dir/SKILL.md" << SKILLMDEOF
---
name: workbuddy-weekly-report
description: WorkBuddy 周报发送能力配置
---

# WorkBuddy 周报发送能力

## 配置信息

- **岗位**: ${TEST_CONFIG[role]}
- **用例**: ${TEST_CONFIG[useCase]}
- **基础工具**: ${TEST_CONFIG[baseSkills]}
- **Agent 应用**: ${TEST_CONFIG[agentApps]}

## 信息来源

${TEST_CONFIG[infoSources]}

## 报告规则

${TEST_CONFIG[reportRules]}

## 凭证配置

以下凭证需要配置：

$(IFS=','; for skill in ${TEST_CONFIG[baseSkills]}; do
    echo "- $skill"
done)

---

*Generated by test-workbuddy-onboarding.sh at $(date)*
SKILLMDEOF

    log_success "Skill configuration generated at: $skill_dir"
    echo ""
    echo "Files created:"
    echo "  - $skill_dir/skill.json"
    echo "  - $skill_dir/SKILL.md"
}

# Main execution
main() {
    parse_args "$@"

    trap cleanup EXIT

    echo ""
    echo "========================================"
    echo "  WorkBuddy Onboarding Test Script"
    echo "========================================"
    echo ""

    check_prerequisites
    start_dev_server

    local test_result=0
    if run_playwright_test; then
        test_result=0

        if [ "$BUILD_SKILL" = true ]; then
            build_skill_config
        fi
    else
        test_result=1
    fi

    echo ""
    echo "========================================"
    if [ $test_result -eq 0 ]; then
        log_success "All tests completed successfully!"
    else
        log_error "Tests failed. Check output above for details."
    fi
    echo "========================================"
    echo ""

    exit $test_result
}

main "$@"
