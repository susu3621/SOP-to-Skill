#!/usr/bin/env node
/**
 * Skill Configurator Onboarding E2E Test Script
 *
 * This script automates the onboarding flow and optionally generates
 * a skill configuration based on the test input.
 *
 * Usage:
 *   node scripts/test-onboarding.cjs [options]
 *
 * Options:
 *   --headed          Run with browser UI visible
 *   --headless        Run in headless mode (default)
 *   --build-skill     Generate skill configuration after test
 *   --config <file>   Load test configuration from JSON file
 *   --output <dir>    Output directory for results (default: ./test-output)
 *   --role <preset>   Use a role preset (e.g., project-manager)
 *   --tools <preset>  Use a tools preset (e.g., jira-confluence)
 *   --list-presets    List available presets
 *   --help            Show help message
 */

const fs = require('fs');
const path = require('path');

// Role presets - 岗位预设
const ROLE_PRESETS = {
  'project-manager': {
    name: '项目经理',
    useCases: ['记录日志', '记录计划', '项目周报'],
  },
  'sales-manager': {
    name: '销售经理',
    useCases: ['记录日志', '记录计划'],
  },
  'qa-manager': {
    name: '质量经理',
    useCases: ['记录日志', '记录计划'],
  },
  'delivery-manager': {
    name: '交付经理',
    useCases: ['记录日志', '记录计划'],
  },
  'rd-manager': {
    name: '研发经理',
    useCases: ['记录日志', '记录计划'],
  },
};

// Tool presets - 工具预设
const TOOL_PRESETS = {
  'jira': {
    name: 'Jira',
    baseSkills: ['jira'],
    credentials: {
      jiraUsername: 'test.user@example.com',
      jiraPassword: 'test-jira-api-token',
    },
  },
  'confluence': {
    name: 'Confluence',
    baseSkills: ['confluence'],
    credentials: {
      confluenceUsername: 'test.user@example.com',
      confluencePassword: 'test-confluence-api-token',
    },
  },
  'saleseasy': {
    name: '销售易',
    baseSkills: ['saleseasy'],
    credentials: {
      saleseasyUsername: 'sales.user@example.com',
      saleseasyPassword: 'test-sales-password',
    },
  },
  'notion': {
    name: 'Notion',
    baseSkills: ['notion'],
    credentials: {
      notionUsername: 'test.user@example.com',
      notionPassword: 'test-notion-token',
    },
  },
  'zentao': {
    name: '禅道',
    baseSkills: ['zentao'],
    credentials: {
      zentaoUsername: 'qa.user',
      zentaoPassword: 'test-zentao-password',
    },
  },
  'full-stack': {
    name: 'All Tools',
    baseSkills: ['jira', 'confluence', 'saleseasy', 'notion'],
    credentials: {
      jiraUsername: 'test.user@example.com',
      jiraPassword: 'test-jira-token',
      confluenceUsername: 'test.user@example.com',
      confluencePassword: 'test-confluence-token',
      saleseasyUsername: 'test.user@example.com',
      saleseasyPassword: 'test-sales-password',
      notionUsername: 'test.user@example.com',
      notionPassword: 'test-notion-token',
    },
  },
};

// Early exit for help and list-presets (before loading playwright)
const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log(`
Skill Configurator Onboarding E2E Test Script

Usage:
  node scripts/test-onboarding.cjs [options]

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

Examples:
  node scripts/test-onboarding.cjs --headed
  node scripts/test-onboarding.cjs --build-skill --role project-manager --tools jira-confluence
  node scripts/test-onboarding.cjs --config my-config.json --build-skill
`);
  process.exit(0);
}

if (args.includes('--list-presets')) {
  console.log('\n可用的岗位预设 (--role):\n');
  for (const [key, preset] of Object.entries(ROLE_PRESETS)) {
    console.log(`  ${key.padEnd(20)} - ${preset.name}`);
    console.log(`                       用例: ${preset.useCases.join(', ')}`);
  }
  console.log('\n可用的工具预设 (--tools):\n');
  for (const [key, preset] of Object.entries(TOOL_PRESETS)) {
    console.log(`  ${key.padEnd(20)} - ${preset.name}`);
  }
  console.log('');
  process.exit(0);
}

// Now load playwright (only when actually running tests)
const { chromium } = require('playwright');

// Default test configuration
const DEFAULT_CONFIG = {
  agentApps: ['workbuddy', 'claude-code'],
  role: '项目经理',
  baseSkills: ['jira', 'confluence'],
  useCase: '项目周报',
  useCases: ['记录日志', '记录计划', '项目周报'],
  infoSources: 'Jira 项目看板、Confluence 周报模板、例会纪要目录、邮件归档',
  reportRules: '采用公司标准周报模板，按风险、里程碑、待办三部分组织。风险部分需要标注等级和责任人。',
  credentials: {
    jiraUsername: 'pm.user@example.com',
    jiraPassword: 'test-jira-api-token',
    confluenceUsername: 'pm.user@example.com',
    confluencePassword: 'test-confluence-api-token',
  },
};

class OnboardingTester {
  constructor(options = {}) {
    this.headless = options.headless !== false;
    this.buildSkill = options.buildSkill || false;
    this.config = options.config || DEFAULT_CONFIG;
    this.outputDir = options.outputDir || './test-output';
    this.baseURL = options.baseURL || 'http://localhost:1420';
    this.browser = null;
    this.context = null;
    this.page = null;
    this.results = [];
  }

  async init() {
    console.log('🚀 Initializing browser...');
    this.browser = await chromium.launch({
      headless: this.headless,
      slowMo: this.headless ? 0 : 100,
    });
    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    this.page = await this.context.newPage();

    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async navigate() {
    console.log(`📱 Navigating to ${this.baseURL}...`);
    await this.page.goto(this.baseURL);
    await this.page.waitForLoadState('networkidle');
  }

  async step1_selectAgentApps() {
    console.log('\n📝 Step 1: Selecting Agent Apps...');

    for (const app of this.config.agentApps) {
      const label = this.getAgentAppLabel(app);
      const checkbox = this.page.getByLabel(label, { exact: false });
      await checkbox.check();
      console.log(`  ✓ Selected: ${label}`);
    }

    await this.clickNext();
    this.results.push({ step: 1, name: 'Select Agent Apps', status: 'passed' });
  }

  async step2_selectRole() {
    console.log('\n📝 Step 2: Selecting Role...');

    await this.page.getByLabel(this.config.role).check();
    console.log(`  ✓ Selected role: ${this.config.role}`);

    await this.clickNext();
    this.results.push({ step: 2, name: 'Select Role', status: 'passed' });
  }

  async step3_selectBaseSkills() {
    console.log('\n📝 Step 3: Selecting Base Skills...');

    for (const skill of this.config.baseSkills) {
      const label = this.getBaseSkillLabel(skill);
      await this.page.getByLabel(label).check();
      console.log(`  ✓ Selected: ${label}`);
    }

    await this.clickNext();
    this.results.push({ step: 3, name: 'Select Base Skills', status: 'passed' });
  }

  async step4_selectUseCase() {
    console.log('\n📝 Step 4: Selecting Use Case...');

    await this.page.getByLabel(this.config.useCase).check();
    console.log(`  ✓ Selected use case: ${this.config.useCase}`);

    await this.clickNext();
    this.results.push({ step: 4, name: 'Select Use Case', status: 'passed' });
  }

  async step5_enterInfoSources() {
    console.log('\n📝 Step 5: Entering Info Sources...');

    await this.page.getByLabel('基础信息来源').fill(this.config.infoSources);
    console.log(`  ✓ Entered info sources`);

    await this.clickNext();
    this.results.push({ step: 5, name: 'Enter Info Sources', status: 'passed' });
  }

  async step6_enterReportRules() {
    console.log('\n📝 Step 6: Entering Report Rules...');

    await this.page.getByLabel('用例规则或模板').fill(this.config.reportRules);
    console.log(`  ✓ Entered report rules`);

    await this.clickNext();
    this.results.push({ step: 6, name: 'Enter Report Rules', status: 'passed' });
  }

  async step7_enterCredentials() {
    console.log('\n📝 Step 7: Entering Credentials...');

    const credentialFields = this.getCredentialFields();

    for (const [key, value] of Object.entries(credentialFields)) {
      try {
        await this.page.getByLabel(key).fill(value);
        console.log(`  ✓ Entered: ${key}`);
      } catch (e) {
        console.log(`  ⚠ Field not found: ${key}`);
      }
    }

    await this.clickNext();
    this.results.push({ step: 7, name: 'Enter Credentials', status: 'passed' });
  }

  async step8_verifyCompletion() {
    console.log('\n📝 Step 8: Verifying Completion...');

    await this.page.waitForSelector('h2:has-text("设置完成")', { timeout: 10000 });
    console.log('  ✓ Completion screen displayed');

    // Verify summary shows correct values
    const roleVisible = await this.page.isVisible(`text=${this.config.role}`);
    if (roleVisible) {
      console.log(`  ✓ Role "${this.config.role}" displayed in summary`);
    }

    this.results.push({ step: 8, name: 'Verify Completion', status: 'passed' });
  }

  async clickNext() {
    await this.page.getByRole('button', { name: /下一步|完成设置/ }).click();
    await this.page.waitForTimeout(500);
  }

  getAgentAppLabel(app) {
    const labels = {
      antigravity: 'Antigravity',
      workbuddy: 'WorkBuddy',
      'claude-code': 'Claude Code',
      codex: 'Codex',
      'gemini-cli': 'Gemini CLI',
    };
    return labels[app] || app;
  }

  getBaseSkillLabel(skill) {
    const labels = {
      jira: 'Jira',
      confluence: 'Confluence',
      saleseasy: '销售易',
      notion: 'Notion',
      zentao: '禅道',
    };
    return labels[skill] || skill;
  }

  getCredentialFields() {
    const fields = {};
    const skillCredentials = {
      jira: [
        ['Jira 用户名', 'jiraUsername'],
        ['Jira 密码 / API Token', 'jiraPassword'],
      ],
      confluence: [
        ['Confluence 用户名', 'confluenceUsername'],
        ['Confluence 密码 / API Token', 'confluencePassword'],
      ],
      saleseasy: [
        ['销售易 用户名', 'saleseasyUsername'],
        ['销售易 密码', 'saleseasyPassword'],
      ],
      notion: [
        ['Notion 用户邮箱', 'notionUsername'],
        ['Notion 密码 / Integration Token', 'notionPassword'],
      ],
      zentao: [
        ['禅道 用户名', 'zentaoUsername'],
        ['禅道 密码', 'zentaoPassword'],
      ],
    };

    for (const skill of this.config.baseSkills) {
      if (skillCredentials[skill]) {
        for (const [label, key] of skillCredentials[skill]) {
          if (this.config.credentials[key]) {
            fields[label] = this.config.credentials[key];
          }
        }
      }
    }

    return fields;
  }

  generateSkillConfig() {
    console.log('\n🔨 Generating skill configuration...');

    const skillConfig = {
      name: 'workbuddy-weekly-report',
      version: '1.0.0',
      description: 'WorkBuddy 周报发送能力配置',
      author: 'test-script',
      generatedAt: new Date().toISOString(),
      config: {
        agentApps: this.config.agentApps,
        role: this.config.role,
        baseSkills: this.config.baseSkills,
        useCase: this.config.useCase,
        infoSources: this.config.infoSources,
        reportRules: this.config.reportRules,
      },
      credentials: this.config.credentials,
      targets: this.config.agentApps,
    };

    const skillMD = `---
name: workbuddy-weekly-report
description: WorkBuddy 周报发送能力配置
---

# WorkBuddy 周报发送能力

## 配置信息

- **岗位**: ${this.config.role}
- **用例**: ${this.config.useCase}
- **基础工具**: ${this.config.baseSkills.join('、')}
- **Agent 应用**: ${this.config.agentApps.join('、')}

## 信息来源

${this.config.infoSources}

## 报告规则

${this.config.reportRules}

## 凭证配置

需要配置以下工具的凭证：

${this.config.baseSkills.map(s => `- ${this.getBaseSkillLabel(s)}`).join('\n')}

---

*Generated by test-onboarding.js at ${new Date().toLocaleString('zh-CN')}*
`;

    const skillJsonPath = path.join(this.outputDir, 'skill.json');
    const skillMdPath = path.join(this.outputDir, 'SKILL.md');

    fs.writeFileSync(skillJsonPath, JSON.stringify(skillConfig, null, 2));
    fs.writeFileSync(skillMdPath, skillMD);

    console.log(`  ✓ skill.json saved to: ${skillJsonPath}`);
    console.log(`  ✓ SKILL.md saved to: ${skillMdPath}`);
  }

  printSummary() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 Test Summary');
    console.log('='.repeat(50));

    for (const result of this.results) {
      const icon = result.status === 'passed' ? '✅' : '❌';
      console.log(`${icon} Step ${result.step}: ${result.name}`);
    }

    console.log('='.repeat(50));
    const passed = this.results.filter(r => r.status === 'passed').length;
    console.log(`Total: ${passed}/${this.results.length} steps passed`);
    console.log('='.repeat(50));
  }

  async run() {
    try {
      await this.init();
      await this.navigate();

      await this.step1_selectAgentApps();
      await this.step2_selectRole();
      await this.step3_selectBaseSkills();
      await this.step4_selectUseCase();
      await this.step5_enterInfoSources();
      await this.step6_enterReportRules();
      await this.step7_enterCredentials();
      await this.step8_verifyCompletion();

      this.printSummary();

      if (this.buildSkill) {
        this.generateSkillConfig();
      }

      console.log('\n✅ All tests passed!\n');
      return true;
    } catch (error) {
      console.error('\n❌ Test failed:', error.message);
      return false;
    } finally {
      await this.cleanup();
    }
  }
}

// CLI argument parsing
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    headless: true,
    buildSkill: false,
    config: { ...DEFAULT_CONFIG },
    outputDir: './test-output',
    role: null,
    tools: null,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--headed':
        options.headless = false;
        break;
      case '--headless':
        options.headless = true;
        break;
      case '--build-skill':
        options.buildSkill = true;
        break;
      case '--config':
        const configFile = args[++i];
        options.config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
        break;
      case '--output':
        options.outputDir = args[++i];
        break;
      case '--role':
        options.role = args[++i];
        break;
      case '--tools':
        options.tools = args[++i];
        break;
      case '--list-presets':
        console.log('\n可用的岗位预设 (--role):\n');
        for (const [key, preset] of Object.entries(ROLE_PRESETS)) {
          console.log(`  ${key.padEnd(20)} - ${preset.name}`);
        }
        console.log('\n可用的工具预设 (--tools):\n');
        for (const [key, preset] of Object.entries(TOOL_PRESETS)) {
          console.log(`  ${key.padEnd(20)} - ${preset.name}`);
        }
        console.log('');
        process.exit(0);
      case '--help':
        console.log(`
Skill Configurator Onboarding E2E Test Script

Usage:
  node scripts/test-onboarding.js [options]

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

Examples:
  node scripts/test-onboarding.js --headed
  node scripts/test-onboarding.js --build-skill --role project-manager --tools jira-confluence
  node scripts/test-onboarding.js --config my-config.json --build-skill
`);
        process.exit(0);
    }
  }

  // Apply role preset
  if (options.role) {
    if (ROLE_PRESETS[options.role]) {
      const preset = ROLE_PRESETS[options.role];
      options.config.role = preset.name;
      options.config.useCases = preset.useCases;
      // 默认选择第一个用例
      options.config.useCase = preset.useCases[0];
      console.log(`\n📋 Using role preset: ${options.role} (${preset.name})\n`);
      console.log(`   Available use cases: ${preset.useCases.join(', ')}\n`);
    } else {
      console.error(`Unknown role preset: ${options.role}`);
      console.log('Use --list-presets to see available options');
      process.exit(1);
    }
  }

  // Apply tools preset
  if (options.tools) {
    if (TOOL_PRESETS[options.tools]) {
      const preset = TOOL_PRESETS[options.tools];
      options.config.baseSkills = preset.baseSkills;
      options.config.credentials = { ...options.config.credentials, ...preset.credentials };
      console.log(`📋 Using tools preset: ${options.tools} (${preset.name})\n`);
    } else {
      console.error(`Unknown tools preset: ${options.tools}`);
      console.log('Use --list-presets to see available options');
      process.exit(1);
    }
  }

  return options;
}

// Main execution
async function main() {
  const options = parseArgs();

  console.log('🧪 WorkBuddy Onboarding E2E Test');
  console.log('================================\n');
  console.log(`Mode: ${options.headless ? 'Headless' : 'Headed'}`);
  console.log(`Build Skill: ${options.buildSkill}`);
  console.log(`Output: ${options.outputDir}`);
  console.log('');

  const tester = new OnboardingTester(options);
  const success = await tester.run();

  process.exit(success ? 0 : 1);
}

main();
