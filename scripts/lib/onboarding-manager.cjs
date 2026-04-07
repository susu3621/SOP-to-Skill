const fs = require('fs');
const { execFileSync } = require('child_process');
const path = require('path');
const { createPromptSession } = require('./prompt-session.cjs');
const {
  generateSkillArtifacts,
  writeSkillArtifacts,
} = require('./skill-generator.cjs');
const {
  getOnboardingGeneratedSkillIds,
} = require('./onboarding-skill-set.cjs');
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
  let forceReinstall = false;
  let help = false;
  let storageDir = null;

  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];

    if (current === '--help') {
      help = true;
      continue;
    }

    if (current === '--force-reinstall') {
      forceReinstall = true;
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
    forceReinstall,
    help,
    storageDir,
  };
}

function collapseHomePath(inputPath, homeDir = requireHomeDirectory()) {
  if (!inputPath) {
    return inputPath;
  }

  const normalizedHomeDir = path.normalize(homeDir);
  const normalizedInputPath = path.normalize(inputPath);

  if (normalizedInputPath === normalizedHomeDir) {
    return '~';
  }

  const homePrefix = `${normalizedHomeDir}${path.sep}`;
  if (normalizedInputPath.startsWith(homePrefix)) {
    return `~${normalizedInputPath.slice(normalizedHomeDir.length)}`;
  }

  return inputPath;
}

function expandHomePath(inputPath, homeDir = requireHomeDirectory()) {
  if (!inputPath) {
    return inputPath;
  }

  if (inputPath === '~') {
    return homeDir;
  }

  if (inputPath.startsWith('~/') || inputPath.startsWith('~\\')) {
    const pathSegments = inputPath.slice(2).split(/[\\/]+/).filter(Boolean);
    return path.join(homeDir, ...pathSegments);
  }

  return inputPath;
}

function getDefaultInstallRoot(agentType, homeDir = requireHomeDirectory()) {
  if (agentType === 'codex') {
    return path.join(homeDir, '.codex', 'skills');
  }

  if (agentType === 'claude-code') {
    return path.join(homeDir, '.claude', 'skills');
  }

  if (agentType === 'workbuddy') {
    return path.join(homeDir, '.workbuddy', 'skills');
  }

  throw new Error(`不支持的 agent 类型: ${agentType}`);
}

function buildOverviewSnapshot(input, homeDir = requireHomeDirectory()) {
  const installedSkillCount = input.agents.reduce(
    (total, agent) => total + agent.installedSkillIds.length,
    0
  );
  const selectedRoleCount = Array.isArray(input.selectedRoleIds) ? input.selectedRoleIds.length : null;
  const selectedBaseSkillCount = Array.isArray(input.selectedBaseSkillIds)
    ? input.selectedBaseSkillIds.length
    : null;

  return {
    lines: [
      `配置目录: ${collapseHomePath(input.storageDir, homeDir)}`,
      `岗位数: ${input.roles.length}`,
      `基础技能数: ${input.baseSkills.length}`,
      `用例数: ${input.useCases.length}`,
      `Agent 数: ${input.agents.length}`,
      `已安装技能总数: ${installedSkillCount}`,
      selectedRoleCount === null ? null : `已选岗位数: ${selectedRoleCount}`,
      selectedBaseSkillCount === null ? null : `已选基础技能数: ${selectedBaseSkillCount}`,
    ].filter(Boolean),
  };
}

function renderHelp(homeDir = requireHomeDirectory()) {
  const defaultStorageDir = path.join(homeDir, '.skills-for-no-engineer', 'onboarding');

  return `SOP to Skill Onboarding Config Manager

用法:
  node scripts/test-onboarding.cjs
  node scripts/test-onboarding.cjs --storage-dir <dir>
  node scripts/test-onboarding.cjs --force-reinstall
  node scripts/test-onboarding.cjs --help

说明:
  默认配置目录: ${collapseHomePath(defaultStorageDir, homeDir)}
  安装阶段可使用 --force-reinstall 先卸载已记录技能，再按当前配置全量重装
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

function writeJsonFileAtomic(filePath, payload) {
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  fs.renameSync(tempPath, filePath);
}

function getBasicInfoMenuOptions() {
  return [
    { label: '选择岗位', value: 'selectRoles' },
    { label: '选择基础技能', value: 'selectBaseSkills' },
    { label: '返回主菜单', value: 'back' },
  ];
}

function getUseCaseMenuOptions() {
  return [
    { label: '按岗位选择并编辑用例', value: 'edit' },
    { label: '返回主菜单', value: 'back' },
  ];
}

function getInstallationMenuOptions() {
  return [
    { label: '选择共享安装目标和技能并同步', value: 'apply' },
    { label: '返回主菜单', value: 'back' },
  ];
}

function getUseCaseEditContext(selectedRoles) {
  if (!selectedRoles || selectedRoles.length === 0) {
    return {
      status: 'blocked',
      message: '请先进入基础信息设置并选择岗位，然后再配置用例。',
    };
  }

  return {
    status: 'ready',
    role: selectedRoles[0],
  };
}

function getRoleScopedUseCases(useCases, roleId) {
  return useCases.filter((useCase) => useCase.applicableRoleIds.includes(roleId));
}

function getUseCaseDirectory(useCaseName, sharedConfig) {
  const useCaseDirectory = sharedConfig.useCases?.[useCaseName]?.directory;
  if (!useCaseDirectory) {
    throw new Error(`未找到用例目录映射: ${useCaseName}`);
  }

  return useCaseDirectory;
}

function collectManagedInstallSelectionContext(store, sharedConfig) {
  const selectedBaseSkills = store.listSelectedBaseSkills();
  const selectedRoles = store.listSelectedRoles();
  const generatedProductionSkillIds = [];
  const generatedTestSkillIds = [];

  for (const selectedRole of selectedRoles) {
    const roleUseCases = store.listUseCasesForRole(selectedRole.id);
    for (const useCase of roleUseCases) {
      const useCaseDirectory = getUseCaseDirectory(useCase.name, sharedConfig);
      const generatedSkillIds = getOnboardingGeneratedSkillIds({
        roleKey: selectedRole.id,
        useCaseDirectory,
      });

      generatedProductionSkillIds.push(generatedSkillIds.productionSkillId);
      generatedTestSkillIds.push(generatedSkillIds.testSkillId);
    }
  }

  return {
    generatedProductionSkillIds,
    generatedTestSkillIds,
    managedSkillIds: buildDesiredInstalledSkillIds({
      selectedBaseSkills,
      selectedGeneratedProductionSkillIds: generatedProductionSkillIds,
      selectedGeneratedTestSkillIds: generatedTestSkillIds,
    }),
    selectedBaseSkills,
    selectedRoles,
  };
}

function buildDesiredInstalledSkillIds(input) {
  return [
    ...new Set([
      ...(input.selectedBaseSkills || []).map((skill) => skill.id),
      ...(input.selectedGeneratedProductionSkillIds || []),
      ...(input.selectedGeneratedTestSkillIds || []),
    ]),
  ];
}

function buildSelectedAgentInstallSyncPlans(input) {
  const agentsById = new Map((input.agents || []).map((agent) => [agent.id, agent]));
  const selectedAgentIds = [];
  const seenAgentIds = new Set();

  for (const agentId of input.selectedAgentIds || []) {
    if (seenAgentIds.has(agentId) || !agentsById.has(agentId)) {
      continue;
    }

    seenAgentIds.add(agentId);
    selectedAgentIds.push(agentId);
  }

  const managedSkillIdSet = new Set(input.managedSkillIds || []);
  const selectedInstallSkillIds = [
    ...new Set((input.selectedInstallSkillIds || []).filter((skillId) => managedSkillIdSet.has(skillId))),
  ];
  const selectedInstallSkillIdSet = new Set(selectedInstallSkillIds);
  const forceReinstall = Boolean(input.forceReinstall);

  return {
    agentPlans: selectedAgentIds.map((agentId) => {
      const agent = agentsById.get(agentId);
      const currentSkillIds = [...new Set(agent.installedSkillIds || [])];
      const currentSkillIdSet = new Set(currentSkillIds);
      const addedSkillIds = forceReinstall
        ? [...selectedInstallSkillIds]
        : selectedInstallSkillIds.filter((skillId) => !currentSkillIdSet.has(skillId));
      const removedSkillIds = forceReinstall
        ? currentSkillIds.filter((skillId) => managedSkillIdSet.has(skillId))
        : currentSkillIds.filter(
            (skillId) => managedSkillIdSet.has(skillId) && !selectedInstallSkillIdSet.has(skillId)
          );
      const removedSkillIdSet = new Set(removedSkillIds);
      const unchangedSkillIds = currentSkillIds.filter((skillId) => !removedSkillIdSet.has(skillId));

      return {
        addedSkillIds,
        agentId,
        selectedInstallSkillIds,
        unchangedSkillIds,
        removedSkillIds,
      };
    }),
    selectedAgentIds,
    selectedInstallSkillIds,
  };
}

function buildSkillSyncPlan(input) {
  const currentSkillIds = input.currentSkillIds || [];
  const desiredSkillIds = input.desiredSkillIds || [];

  if (input.forceReinstall) {
    return {
      addedSkillIds: [...desiredSkillIds],
      removedSkillIds: [...currentSkillIds],
    };
  }

  const currentSkillIdSet = new Set(currentSkillIds);
  const desiredSkillIdSet = new Set(desiredSkillIds);

  return {
    addedSkillIds: desiredSkillIds.filter((skillId) => !currentSkillIdSet.has(skillId)),
    removedSkillIds: currentSkillIds.filter((skillId) => !desiredSkillIdSet.has(skillId)),
  };
}

function stageGeneratedUseCaseSkillPackageVariant(input, sharedConfig, variant) {
  const selectedAgentTypes = Array.isArray(input.selectedAgents) && input.selectedAgents.length > 0
    ? [...new Set(input.selectedAgents.map((agent) => agent.type).filter(Boolean))]
    : [input.agent.type];
  const generated = generateSkillArtifacts(
    {
      agentApps: selectedAgentTypes,
      baseSkills: (input.selectedBaseSkills || []).map((skill) => skill.id),
      credentials: {},
      infoSources: input.useCase.infoSources,
      outputDir: input.outputDir,
      reportRules: input.useCase.rules,
      roleKey: input.role.id,
      role: input.role.name,
      useCase: input.useCase.name,
    },
    sharedConfig,
    { variant }
  );

  writeSkillArtifacts(generated);

  return {
    skillId: generated.useCaseDir,
    sourceDir: path.dirname(generated.skillMdPath),
  };
}

function stageGeneratedUseCaseSkillPackage(input, sharedConfig) {
  return stageGeneratedUseCaseSkillPackageVariant(input, sharedConfig, 'production');
}

function stageGeneratedUseCaseSkillPackages(input, sharedConfig) {
  return {
    production: stageGeneratedUseCaseSkillPackageVariant(input, sharedConfig, 'production'),
    test: stageGeneratedUseCaseSkillPackageVariant(input, sharedConfig, 'test'),
  };
}

function writeSelectedInstallSelection(store, selectedAgentIds, selectedInstallSkillIds) {
  const installations = store.readRawFiles().installations;
  writeJsonFileAtomic(path.join(store.storageDir, 'installations.json'), {
    ...installations,
    selectedAgentIds: [...new Set(selectedAgentIds)],
    selectedInstallSkillIds: [...new Set(selectedInstallSkillIds)],
  });
}

function installGeneratedSkillPackage(sourceDir, installRoot, skillId) {
  const targetDir = path.join(installRoot, skillId);

  fs.mkdirSync(installRoot, { recursive: true });
  fs.rmSync(targetDir, { force: true, recursive: true });
  fs.cpSync(sourceDir, targetDir, { recursive: true });

  return targetDir;
}

function executeSkillScript(scriptName, args) {
  const scriptPath = path.resolve(__dirname, '..', scriptName);
  execFileSync(scriptPath, args, {
    cwd: path.resolve(__dirname, '..', '..'),
    stdio: 'inherit',
  });
}

async function selectRoles(question, store) {
  const roles = store.listRoles();
  if (roles.length === 0) {
    printWarning('当前没有可选岗位。');
    await pause(question);
    return;
  }

  const currentRole = store.listSelectedRoles()[0] || null;
  if (currentRole) {
    printWarning(`当前已选岗位: ${currentRole.name}`);
  }

  const selectedRoleId = await chooseNamedItem(question, '请选择岗位（单选）', roles);
  if (!selectedRoleId) {
    return;
  }

  const selectedRoles = store.setSelectedRoles([selectedRoleId]);
  printSuccess(`已选择岗位: ${selectedRoles[0]?.name || '无'}`);
}

async function selectBaseSkills(question, store) {
  const baseSkills = store.listBaseSkills();
  const selectedBaseSkillIds = store.listSelectedBaseSkills().map((skill) => skill.id);
  const nextSkillIds = await multiSelect(
    question,
    '请选择基础技能',
    baseSkills.map((skill) => ({
      label: `${skill.name} (${skill.id})`,
      value: skill.id,
    })),
    selectedBaseSkillIds,
    true
  );

  const selectedSkills = store.setSelectedBaseSkills(nextSkillIds);
  const summary = selectedSkills.map((skill) => skill.name).join('、') || '无';
  printSuccess(`已选择基础技能: ${summary}`);
}

async function manageBasicInfo(question, store) {
  while (true) {
    const action = await selectOption(question, '基础信息设置', getBasicInfoMenuOptions());

    if (action === 'selectRoles') {
      await selectRoles(question, store);
      continue;
    }

    if (action === 'selectBaseSkills') {
      await selectBaseSkills(question, store);
      continue;
    }

    return;
  }
}

async function editRoleScopedUseCase(question, store) {
  const editContext = getUseCaseEditContext(store.listSelectedRoles());
  if (editContext.status === 'blocked') {
    printWarning(editContext.message);
    await pause(question);
    return;
  }

  const role = editContext.role;
  const useCases = store.listUseCasesForRole(role.id);
  if (useCases.length === 0) {
    printWarning(`岗位 "${role.name}" 当前没有可编辑的预置用例。`);
    await pause(question);
    return;
  }

  const selectedUseCaseId = await chooseNamedItem(question, `请选择 ${role.name} 的用例`, useCases);
  if (!selectedUseCaseId) {
    return;
  }

  const current = useCases.find((item) => item.id === selectedUseCaseId);
  const nextDescription = await question('用例描述', current.description);
  const nextInfoSources = await question('信息来源', current.infoSources);
  const nextRules = await question('规则', current.rules);

  const updated = store.upsertUseCase({
    applicableRoleIds: current.applicableRoleIds,
    description: nextDescription,
    id: current.id,
    infoSources: nextInfoSources,
    name: current.name,
    rules: nextRules,
  });

  printSuccess(`已更新用例内容: ${role.name} / ${updated.name}`);
}

async function manageUseCases(question, store) {
  while (true) {
    const action = await selectOption(question, '用例配置', getUseCaseMenuOptions());

    try {
      if (action === 'edit') {
        await editRoleScopedUseCase(question, store);
        continue;
      }

      return;
    } catch (error) {
      printError(error.message);
      await pause(question);
    }
  }
}

function formatAgent(agent, store, homeDir = requireHomeDirectory()) {
  const skillNames = buildSkillNameMap(store);
  const installedLabels = agent.installedSkillIds.map((skillId) => skillNames.get(skillId) || skillId);
  const displayInstallRoot = collapseHomePath(agent.installRoot, homeDir);
  return `${agent.name} [${agent.id}] type=${agent.type} root=${displayInstallRoot} 已装技能: ${
    installedLabels.join(', ') || '无'
  }`;
}

async function createAgent(question, store) {
  const type = await selectOption(question, '请选择 agent 类型', [
    { label: 'Codex', value: 'codex' },
    { label: 'Claude Code', value: 'claude-code' },
    { label: 'WorkBuddy', value: 'workbuddy' },
  ]);
  const defaultName = {
    codex: 'Codex',
    'claude-code': 'Claude Code',
    workbuddy: 'WorkBuddy',
  }[type];
  const homeDir = requireHomeDirectory();
  const name = await question('Agent 名称', defaultName);
  const installRootInput = await question(
    '技能安装目录',
    collapseHomePath(getDefaultInstallRoot(type, homeDir), homeDir)
  );
  const installRoot = expandHomePath(installRootInput, homeDir);

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
  const homeDir = requireHomeDirectory();
  const nextName = await question('Agent 名称', current.name);
  const nextInstallRootInput = await question(
    '技能安装目录',
    collapseHomePath(current.installRoot, homeDir)
  );
  const nextInstallRoot = expandHomePath(nextInstallRootInput, homeDir);

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

async function selectSharedInstallSelection(question, store, sharedConfig) {
  const installations = store.readRawFiles().installations;
  const agents = store.listAgents();
  const selectionContext = collectManagedInstallSelectionContext(store, sharedConfig);
  const skillNames = buildSkillNameMap(store);

  const selectedAgentIds = await multiSelect(
    question,
    '请选择共享安装目标',
    agents.map((agent) => ({
      label: `${agent.name} (${agent.id})`,
      value: agent.id,
    })),
    Array.isArray(installations.selectedAgentIds) ? installations.selectedAgentIds : [],
    true
  );

  const selectedInstallSkillIds = await multiSelect(
    question,
    '请选择共享安装技能',
    selectionContext.managedSkillIds.map((skillId) => ({
      label: skillNames.get(skillId) || skillId,
      value: skillId,
    })),
    Array.isArray(installations.selectedInstallSkillIds)
      ? installations.selectedInstallSkillIds.filter((skillId) => selectionContext.managedSkillIds.includes(skillId))
      : [],
    true
  );

  writeSelectedInstallSelection(store, selectedAgentIds, selectedInstallSkillIds);

  return {
    ...selectionContext,
    selectedAgentIds,
    selectedInstallSkillIds,
  };
}

async function updateAgentSkills(question, store, sharedConfig, forceReinstall = false) {
  const selectionContext = await selectSharedInstallSelection(question, store, sharedConfig);
  const installations = store.readRawFiles().installations;
  const agents = store.listAgents();
  const selectedAgentIds = Array.isArray(installations.selectedAgentIds)
    ? installations.selectedAgentIds
    : [];
  const selectedAgents = agents.filter((agent) => selectedAgentIds.includes(agent.id));

  if (selectedAgents.length === 0) {
    printWarning('当前没有已选择的安装目标。');
    await pause(question);
    return;
  }

  const selectedBaseSkills = selectionContext.selectedBaseSkills;
  const selectedRoles = selectionContext.selectedRoles;
  const stagedUseCasePackages = new Map();
  const generatedSkillOutputDir = path.join(store.storageDir, 'generated-skills');

  for (const selectedRole of selectedRoles) {
    const roleUseCases = store.listUseCasesForRole(selectedRole.id);
    for (const useCase of roleUseCases) {
      const staged = stageGeneratedUseCaseSkillPackages(
        {
          outputDir: generatedSkillOutputDir,
          role: selectedRole,
          selectedBaseSkills,
          selectedAgents,
          useCase,
        },
        sharedConfig
      );
      stagedUseCasePackages.set(staged.production.skillId, staged.production);
      stagedUseCasePackages.set(staged.test.skillId, staged.test);
    }
  }

  const managedSkillIds = selectionContext.managedSkillIds;
  const managedSkillIdSet = new Set(managedSkillIds);
  const desiredInstallSkillIds = [
    ...new Set(
      (installations.selectedInstallSkillIds || []).filter((skillId) => managedSkillIdSet.has(skillId))
    ),
  ];

  writeSelectedInstallSelection(
    store,
    selectedAgents.map((agent) => agent.id),
    desiredInstallSkillIds
  );

  const { agentPlans } = buildSelectedAgentInstallSyncPlans({
    agents,
    forceReinstall,
    managedSkillIds,
    selectedAgentIds: selectedAgents.map((agent) => agent.id),
    selectedInstallSkillIds: desiredInstallSkillIds,
  });

  if (agentPlans.length === 0) {
    printWarning('当前没有可同步安装的目标。');
    await pause(question);
    return;
  }

  const baseSkillIds = new Set(selectedBaseSkills.map((skill) => skill.id));

  for (const plan of agentPlans) {
    const agent = store.getAgent(plan.agentId);
    if (!agent) {
      throw new Error(`未找到 agent: ${plan.agentId}`);
    }

    if (plan.removedSkillIds.length === 0 && plan.addedSkillIds.length === 0) {
      printWarning(`安装列表未发生变化: ${agent.name}`);
      continue;
    }

    const appliedSkillIds = new Set(agent.installedSkillIds);

    for (const skillId of plan.removedSkillIds) {
      executeSkillScript('uninstall-skill.sh', [skillId, agent.type, agent.installRoot]);
      appliedSkillIds.delete(skillId);
      store.setAgentInstalledSkills(agent.id, Array.from(appliedSkillIds));
      printSuccess(`已卸载技能: ${agent.name} / ${skillId}`);
    }

    for (const skillId of plan.addedSkillIds) {
      if (baseSkillIds.has(skillId)) {
        executeSkillScript('install-skill.sh', [skillId, agent.type, agent.installRoot]);
      } else {
        const stagedPackage = stagedUseCasePackages.get(skillId);
        if (!stagedPackage) {
          throw new Error(`未找到待安装的用例技能包: ${skillId}`);
        }

        installGeneratedSkillPackage(stagedPackage.sourceDir, agent.installRoot, skillId);
      }
      appliedSkillIds.add(skillId);
      store.setAgentInstalledSkills(agent.id, Array.from(appliedSkillIds));
      printSuccess(`已安装技能: ${agent.name} / ${skillId}`);
    }
  }
}

async function manageInstallations(question, store, sharedConfig, forceReinstall = false) {
  while (true) {
    const action = await selectOption(question, '安装技能', getInstallationMenuOptions());

    try {
      if (action === 'apply') {
        await updateAgentSkills(question, store, sharedConfig, forceReinstall);
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
    selectedBaseSkillIds: rawFiles.basicInfo.selectedBaseSkillIds || [],
    selectedRoleIds: rawFiles.basicInfo.selectedRoleIds || [],
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
        await manageInstallations(question, store, options.sharedConfig, options.forceReinstall);
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
  collapseHomePath,
  expandHomePath,
  getBasicInfoMenuOptions,
  getDefaultInstallRoot,
  buildDesiredInstalledSkillIds,
  buildSelectedAgentInstallSyncPlans,
  getInstallationMenuOptions,
  getUseCaseEditContext,
  buildSkillSyncPlan,
  installGeneratedSkillPackage,
  parseManagerArgs,
  renderHelp,
  getRoleScopedUseCases,
  stageGeneratedUseCaseSkillPackages,
  stageGeneratedUseCaseSkillPackage,
  getUseCaseMenuOptions,
  updateAgentSkills,
  runConfigManager,
};
