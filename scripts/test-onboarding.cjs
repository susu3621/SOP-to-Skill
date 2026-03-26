#!/usr/bin/env node
/**
 * Skill Configurator Onboarding E2E Test Script
 *
 * Uses shared configuration from src/shared/config.json
 *
 * Usage:
 *   node scripts/test-onboarding.cjs [options]
 *   node scripts/test-onboarding.cjs              # Interactive mode
 *   node scripts/test-onboarding.cjs --headed    # With browser UI
 *   node scripts/test-onboarding.cjs --help      # Show help
 */

const fs = require('fs');
const path = require('path');
const { parseOnboardingArgs } = require('./lib/onboarding-options.cjs');
const { createPromptSession } = require('./lib/prompt-session.cjs');
const { generateSkillArtifacts, writeSkillArtifacts } = require('./lib/skill-generator.cjs');

// Load shared configuration
const SHARED_CONFIG_PATH = path.resolve(__dirname, '../src/shared/config.json');
let sharedConfig;

try {
  sharedConfig = JSON.parse(fs.readFileSync(SHARED_CONFIG_PATH, 'utf8'));
} catch (e) {
  console.error('Error: Could not load shared configuration from', SHARED_CONFIG_PATH);
  console.error('Make sure you run this script from the project root directory.');
  process.exit(1);
}

// Helper to get config values
const config = {
  agentApps: sharedConfig.agentApps,
  roles: sharedConfig.roles,
  baseSkills: sharedConfig.baseSkills,
  useCases: sharedConfig.useCases,
  testDefaults: sharedConfig.testDefaults,
};

// Colors for terminal output
const colors = {
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  bold: '\x1b[1m',
  reset: '\x1b[0m',
};

// Early exit handlers (before loading playwright)
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
  --local-only      Skip browser and only generate local skill artifacts
  --config <file>   Load test configuration from JSON file
  --output <dir>    Output directory for results (default: ./test-output)
  --list-presets    List available presets
  --help            Show this help message

Interactive Mode:
  Run without options to use the step-by-step wizard.

Examples:
  node scripts/test-onboarding.cjs                    # Interactive mode
  node scripts/test-onboarding.cjs --headed           # Interactive with browser
  node scripts/test-onboarding.cjs --build-skill      # Generate skill file
  node scripts/test-onboarding.cjs --local-only --role project-manager
`);
  process.exit(0);
}

if (args.includes('--list-presets')) {
  console.log('\n可用的 Agent 应用:\n');
  for (const [key, app] of Object.entries(config.agentApps)) {
    console.log(`  ${key.padEnd(15)} - ${app.name}`);
  }

  console.log('\n可用的岗位预设:\n');
  for (const [key, role] of Object.entries(config.roles)) {
    console.log(`  ${key.padEnd(20)} - ${role.name}`);
    console.log(`                       用例: ${role.useCases.join(', ')}`);
  }

  console.log('\n可用的基础工具:\n');
  for (const [key, skill] of Object.entries(config.baseSkills)) {
    console.log(`  ${key.padEnd(15)} - ${skill.name}`);
  }

  console.log('\n可用的用例:\n');
  for (const [key, useCase] of Object.entries(config.useCases)) {
    console.log(`  ${key.padEnd(15)} - ${useCase.description}`);
  }
  console.log('');
  process.exit(0);
}

// ============================================================
// Interactive Mode Functions
// ============================================================

const prompts = createPromptSession();
const { question, questionHidden } = prompts;

async function selectOption(prompt, options) {
  console.log(`\n${colors.cyan}${prompt}${colors.reset}\n`);
  options.forEach((opt, idx) => {
    console.log(`  ${(idx + 1).toString().padStart(2)}) ${opt.label}`);
  });
  console.log('');

  while (true) {
    const answer = await question(`请选择 [1-${options.length}]`);
    const num = parseInt(answer.trim(), 10);

    if (num >= 1 && num <= options.length) {
      return options[num - 1].value;
    }

    console.log('无效选择，请重新输入');
  }
}

async function multiSelect(prompt, options) {
  const selected = new Set();

  console.log(`\n${colors.cyan}${prompt}${colors.reset}`);
  console.log(`${colors.yellow}  (可多选，输入数字选择/取消，输入 0 完成)${colors.reset}\n`);

  options.forEach((opt, idx) => {
    console.log(`  ${(idx + 1).toString().padStart(2)}) ${opt.label}`);
  });
  console.log('');

  while (true) {
    if (selected.size > 0) {
      const selectedLabels = options
        .filter((opt) => selected.has(opt.value))
        .map((opt) => opt.label);
      console.log(`${colors.yellow}当前选择: ${selectedLabels.join(', ')}${colors.reset}`);
    }

    const answer = await question(`选择 [1-${options.length}, 0=完成]`);
    const num = parseInt(answer.trim(), 10);

    if (num === 0) {
      if (selected.size === 0) {
        console.log('请至少选择一个选项');
        continue;
      }
      return Array.from(selected);
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
      continue;
    }

    console.log('无效选择');
  }
}

function printStep(step, title) {
  console.log(`\n${colors.cyan}${colors.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bold}  Step ${step}: ${title}${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
}

function printSuccess(msg) {
  console.log(`${colors.green}✓ ${msg}${colors.reset}`);
}

async function interactiveMode() {
  console.log(`\n${colors.bold}${colors.cyan}`);
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║       Skill Configurator Onboarding 测试向导                    ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log(`${colors.reset}`);

  const testConfig = {
    agentApps: [],
    roleKey: '',
    role: '',
    baseSkills: [],
    useCase: '',
    infoSources: '',
    reportRules: '',
    credentials: {},
  };

  // Step 1: Select Agent Apps
  printStep('1/7', '选择目标 Agent 应用');
  const agentAppOptions = Object.entries(config.agentApps).map(([key, app]) => ({
    value: key,
    label: `${app.name} - ${app.description}`,
  }));
  testConfig.agentApps = await multiSelect('请选择目标 Agent 应用:', agentAppOptions);
  printSuccess(`已选择: ${testConfig.agentApps.map((k) => config.agentApps[k].name).join(', ')}`);

  // Step 2: Select Role
  printStep('2/7', '选择岗位');
  const roleOptions = Object.entries(config.roles).map(([key, role]) => ({
    value: key,
    label: `${role.name} - ${role.description}`,
  }));
  testConfig.roleKey = await selectOption('请选择你的岗位:', roleOptions);
  testConfig.role = config.roles[testConfig.roleKey].name;
  const roleUseCases = config.roles[testConfig.roleKey].useCases;
  printSuccess(`已选择岗位: ${testConfig.role}`);

  // Step 3: Select Base Skills
  printStep('3/7', '选择基础工具');
  const skillOptions = Object.entries(config.baseSkills).map(([key, skill]) => ({
    value: key,
    label: `${skill.name} - ${skill.description}`,
  }));
  testConfig.baseSkills = await multiSelect('请选择要使用的基础工具:', skillOptions);
  printSuccess(`已选择工具: ${testConfig.baseSkills.map((k) => config.baseSkills[k].name).join(', ')}`);

  // Step 4: Select Use Case
  printStep('4/7', '选择岗位用例');
  if (roleUseCases.length === 1) {
    testConfig.useCase = roleUseCases[0];
    printSuccess(`该岗位只有一个用例: ${testConfig.useCase}`);
  } else {
    const useCaseOptions = roleUseCases.map((uc) => ({
      value: uc,
      label: `${uc} - ${config.useCases[uc]?.description || ''}`,
    }));
    testConfig.useCase = await selectOption('请选择要使用的岗位用例:', useCaseOptions);
    printSuccess(`已选择用例: ${testConfig.useCase}`);
  }

  // Step 5: Enter Info Sources
  printStep('5/7', '输入基础信息来源');
  console.log('请描述你的基础信息来源，例如：');
  console.log(`${colors.yellow}  Jira 项目看板、Confluence 项目主页、例会纪要目录${colors.reset}\n`);
  testConfig.infoSources = await question('基础信息来源', config.testDefaults.infoSources);
  printSuccess('已设置信息来源');

  // Step 6: Enter Rules
  printStep('6/7', '输入用例规则或模板');
  console.log('如果这个用例在公司内部有模板、规则、语气或输出要求，可以写在这里。');
  console.log(`${colors.yellow}  例如：采用固定模板，先风险后里程碑，没有更新也要写明阻塞项。${colors.reset}\n`);
  testConfig.reportRules = await question('用例规则或模板 (可选，回车跳过)', config.testDefaults.reportRules);
  if (testConfig.reportRules) {
    printSuccess('已设置用例规则');
  } else {
    console.log(`${colors.yellow}跳过${colors.reset}`);
  }

  // Step 7: Enter Credentials
  printStep('7/7', '输入账号凭证');
  console.log('请为所选工具提供账号信息：\n');

  for (const skillKey of testConfig.baseSkills) {
    const skill = config.baseSkills[skillKey];
    console.log(`${colors.bold}${skill.name}:${colors.reset}`);

    for (const [credKey, cred] of Object.entries(skill.credentials)) {
      if (cred.type === 'password') {
        testConfig.credentials[credKey] = await questionHidden(`  ${cred.label}`);
      } else {
        testConfig.credentials[credKey] = await question(`  ${cred.label}`, cred.placeholder);
      }
    }
    console.log('');
  }
  printSuccess('已设置所有凭证');

  // Show summary
  console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bold}  配置摘要${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  console.log(`  ${colors.bold}Agent 应用:${colors.reset}  ${testConfig.agentApps.map((k) => config.agentApps[k].name).join(', ')}`);
  console.log(`  ${colors.bold}岗位:${colors.reset}        ${testConfig.role}`);
  console.log(`  ${colors.bold}用例:${colors.reset}        ${testConfig.useCase}`);
  console.log(`  ${colors.bold}基础工具:${colors.reset}    ${testConfig.baseSkills.map((k) => config.baseSkills[k].name).join(', ')}`);
  console.log(`  ${colors.bold}信息来源:${colors.reset}    ${testConfig.infoSources}`);
  if (testConfig.reportRules) {
    console.log(`  ${colors.bold}用例规则:${colors.reset}    ${testConfig.reportRules}`);
  }

  console.log(`\n  ${colors.bold}凭证信息:${colors.reset}`);
  for (const skillKey of testConfig.baseSkills) {
    const skill = config.baseSkills[skillKey];
    console.log(`    ${skill.name}:`);
    for (const [credKey, cred] of Object.entries(skill.credentials)) {
      const displayValue = cred.type === 'password' ? '******' : testConfig.credentials[credKey];
      console.log(`      ${cred.label}: ${displayValue}`);
    }
  }

  console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  // Confirm
  const confirm = await question('确认执行测试? [Y/n]', 'Y');
  if (confirm.toLowerCase() === 'n') {
    console.log(`\n${colors.yellow}已取消${colors.reset}`);
    prompts.close();
    process.exit(0);
  }

  prompts.close();

  return testConfig;
}

// ============================================================
// Test Runner
// ============================================================

class OnboardingTester {
  constructor(options = {}) {
    this.headless = options.headless !== false;
    this.buildSkill = options.buildSkill || false;
    this.config = options.config;
    this.localOnly = options.localOnly || false;
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

  async runTest() {
    const cfg = this.config;

    // Step 1: Select Agent Apps
    console.log('\n📝 Step 1: Selecting Agent Apps...');
    for (const app of cfg.agentApps) {
      const label = config.agentApps[app]?.name || app;
      await this.page.getByLabel(label, { exact: false }).check();
      console.log(`  ✓ Selected: ${label}`);
    }
    await this.clickNext();

    // Step 2: Select Role
    console.log('\n📝 Step 2: Selecting Role...');
    await this.page.getByLabel(cfg.role).check();
    console.log(`  ✓ Selected role: ${cfg.role}`);
    await this.clickNext();

    // Step 3: Select Base Skills
    console.log('\n📝 Step 3: Selecting Base Skills...');
    for (const skill of cfg.baseSkills) {
      const label = config.baseSkills[skill]?.name || skill;
      await this.page.getByLabel(label, { exact: false }).check();
      console.log(`  ✓ Selected: ${label}`);
    }
    await this.clickNext();

    // Step 4: Select Use Case
    console.log('\n📝 Step 4: Selecting Use Case...');
    await this.page.getByLabel(cfg.useCase).check();
    console.log(`  ✓ Selected use case: ${cfg.useCase}`);
    await this.clickNext();

    // Step 5: Enter Info Sources
    console.log('\n📝 Step 5: Entering Info Sources...');
    await this.page.getByLabel('基础信息来源').fill(cfg.infoSources);
    console.log(`  ✓ Entered info sources`);
    await this.clickNext();

    // Step 6: Enter Report Rules
    console.log('\n📝 Step 6: Entering Report Rules...');
    await this.page.getByLabel('用例规则或模板').fill(cfg.reportRules || '');
    console.log(`  ✓ Entered report rules`);
    await this.clickNext();

    // Step 7: Enter Credentials
    console.log('\n📝 Step 7: Entering Credentials...');
    for (const skill of cfg.baseSkills) {
      const skillConfig = config.baseSkills[skill];
      if (!skillConfig?.credentials) continue;

      for (const [credKey, cred] of Object.entries(skillConfig.credentials)) {
        if (cfg.credentials[credKey]) {
          try {
            await this.page.getByLabel(cred.label).fill(cfg.credentials[credKey]);
            console.log(`  ✓ Entered: ${cred.label}`);
          } catch (e) {
            console.log(`  ⚠ Field not found: ${cred.label}`);
          }
        }
      }
    }
    await this.clickNext();

    // Step 8: Verify Completion
    console.log('\n📝 Step 8: Verifying Completion...');
    await this.page.waitForSelector('h2:has-text("设置完成")', { timeout: 10000 });
    console.log('  ✓ Completion screen displayed');

    // Verify summary shows correct values
    const roleVisible = await this.page.isVisible(`text=${cfg.role}`);
    if (roleVisible) {
      console.log(`  ✓ Role "${cfg.role}" displayed in summary`);
    }

    console.log('\n✅ All tests passed!\n');
    return true;
  }

  async clickNext() {
    await this.page.getByRole('button', { name: /下一步|完成设置/ }).click();
    await this.page.waitForTimeout(500);
  }

  async run() {
    try {
      await this.init();
      await this.navigate();
      await this.runTest();

      if (this.buildSkill) {
        this.generateSkillConfig();
      }

      return true;
    } catch (error) {
      console.error('\n❌ Test failed:', error.message);
      return false;
    } finally {
      await this.cleanup();
    }
  }

  generateSkillConfig() {
    const cfg = this.config;
    const result = generateSkillArtifacts(
      {
        ...cfg,
        localOnly: this.localOnly,
        outputDir: this.outputDir,
      },
      config
    );

    writeSkillArtifacts(result);

    console.log(`\n🔨 Skill configuration generated:`);
    console.log(`  ✓ ${result.skillJsonPath}`);
    console.log(`  ✓ ${result.skillMdPath}`);
  }

  ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }
}

// ============================================================
// Main
// ============================================================

async function main() {
  let testConfig;
  const { buildSkill, hasOptions, headless, localOnly, outputDir } = parseOnboardingArgs(args);

  if (!hasOptions && args.filter((a) => !a.startsWith('--')).length === 0) {
    // Interactive mode
    testConfig = await interactiveMode();
  } else {
    // Command line mode - use defaults
      testConfig = {
        agentApps: config.testDefaults.agentApps,
        roleKey: config.testDefaults.role,
        role: config.roles[config.testDefaults.role].name,
      baseSkills: config.testDefaults.baseSkills,
      useCase: config.testDefaults.useCase,
      infoSources: config.testDefaults.infoSources,
      reportRules: config.testDefaults.reportRules,
      credentials: {},
    };

    // Collect credentials from command line or prompt
    console.log('\n使用默认配置进行测试...');
    console.log(`  岗位: ${testConfig.role}`);
    console.log(`  用例: ${testConfig.useCase}`);
    console.log(`  工具: ${testConfig.baseSkills.join(', ')}`);
    console.log('');

    // Prompt for credentials
    for (const skillKey of testConfig.baseSkills) {
      const skill = config.baseSkills[skillKey];
      console.log(`${colors.bold}${skill.name}:${colors.reset}`);

      for (const [credKey, cred] of Object.entries(skill.credentials)) {
        if (cred.type === 'password') {
          testConfig.credentials[credKey] = await questionHidden(`  ${cred.label}`);
        } else {
          testConfig.credentials[credKey] = await question(`  ${cred.label}`, cred.placeholder);
        }
      }
      console.log('');
    }
    prompts.close();
  }

  console.log('\n🧪 Skill Configurator Onboarding E2E Test');
  console.log('========================================\n');
  console.log(`Mode: ${headless ? 'Headless' : 'Headed'}`);
  console.log(`Build Skill: ${buildSkill}`);
  console.log(`Local Only: ${localOnly}`);
  console.log(`Output: ${outputDir}`);
  console.log('');

  const tester = new OnboardingTester({
    headless,
    buildSkill,
    config: testConfig,
    localOnly,
    outputDir,
  });

  if (localOnly) {
    tester.ensureOutputDir();
    if (buildSkill) {
      tester.generateSkillConfig();
    }
    console.log('\n✅ Local skill generation completed.\n');
    process.exit(0);
  }

  const success = await tester.run();
  process.exit(success ? 0 : 1);
}

main();
