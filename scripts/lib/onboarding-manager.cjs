const { execFileSync } = require('child_process');
const path = require('path');
const { createPromptSession } = require('./prompt-session.cjs');
const {
  createOnboardingConfigStore,
  requireHomeDirectory,
  resolveDefaultStorageDir,
} = require('./onboarding-config-store.cjs');

const colors = {
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m',
};

function parseManagerArgs(args) {
  let help = false;
  let storageDir = null;

  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];

    if (current === '--help') {
      help = true;
      continue;
    }

    if (current === '--storage-dir') {
      const nextValue = args[index + 1];
      if (!nextValue) {
        throw new Error('参数 --storage-dir 缺少目录值。');
      }
      storageDir = nextValue;
      index += 1;
      continue;
    }

    throw new Error(`不支持的参数: ${current}`);
  }

  return {
    help,
    storageDir,
  };
}

function getDefaultInstallRoot(agentType, homeDir = requireHomeDirectory()) {
  if (agentType === 'codex') {
    return path.join(homeDir, '.codex', 'skills');
  }

  if (agentType === 'claude-code') {
    return path.join(homeDir, '.claude', 'skills');
  }

  throw new Error(`不支持的 agent 类型: ${agentType}`);
}

function buildOverviewSnapshot(input) {
  const installedSkillCount = input.agents.reduce(
    (total, agent) => total + agent.installedSkillIds.length,
    0
  );

  return {
    lines: [
      `配置目录: ${input.storageDir}`,
      `岗位数: ${input.roles.length}`,
      `基础技能数: ${input.baseSkills.length}`,
      `用例数: ${input.useCases.length}`,
      `Agent 数: ${input.agents.length}`,
      `已安装技能总数: ${installedSkillCount}`,
    ],
  };
}

function renderHelp() {
  return `Skill Configurator Onboarding Config Manager

用法:
  node scripts/test-onboarding.cjs
  node scripts/test-onboarding.cjs --storage-dir <dir>
  node scripts/test-onboarding.cjs --help

说明:
  默认配置目录: ${resolveDefaultStorageDir()}
  入口模块:
    1. 基础信息设置
    2. 用例配置
    3. 安装技能
`;
}

function printSection(title) {
  console.log(`\n${colors.cyan}${colors.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bold}${title}${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
}

function printSuccess(message) {
  console.log(`${colors.green}✓ ${message}${colors.reset}`);
}

function printWarning(message) {
  console.log(`${colors.yellow}! ${message}${colors.reset}`);
}

function printError(message) {
  console.log(`${colors.red}✗ ${message}${colors.reset}`);
}

async function pause(question) {
  await question('按回车继续');
}

async function selectOption(question, prompt, options) {
  console.log(`\n${colors.cyan}${prompt}${colors.reset}\n`);
  options.forEach((option, index) => {
    console.log(`  ${(index + 1).toString().padStart(2)}) ${option.label}`);
  });
  console.log('');

  while (true) {
    const answer = await question(`请选择 [1-${options.length}]`);
    const selected = Number.parseInt(answer, 10);

    if (selected >= 1 && selected <= options.length) {
      return options[selected - 1].value;
    }

    printWarning('无效选择，请重新输入。');
  }
}

async function multiSelect(question, prompt, options, selectedValues = [], allowEmpty = true) {
  if (options.length === 0) {
    return [];
  }

  const selected = new Set(selectedValues);

  console.log(`\n${colors.cyan}${prompt}${colors.reset}`);
  console.log(`${colors.yellow}(输入数字切换选中状态，输入 0 完成)${colors.reset}\n`);

  options.forEach((option, index) => {
    console.log(`  ${(index + 1).toString().padStart(2)}) ${option.label}`);
  });
  console.log('');

  while (true) {
    const currentLabels = options
      .filter((option) => selected.has(option.value))
      .map((option) => option.label);
    console.log(`${colors.yellow}当前选择: ${currentLabels.join(', ') || '无'}${colors.reset}`);

    const answer = await question(`选择 [1-${options.length}, 0=完成]`);
    const selectedIndex = Number.parseInt(answer, 10);

    if (selectedIndex === 0) {
      if (!allowEmpty && selected.size === 0) {
        printWarning('请至少选择一个选项。');
        continue;
      }
      return Array.from(selected);
    }

    if (selectedIndex >= 1 && selectedIndex <= options.length) {
      const target = options[selectedIndex - 1];
      if (selected.has(target.value)) {
        selected.delete(target.value);
      } else {
        selected.add(target.value);
      }
      continue;
    }

    printWarning('无效选择，请重新输入。');
  }
}

async function confirm(question, prompt, defaultValue = 'Y') {
  const answer = await question(`${prompt} [${defaultValue}/n]`, defaultValue);
  return answer.trim().toLowerCase() !== 'n';
}

function printList(title, items, formatter) {
  printSection(title);
  if (items.length === 0) {
    printWarning('暂无数据。');
    return;
  }

  items.forEach((item, index) => {
    console.log(`  ${index + 1}. ${formatter(item)}`);
  });
}

async function chooseNamedItem(question, title, items) {
  if (items.length === 0) {
    printWarning('暂无可选项。');
    return null;
  }

  return selectOption(
    question,
    title,
    items.map((item) => ({
      label: `${item.name} (${item.id})`,
      value: item.id,
    }))
  );
}

function buildRoleNameMap(store) {
  return new Map(store.listRoles().map((role) => [role.id, role.name]));
}

function buildSkillNameMap(store) {
  return new Map(store.listBaseSkills().map((skill) => [skill.id, skill.name]));
}

function executeSkillScript(scriptName, args) {
  const scriptPath = path.resolve(__dirname, '..', scriptName);
  execFileSync(scriptPath, args, {
    cwd: path.resolve(__dirname, '..', '..'),
    stdio: 'inherit',
  });
}

async function manageRoles(question, store) {
  while (true) {
    const action = await selectOption(question, '岗位管理', [
      { label: '查看岗位列表', value: 'list' },
      { label: '新增岗位', value: 'create' },
      { label: '修改岗位名称', value: 'rename' },
      { label: '删除岗位', value: 'delete' },
      { label: '返回', value: 'back' },
    ]);

    try {
      if (action === 'list') {
        printList('岗位列表', store.listRoles(), (item) => `${item.name} [${item.id}]`);
        await pause(question);
        continue;
      }

      if (action === 'create') {
        const name = await question('岗位名称');
        if (!name) {
          printWarning('岗位名称不能为空。');
          continue;
        }
        const created = store.createRole(name);
        printSuccess(`已新增岗位: ${created.name} (${created.id})`);
        continue;
      }

      if (action === 'rename') {
        const roles = store.listRoles();
        const selectedRoleId = await chooseNamedItem(question, '请选择要修改的岗位', roles);
        if (!selectedRoleId) {
          continue;
        }
        const current = roles.find((item) => item.id === selectedRoleId);
        const nextName = await question('新的岗位名称', current.name);
        if (!nextName) {
          printWarning('岗位名称不能为空。');
          continue;
        }
        store.renameRole(selectedRoleId, nextName);
        printSuccess(`已更新岗位: ${nextName}`);
        continue;
      }

      if (action === 'delete') {
        const roles = store.listRoles();
        const selectedRoleId = await chooseNamedItem(question, '请选择要删除的岗位', roles);
        if (!selectedRoleId) {
          continue;
        }
        const current = roles.find((item) => item.id === selectedRoleId);
        const approved = await confirm(question, `确认删除岗位 "${current.name}"?`);
        if (!approved) {
          printWarning('已取消删除。');
          continue;
        }
        store.deleteRole(selectedRoleId);
        printSuccess(`已删除岗位: ${current.name}`);
        continue;
      }

      return;
    } catch (error) {
      printError(error.message);
      await pause(question);
    }
  }
}

async function manageBaseSkills(question, store) {
  while (true) {
    const action = await selectOption(question, '基础技能管理', [
      { label: '查看基础技能列表', value: 'list' },
      { label: '新增基础技能', value: 'create' },
      { label: '修改基础技能名称', value: 'rename' },
      { label: '删除基础技能', value: 'delete' },
      { label: '返回', value: 'back' },
    ]);

    try {
      if (action === 'list') {
        printList('基础技能列表', store.listBaseSkills(), (item) => `${item.name} [${item.id}]`);
        await pause(question);
        continue;
      }

      if (action === 'create') {
        const name = await question('基础技能名称');
        if (!name) {
          printWarning('基础技能名称不能为空。');
          continue;
        }
        const created = store.createBaseSkill(name);
        printSuccess(`已新增基础技能: ${created.name} (${created.id})`);
        continue;
      }

      if (action === 'rename') {
        const baseSkills = store.listBaseSkills();
        const selectedSkillId = await chooseNamedItem(question, '请选择要修改的基础技能', baseSkills);
        if (!selectedSkillId) {
          continue;
        }
        const current = baseSkills.find((item) => item.id === selectedSkillId);
        const nextName = await question('新的基础技能名称', current.name);
        if (!nextName) {
          printWarning('基础技能名称不能为空。');
          continue;
        }
        store.renameBaseSkill(selectedSkillId, nextName);
        printSuccess(`已更新基础技能: ${nextName}`);
        continue;
      }

      if (action === 'delete') {
        const baseSkills = store.listBaseSkills();
        const selectedSkillId = await chooseNamedItem(question, '请选择要删除的基础技能', baseSkills);
        if (!selectedSkillId) {
          continue;
        }
        const current = baseSkills.find((item) => item.id === selectedSkillId);
        const approved = await confirm(question, `确认删除基础技能 "${current.name}"?`);
        if (!approved) {
          printWarning('已取消删除。');
          continue;
        }
        store.deleteBaseSkill(selectedSkillId);
        printSuccess(`已删除基础技能: ${current.name}`);
        continue;
      }

      return;
    } catch (error) {
      printError(error.message);
      await pause(question);
    }
  }
}

async function manageBasicInfo(question, store) {
  while (true) {
    const action = await selectOption(question, '基础信息设置', [
      { label: '岗位管理', value: 'roles' },
      { label: '基础技能管理', value: 'skills' },
      { label: '返回主菜单', value: 'back' },
    ]);

    if (action === 'roles') {
      await manageRoles(question, store);
      continue;
    }

    if (action === 'skills') {
      await manageBaseSkills(question, store);
      continue;
    }

    return;
  }
}

async function promptApplicableRoles(question, store, selectedRoleIds = []) {
  const roles = store.listRoles();
  if (roles.length === 0) {
    printWarning('当前没有岗位，用例将保存为空岗位绑定。');
    return [];
  }

  return multiSelect(
    question,
    '请选择适用岗位',
    roles.map((role) => ({
      label: `${role.name} (${role.id})`,
      value: role.id,
    })),
    selectedRoleIds,
    true
  );
}

async function manageUseCases(question, store) {
  while (true) {
    const action = await selectOption(question, '用例配置', [
      { label: '查看用例列表', value: 'list' },
      { label: '新增用例', value: 'create' },
      { label: '修改用例', value: 'edit' },
      { label: '删除用例', value: 'delete' },
      { label: '返回主菜单', value: 'back' },
    ]);

    try {
      if (action === 'list') {
        const roleNames = buildRoleNameMap(store);
        printList('用例列表', store.listUseCases(), (useCase) => {
          const applicableRoles = useCase.applicableRoleIds
            .map((roleId) => roleNames.get(roleId) || roleId)
            .join(', ');
          return `${useCase.name} [${useCase.id}] 适用岗位: ${applicableRoles || '未设置'}`;
        });
        await pause(question);
        continue;
      }

      if (action === 'create') {
        const name = await question('用例名称');
        if (!name) {
          printWarning('用例名称不能为空。');
          continue;
        }
        const description = await question('用例描述');
        const infoSources = await question('信息来源');
        const rules = await question('规则');
        const applicableRoleIds = await promptApplicableRoles(question, store, []);
        const created = store.upsertUseCase({
          applicableRoleIds,
          description,
          infoSources,
          name,
          rules,
        });
        printSuccess(`已新增用例: ${created.name} (${created.id})`);
        continue;
      }

      if (action === 'edit') {
        const useCases = store.listUseCases();
        const selectedUseCaseId = await chooseNamedItem(question, '请选择要修改的用例', useCases);
        if (!selectedUseCaseId) {
          continue;
        }
        const current = useCases.find((item) => item.id === selectedUseCaseId);
        const nextName = await question('用例名称', current.name);
        const nextDescription = await question('用例描述', current.description);
        const nextInfoSources = await question('信息来源', current.infoSources);
        const nextRules = await question('规则', current.rules);
        const applicableRoleIds = await promptApplicableRoles(question, store, current.applicableRoleIds);
        const updated = store.upsertUseCase({
          applicableRoleIds,
          description: nextDescription,
          id: current.id,
          infoSources: nextInfoSources,
          name: nextName,
          rules: nextRules,
        });
        printSuccess(`已更新用例: ${updated.name}`);
        continue;
      }

      if (action === 'delete') {
        const useCases = store.listUseCases();
        const selectedUseCaseId = await chooseNamedItem(question, '请选择要删除的用例', useCases);
        if (!selectedUseCaseId) {
          continue;
        }
        const current = useCases.find((item) => item.id === selectedUseCaseId);
        const approved = await confirm(question, `确认删除用例 "${current.name}"?`);
        if (!approved) {
          printWarning('已取消删除。');
          continue;
        }
        store.deleteUseCase(selectedUseCaseId);
        printSuccess(`已删除用例: ${current.name}`);
        continue;
      }

      return;
    } catch (error) {
      printError(error.message);
      await pause(question);
    }
  }
}

function formatAgent(agent, store) {
  const skillNames = buildSkillNameMap(store);
  const installedLabels = agent.installedSkillIds.map((skillId) => skillNames.get(skillId) || skillId);
  return `${agent.name} [${agent.id}] type=${agent.type} root=${agent.installRoot} 已装技能: ${
    installedLabels.join(', ') || '无'
  }`;
}

async function createAgent(question, store) {
  const type = await selectOption(question, '请选择 agent 类型', [
    { label: 'Codex', value: 'codex' },
    { label: 'Claude Code', value: 'claude-code' },
  ]);
  const defaultName = type === 'codex' ? 'Codex' : 'Claude Code';
  const name = await question('Agent 名称', defaultName);
  const installRoot = await question('技能安装目录', getDefaultInstallRoot(type));

  if (!name || !installRoot) {
    throw new Error('Agent 名称和技能安装目录不能为空。');
  }

  const created = store.createAgent({
    installRoot,
    name,
    type,
  });

  printSuccess(`已新增 agent: ${created.name} (${created.id})`);
}

async function editAgent(question, store) {
  const agents = store.listAgents();
  const selectedAgentId = await chooseNamedItem(question, '请选择要修改的 agent', agents);
  if (!selectedAgentId) {
    return;
  }

  const current = agents.find((item) => item.id === selectedAgentId);
  const nextName = await question('Agent 名称', current.name);
  const nextInstallRoot = await question('技能安装目录', current.installRoot);

  if (!nextName || !nextInstallRoot) {
    throw new Error('Agent 名称和技能安装目录不能为空。');
  }

  const updated = store.updateAgent(selectedAgentId, {
    installRoot: nextInstallRoot,
    name: nextName,
  });
  printSuccess(`已更新 agent: ${updated.name}`);
}

async function deleteAgent(question, store) {
  const agents = store.listAgents();
  const selectedAgentId = await chooseNamedItem(question, '请选择要删除的 agent', agents);
  if (!selectedAgentId) {
    return;
  }

  const current = agents.find((item) => item.id === selectedAgentId);
  const approved = await confirm(question, `确认删除 agent "${current.name}"?`);
  if (!approved) {
    printWarning('已取消删除。');
    return;
  }

  store.deleteAgent(selectedAgentId);
  printSuccess(`已删除 agent: ${current.name}`);
}

async function updateAgentSkills(question, store) {
  const agents = store.listAgents();
  const selectedAgentId = await chooseNamedItem(question, '请选择要维护的 agent', agents);
  if (!selectedAgentId) {
    return;
  }

  const agent = store.getAgent(selectedAgentId);
  const baseSkills = store.listBaseSkills();
  if (baseSkills.length === 0) {
    printWarning('当前没有基础技能可供安装。');
    await pause(question);
    return;
  }

  const nextSkillIds = await multiSelect(
    question,
    `维护 ${agent.name} 的已安装技能`,
    baseSkills.map((skill) => ({
      label: `${skill.name} (${skill.id})`,
      value: skill.id,
    })),
    agent.installedSkillIds,
    true
  );

  const currentSkillIds = new Set(agent.installedSkillIds);
  const desiredSkillIds = new Set(nextSkillIds);
  const removedSkillIds = agent.installedSkillIds.filter((skillId) => !desiredSkillIds.has(skillId));
  const addedSkillIds = nextSkillIds.filter((skillId) => !currentSkillIds.has(skillId));

  if (removedSkillIds.length === 0 && addedSkillIds.length === 0) {
    printWarning('安装列表未发生变化。');
    return;
  }

  const appliedSkillIds = new Set(agent.installedSkillIds);

  for (const skillId of removedSkillIds) {
    executeSkillScript('uninstall-skill.sh', [skillId, agent.type, agent.installRoot]);
    appliedSkillIds.delete(skillId);
    store.setAgentInstalledSkills(agent.id, Array.from(appliedSkillIds));
    printSuccess(`已卸载技能: ${skillId}`);
  }

  for (const skillId of addedSkillIds) {
    executeSkillScript('install-skill.sh', [skillId, agent.type, agent.installRoot]);
    appliedSkillIds.add(skillId);
    store.setAgentInstalledSkills(agent.id, Array.from(appliedSkillIds));
    printSuccess(`已安装技能: ${skillId}`);
  }
}

async function manageInstallations(question, store) {
  while (true) {
    const action = await selectOption(question, '安装技能', [
      { label: '查看 agent 列表', value: 'list' },
      { label: '新增 agent', value: 'create' },
      { label: '修改 agent', value: 'edit' },
      { label: '删除 agent', value: 'delete' },
      { label: '维护已安装技能', value: 'skills' },
      { label: '返回主菜单', value: 'back' },
    ]);

    try {
      if (action === 'list') {
        printList('Agent 列表', store.listAgents(), (agent) => formatAgent(agent, store));
        await pause(question);
        continue;
      }

      if (action === 'create') {
        await createAgent(question, store);
        continue;
      }

      if (action === 'edit') {
        await editAgent(question, store);
        continue;
      }

      if (action === 'delete') {
        await deleteAgent(question, store);
        continue;
      }

      if (action === 'skills') {
        await updateAgentSkills(question, store);
        continue;
      }

      return;
    } catch (error) {
      printError(error.message);
      await pause(question);
    }
  }
}

function printOverview(store) {
  const rawFiles = store.readRawFiles();
  const snapshot = buildOverviewSnapshot({
    agents: rawFiles.installations.agents,
    baseSkills: rawFiles.basicInfo.baseSkills,
    roles: rawFiles.basicInfo.roles,
    storageDir: store.storageDir,
    useCases: rawFiles.useCases.useCases,
  });

  printSection('当前配置总览');
  snapshot.lines.forEach((line) => {
    console.log(`  ${line}`);
  });
}

async function runConfigManager(options) {
  const store = createOnboardingConfigStore({
    sharedConfig: options.sharedConfig,
    storageDir: options.storageDir || resolveDefaultStorageDir(),
  });

  store.initialize();

  const prompts = createPromptSession();
  const { question } = prompts;

  try {
    while (true) {
      printOverview(store);

      const action = await selectOption(question, '主菜单', [
        { label: '基础信息设置', value: 'basic' },
        { label: '用例配置', value: 'useCases' },
        { label: '安装技能', value: 'installations' },
        { label: '退出', value: 'exit' },
      ]);

      if (action === 'basic') {
        await manageBasicInfo(question, store);
        continue;
      }

      if (action === 'useCases') {
        await manageUseCases(question, store);
        continue;
      }

      if (action === 'installations') {
        await manageInstallations(question, store);
        continue;
      }

      console.log('\n已退出配置管理器。');
      return;
    }
  } finally {
    prompts.close();
  }
}

module.exports = {
  buildOverviewSnapshot,
  getDefaultInstallRoot,
  parseManagerArgs,
  renderHelp,
  runConfigManager,
};
