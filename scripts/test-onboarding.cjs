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
const readline = require('readline');

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

    // Lazy load playwright only when needed
    let chromium;
    try {
      chromium = require('playwright').chromium;
    } catch (e) {
      console.error('\n❌ Playwright is not installed.');
      console.error('Please run: npm install playwright && npx playwright install\n');
      process.exit(1);
    }

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

// ============================================================
// Interactive Mode Functions
// ============================================================

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const colors = {
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m',
  reset: '\x1b[0m',
};

function question(prompt, defaultValue = '') {
  return new Promise((resolve) => {
    const displayPrompt = defaultValue
      ? `${prompt} [${defaultValue}]: `
      : `${prompt}: `;
    rl.question(displayPrompt, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });
}

function questionHidden(prompt) {
  return new Promise((resolve) => {
    process.stdout.write(`${prompt}: `);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    let password = '';
    process.stdin.on('data', (char) => {
      if (char === '\n' || char === '\r' || char === '\u0004') {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdout.write('\n');
        resolve(password);
      } else if (char === '\u0003') {
        process.exit();
      } else if (char === '\u007F') {
        password = password.slice(0, -1);
      } else {
        password += char;
      }
    });
  });
}

function selectOption(prompt, options) {
  return new Promise((resolve) => {
    console.log(`\n${colors.cyan}${prompt}${colors.reset}\n`);
    options.forEach((opt, idx) => {
      console.log(`  ${(idx + 1).toString().padStart(2)}) ${opt.label}`);
    });
    console.log('');

    const ask = () => {
      rl.question(`请选择 [1-${options.length}]: `, (answer) => {
        const num = parseInt(answer.trim(), 10);
        if (num >= 1 && num <= options.length) {
          resolve(options[num - 1].value);
        } else {
          console.log('无效选择，请重新输入');
          ask();
        }
      });
    };
    ask();
  });
}

function multiSelect(prompt, options) {
  return new Promise((resolve) => {
    const selected = new Set();

    console.log(`\n${colors.cyan}${prompt}${colors.reset}`);
    console.log(`${colors.yellow}  (可多选，输入数字选择/取消，输入 0 完成)${colors.reset}\n`);

    options.forEach((opt, idx) => {
      console.log(`  ${(idx + 1).toString().padStart(2)}) ${opt.label}`);
    });
    console.log('');

    const ask = () => {
      if (selected.size > 0) {
        const selectedLabels = options
          .filter((opt) => selected.has(opt.value))
          .map((opt) => opt.label);
        console.log(`${colors.yellow}当前选择: ${selectedLabels.join(', ')}${colors.reset}`);
      }

      rl.question(`选择 [1-${options.length}, 0=完成]: `, (answer) => {
        const num = parseInt(answer.trim(), 10);

        if (num === 0) {
          if (selected.size === 0) {
            console.log('请至少选择一个选项');
            ask();
            return;
          }
          resolve(Array.from(selected));
          return;
        }

        if (num >= 1 && num <= options.length) {
          const value = options[num - 1].value;
          if (selected.has(value)) {
            selected.delete(value);
            console.log(`${colors.red}✗${colors.reset} 已取消: ${options[num - 1].label}`);
          } else {
            selected.add(value);
            console.log(`${colors.green}✓${colors.reset} 已选择: ${options[num - 1].label}`);
          }
        } else {
          console.log('无效选择');
        }

        ask();
      });
    };
    ask();
  });
}

function printStep(step, title) {
  console.log(`\n${colors.cyan}${colors.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bold}  Step ${step}: ${title}${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
}

function printSuccess(msg) {
  console.log(`${colors.green}✓ ${msg}${colors.reset}`);
}

// Agent App presets
const AGENT_APP_PRESETS = {
  'workbuddy': { name: 'WorkBuddy', description: '企业级 AI 助手' },
  'claude-code': { name: 'Claude Code', description: 'Anthropic 官方 CLI 工具' },
  'antigravity': { name: 'Antigravity', description: '通用 AI 平台' },
  'codex': { name: 'Codex', description: 'OpenAI 代码助手' },
  'gemini-cli': { name: 'Gemini CLI', description: 'Google Gemini 命令行工具' },
};

async function interactiveMode() {
  console.log(`\n${colors.bold}${colors.cyan}`);
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║       Skill Configurator Onboarding 测试向导                    ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log(`${colors.reset}`);

  const config = {
    agentApps: [],
    role: '',
    baseSkills: [],
    useCase: '',
    infoSources: '',
    reportRules: '',
    credentials: {},
  };

  // Step 1: Select Agent Apps
  printStep('1/7', '选择目标 Agent 应用');
  console.log('选择你想要配置的 Agent 应用（可多选）：\n');
  const agentAppOptions = Object.entries(AGENT_APP_PRESETS).map(([key, preset]) => ({
    value: key,
    label: `${preset.name} - ${preset.description}`,
  }));
  config.agentApps = await multiSelect('请选择目标 Agent 应用:', agentAppOptions);
  const selectedAppNames = config.agentApps.map((k) => AGENT_APP_PRESETS[k].name).join(', ');
  printSuccess(`已选择 Agent 应用: ${selectedAppNames}`);

  // Step 2: Select Role
  printStep('2/7', '选择岗位');
  const roleOptions = Object.entries(ROLE_PRESETS).map(([key, preset]) => ({
    value: key,
    label: `${preset.name} (${key})`,
  }));
  const selectedRoleKey = await selectOption('请选择你的岗位:', roleOptions);
  const rolePreset = ROLE_PRESETS[selectedRoleKey];
  config.role = rolePreset.name;
  const availableUseCases = rolePreset.useCases;
  printSuccess(`已选择岗位: ${rolePreset.name}`);

  // Step 3: Select Tools
  printStep('3/7', '选择基础工具');
  const toolOptions = Object.entries(TOOL_PRESETS)
    .filter(([key]) => key !== 'full-stack')
    .map(([key, preset]) => ({
      value: key,
      label: preset.name,
    }));
  const selectedTools = await multiSelect('请选择要使用的基础工具:', toolOptions);
  config.baseSkills = selectedTools;
  printSuccess(`已选择工具: ${selectedTools.map((t) => TOOL_PRESETS[t].name).join(', ')}`);

  // Step 4: Select Use Case
  printStep('4/7', '选择岗位用例');
  if (availableUseCases.length === 1) {
    config.useCase = availableUseCases[0];
    printSuccess(`该岗位只有一个用例: ${config.useCase}`);
  } else {
    const useCaseOptions = availableUseCases.map((uc) => ({ value: uc, label: uc }));
    config.useCase = await selectOption('请选择要使用的岗位用例:', useCaseOptions);
    printSuccess(`已选择用例: ${config.useCase}`);
  }

  // Step 5: Enter Info Sources
  printStep('5/7', '输入基础信息来源');
  console.log('请描述你的基础信息来源，例如：');
  console.log(`${colors.yellow}  Jira 项目看板、Confluence 项目主页、销售易商机页、例会纪要目录${colors.reset}\n`);
  config.infoSources = await question('基础信息来源');
  printSuccess('已设置信息来源');

  // Step 6: Enter Rules
  printStep('6/7', '输入用例规则或模板');
  console.log('如果这个用例在公司内部有模板、规则、语气或输出要求，可以写在这里。');
  console.log(`${colors.yellow}  例如：采用固定模板，先风险后里程碑，没有更新也要写明阻塞项。${colors.reset}\n`);
  config.reportRules = await question('用例规则或模板 (可选，回车跳过)', '');
  if (config.reportRules) {
    printSuccess('已设置用例规则');
  } else {
    console.log(`${colors.yellow}跳过，后续可在 Skill 中补充${colors.reset}`);
  }

  // Step 7: Enter Credentials
  printStep('7/7', '输入账号凭证');
  console.log('请为所选工具提供账号信息：\n');

  for (const toolKey of selectedTools) {
    const preset = TOOL_PRESETS[toolKey];
    console.log(`${colors.bold}${preset.name}:${colors.reset}`);

    for (const credKey of Object.keys(preset.credentials)) {
      const label = credKey.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
      if (credKey.toLowerCase().includes('password') || credKey.toLowerCase().includes('token')) {
        config.credentials[credKey] = await questionHidden(`  ${label}`);
      } else {
        config.credentials[credKey] = await question(`  ${label}`, preset.credentials[credKey]);
      }
    }
    console.log('');
  }
  printSuccess('已设置所有凭证');

  // Show summary
  console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bold}  配置摘要${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  console.log(`  ${colors.bold}Agent 应用:${colors.reset}  ${config.agentApps.map((k) => AGENT_APP_PRESETS[k]?.name || k).join(', ')}`);
  console.log(`  ${colors.bold}岗位:${colors.reset}        ${config.role}`);
  console.log(`  ${colors.bold}用例:${colors.reset}        ${config.useCase}`);
  console.log(`  ${colors.bold}基础工具:${colors.reset}    ${config.baseSkills.map((t) => TOOL_PRESETS[t]?.name || t).join(', ')}`);
  console.log(`  ${colors.bold}信息来源:${colors.reset}    ${config.infoSources}`);
  if (config.reportRules) {
    console.log(`  ${colors.bold}用例规则:${colors.reset}    ${config.reportRules}`);
  }

  console.log(`\n  ${colors.bold}凭证信息:${colors.reset}`);
  for (const toolKey of selectedTools) {
    const preset = TOOL_PRESETS[toolKey];
    console.log(`    ${preset.name}:`);
    for (const credKey of Object.keys(preset.credentials)) {
      const label = credKey.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
      if (credKey.toLowerCase().includes('password') || credKey.toLowerCase().includes('token')) {
        console.log(`      ${label}: ******`);
      } else {
        console.log(`      ${label}: ${config.credentials[credKey]}`);
      }
    }
  }

  console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  // Confirm
  const confirm = await question('确认执行测试? [Y/n]', 'Y');
  if (confirm.toLowerCase() === 'n') {
    console.log(`\n${colors.yellow}已取消${colors.reset}`);
    rl.close();
    process.exit(0);
  }

  rl.close();

  return {
    headless: true,
    buildSkill: false,
    config,
    outputDir: './test-output',
  };
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  // Check if no meaningful arguments (interactive mode)
  const hasOptions = args.some(
    (arg) =>
      arg === '--role' ||
      arg === '--tools' ||
      arg === '--config' ||
      arg === '--use-case' ||
      arg === '--help' ||
      arg === '--list-presets'
  );

  let options;

  if (!hasOptions && args.length === 0) {
    // Interactive mode
    options = await interactiveMode();
  } else {
    // Command line mode
    options = parseArgs();
  }

  console.log('\n🧪 Skill Configurator Onboarding E2E Test');
  console.log('========================================\n');
  console.log(`Mode: ${options.headless ? 'Headless' : 'Headed'}`);
  console.log(`Build Skill: ${options.buildSkill || false}`);
  console.log(`Output: ${options.outputDir}`);
  console.log('');

  const tester = new OnboardingTester(options);
  const success = await tester.run();

  process.exit(success ? 0 : 1);
}

main();
