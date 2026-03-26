const fs = require('fs');
const path = require('path');

const DEFAULT_USE_CASE_TEMPLATES = [
  {
    description: '记录每日工作内容和进展，方便持续追踪。',
    infoSources: '',
    name: '记录日志',
    rules: '',
  },
  {
    description: '维护计划、里程碑和下一步安排。',
    infoSources: '',
    name: '记录计划',
    rules: '',
  },
  {
    description: '沉淀项目周报，汇总风险、进展与待办。',
    infoSources: '',
    name: '项目周报',
    rules: '',
  },
];

const SUPPORTED_INSTALL_TARGETS = [
  {
    id: 'claude-code',
    installRootSubpath: path.join('.claude', 'skills'),
    name: 'Claude Code',
    type: 'claude-code',
  },
  {
    id: 'codex',
    installRootSubpath: path.join('.codex', 'skills'),
    name: 'Codex',
    type: 'codex',
  },
  {
    id: 'workbuddy',
    installRootSubpath: path.join('.workbuddy', 'skills'),
    name: 'WorkBuddy',
    type: 'workbuddy',
  },
];

function requireHomeDirectory() {
  const homeDir = process.env.HOME;
  if (!homeDir) {
    throw new Error('环境变量 HOME 未设置，无法确定默认配置目录。');
  }
  return homeDir;
}

function resolveDefaultStorageDir() {
  return path.join(requireHomeDirectory(), '.skills-for-no-engineer', 'onboarding');
}

function normalizeNameToId(name) {
  const asciiCandidate = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  if (asciiCandidate) {
    return asciiCandidate;
  }

  const codePointId = Array.from(name)
    .map((character) => character.codePointAt(0).toString(16))
    .join('-')
    .replace(/^-+|-+$/g, '');

  return codePointId ? `item-${codePointId}` : 'item';
}

function createUniqueId(existingIds, name) {
  const baseId = normalizeNameToId(name);

  if (!existingIds.has(baseId)) {
    return baseId;
  }

  let suffix = 2;
  while (existingIds.has(`${baseId}-${suffix}`)) {
    suffix += 1;
  }

  return `${baseId}-${suffix}`;
}

function ensureDirectory(directoryPath) {
  fs.mkdirSync(directoryPath, { recursive: true });
}

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJsonFileAtomic(filePath, payload) {
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  fs.renameSync(tempPath, filePath);
}

function sortByName(items) {
  return [...items].sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'));
}

function toSeedArray(record) {
  return Object.entries(record || {}).map(([id, item]) => ({
    id,
    name: item.name,
  }));
}

function getDefaultUseCaseTemplates(sharedConfig) {
  const configuredUseCases = Object.values(sharedConfig.useCases || {}).map((useCase) => ({
    description: useCase.description || '',
    name: useCase.name,
  }));

  return configuredUseCases.length > 0 ? configuredUseCases : DEFAULT_USE_CASE_TEMPLATES;
}

function getApplicableRoleIdsByUseCase(sharedConfig) {
  const mapping = new Map();

  for (const [roleId, role] of Object.entries(sharedConfig.roles || {})) {
    for (const useCaseName of role.useCases || []) {
      const currentRoleIds = mapping.get(useCaseName) || [];
      currentRoleIds.push(roleId);
      mapping.set(useCaseName, currentRoleIds);
    }
  }

  return mapping;
}

function createDefaultUseCases(sharedConfig) {
  const applicableRoleIdsByUseCase = getApplicableRoleIdsByUseCase(sharedConfig);

  return getDefaultUseCaseTemplates(sharedConfig).map((template) => ({
    applicableRoleIds: applicableRoleIdsByUseCase.get(template.name) || [],
    description: template.description,
    id: normalizeNameToId(template.name),
    infoSources: template.infoSources,
    name: template.name,
    rules: template.rules,
  }));
}

function createDefaultBasicInfo(sharedConfig) {
  const defaultRoleId = sharedConfig.testDefaults?.role;
  const defaultBaseSkillIds = sharedConfig.testDefaults?.baseSkills || [];

  return {
    baseSkills: sortByName(toSeedArray(sharedConfig.baseSkills)),
    roles: sortByName(toSeedArray(sharedConfig.roles)),
    selectedBaseSkillIds: defaultBaseSkillIds.filter((skillId, index) => (
      sharedConfig.baseSkills?.[skillId] && defaultBaseSkillIds.indexOf(skillId) === index
    )),
    selectedRoleIds: defaultRoleId && sharedConfig.roles?.[defaultRoleId] ? [defaultRoleId] : [],
  };
}

function createDefaultInstallTargets() {
  const homeDir = requireHomeDirectory();

  return SUPPORTED_INSTALL_TARGETS.map((target) => ({
    id: target.id,
    installRoot: path.join(homeDir, target.installRootSubpath),
    installedSkillIds: [],
    name: target.name,
    type: target.type,
  }));
}

function normalizeSelectedRoleIds(roleIds, validRoleIds) {
  for (const roleId of roleIds || []) {
    if (validRoleIds.has(roleId)) {
      return [roleId];
    }
  }

  return [];
}

function listGeneratedUseCaseSkillIds(sharedConfig, useCases) {
  const generatedSkillIds = new Set();

  for (const useCase of useCases || []) {
    const useCaseDirectory = sharedConfig.useCases?.[useCase.name]?.directory;
    if (!useCaseDirectory) {
      continue;
    }

    for (const roleId of useCase.applicableRoleIds || []) {
      generatedSkillIds.add(`${roleId}-${useCaseDirectory}`);
    }
  }

  return generatedSkillIds;
}

function mergeBasicInfoWithDefaults(existingBasicInfo, defaultBasicInfo) {
  const roleIds = new Set(defaultBasicInfo.roles.map((role) => role.id));
  const baseSkillIds = new Set(defaultBasicInfo.baseSkills.map((skill) => skill.id));

  return {
    baseSkills: defaultBasicInfo.baseSkills,
    roles: Array.isArray(existingBasicInfo.roles) ? existingBasicInfo.roles : defaultBasicInfo.roles,
    selectedBaseSkillIds: Array.isArray(existingBasicInfo.selectedBaseSkillIds)
      ? existingBasicInfo.selectedBaseSkillIds.filter((skillId) => baseSkillIds.has(skillId))
      : defaultBasicInfo.selectedBaseSkillIds,
    selectedRoleIds: Array.isArray(existingBasicInfo.selectedRoleIds)
      ? normalizeSelectedRoleIds(existingBasicInfo.selectedRoleIds, roleIds)
      : defaultBasicInfo.selectedRoleIds,
  };
}

function mergeUseCasesWithDefaults(existingUseCases, defaultUseCases) {
  const existingById = new Map(
    (existingUseCases.useCases || []).map((useCase) => [useCase.id, useCase])
  );
  const defaultIds = new Set(defaultUseCases.map((useCase) => useCase.id));

  return {
    useCases: [
      ...defaultUseCases.map((defaultUseCase) => {
        const existing = existingById.get(defaultUseCase.id);
        if (!existing) {
          return defaultUseCase;
        }

        return {
          applicableRoleIds: defaultUseCase.applicableRoleIds,
          description: existing.description ?? defaultUseCase.description,
          id: defaultUseCase.id,
          infoSources: existing.infoSources ?? defaultUseCase.infoSources,
          name: defaultUseCase.name,
          rules: existing.rules ?? defaultUseCase.rules,
        };
      }),
      ...(existingUseCases.useCases || []).filter((useCase) => !defaultIds.has(useCase.id)),
    ],
  };
}

function mergeInstallationsWithDefaults(existingInstallations, defaultAgents) {
  const existingById = new Map(
    (existingInstallations.agents || []).map((agent) => [agent.id, agent])
  );
  const defaultIds = new Set(defaultAgents.map((agent) => agent.id));

  return {
    agents: [
      ...defaultAgents.map((defaultAgent) => {
        const existing = existingById.get(defaultAgent.id);
        if (!existing) {
          return defaultAgent;
        }

        return {
          ...defaultAgent,
          installRoot: existing.installRoot || defaultAgent.installRoot,
          installedSkillIds: Array.isArray(existing.installedSkillIds) ? existing.installedSkillIds : [],
          name: existing.name || defaultAgent.name,
        };
      }),
      ...(existingInstallations.agents || []).filter((agent) => !defaultIds.has(agent.id)),
    ],
  };
}

function createOnboardingConfigStore(options) {
  const storageDir = options.storageDir || resolveDefaultStorageDir();
  const sharedConfig = options.sharedConfig || {};

  const basicInfoPath = path.join(storageDir, 'basic-info.json');
  const useCasesPath = path.join(storageDir, 'use-cases.json');
  const installationsPath = path.join(storageDir, 'installations.json');

  function initialize() {
    ensureDirectory(storageDir);

    const defaultBasicInfo = createDefaultBasicInfo(sharedConfig);
    const defaultUseCases = createDefaultUseCases(sharedConfig);
    const defaultInstallations = {
      agents: createDefaultInstallTargets(),
    };

    if (!fs.existsSync(basicInfoPath)) {
      writeJsonFileAtomic(basicInfoPath, defaultBasicInfo);
    } else {
      writeBasicInfo(mergeBasicInfoWithDefaults(readJsonFile(basicInfoPath), defaultBasicInfo));
    }

    if (!fs.existsSync(useCasesPath)) {
      writeJsonFileAtomic(useCasesPath, {
        useCases: defaultUseCases,
      });
    } else {
      writeUseCases(mergeUseCasesWithDefaults(readJsonFile(useCasesPath), defaultUseCases));
    }

    if (!fs.existsSync(installationsPath)) {
      writeJsonFileAtomic(installationsPath, defaultInstallations);
    } else {
      writeInstallations(mergeInstallationsWithDefaults(readJsonFile(installationsPath), defaultInstallations.agents));
    }
  }

  function readBasicInfo() {
    return readJsonFile(basicInfoPath);
  }

  function writeBasicInfo(payload) {
    const validRoleIds = new Set((payload.roles || []).map((role) => role.id));

    writeJsonFileAtomic(basicInfoPath, {
      baseSkills: sortByName(payload.baseSkills),
      roles: sortByName(payload.roles),
      selectedBaseSkillIds: [...new Set(payload.selectedBaseSkillIds || [])],
      selectedRoleIds: normalizeSelectedRoleIds(payload.selectedRoleIds || [], validRoleIds),
    });
  }

  function readUseCases() {
    return readJsonFile(useCasesPath);
  }

  function writeUseCases(payload) {
    writeJsonFileAtomic(useCasesPath, {
      useCases: sortByName(payload.useCases),
    });
  }

  function readInstallations() {
    return readJsonFile(installationsPath);
  }

  function writeInstallations(payload) {
    writeJsonFileAtomic(installationsPath, {
      agents: sortByName(payload.agents),
    });
  }

  function listRoles() {
    return readBasicInfo().roles;
  }

  function listBaseSkills() {
    return readBasicInfo().baseSkills;
  }

  function listUseCases() {
    return readUseCases().useCases;
  }

  function listAgents() {
    return readInstallations().agents;
  }

  function getAgent(agentId) {
    return listAgents().find((agent) => agent.id === agentId) || null;
  }

  function createRole(name) {
    const basicInfo = readBasicInfo();
    const existingIds = new Set(basicInfo.roles.map((item) => item.id));
    const role = {
      id: createUniqueId(existingIds, name),
      name,
    };
    basicInfo.roles.push(role);
    writeBasicInfo(basicInfo);
    return role;
  }

  function renameRole(roleId, name) {
    const basicInfo = readBasicInfo();
    const role = basicInfo.roles.find((item) => item.id === roleId);

    if (!role) {
      throw new Error(`未找到岗位: ${roleId}`);
    }

    role.name = name;
    writeBasicInfo(basicInfo);
  }

  function deleteRole(roleId) {
    const isReferenced = listUseCases().some((useCase) => useCase.applicableRoleIds.includes(roleId));
    if (isReferenced) {
      throw new Error('该岗位仍被用例引用，无法删除。');
    }

    const basicInfo = readBasicInfo();
    basicInfo.roles = basicInfo.roles.filter((item) => item.id !== roleId);
    basicInfo.selectedRoleIds = (basicInfo.selectedRoleIds || []).filter((item) => item !== roleId);
    writeBasicInfo(basicInfo);
  }

  function createBaseSkill(name) {
    const basicInfo = readBasicInfo();
    const existingIds = new Set(basicInfo.baseSkills.map((item) => item.id));
    const skill = {
      id: createUniqueId(existingIds, name),
      name,
    };
    basicInfo.baseSkills.push(skill);
    writeBasicInfo(basicInfo);
    return skill;
  }

  function renameBaseSkill(skillId, name) {
    const basicInfo = readBasicInfo();
    const skill = basicInfo.baseSkills.find((item) => item.id === skillId);

    if (!skill) {
      throw new Error(`未找到基础技能: ${skillId}`);
    }

    skill.name = name;
    writeBasicInfo(basicInfo);
  }

  function deleteBaseSkill(skillId) {
    const isInstalled = listAgents().some((agent) => agent.installedSkillIds.includes(skillId));
    if (isInstalled) {
      throw new Error('该基础技能仍安装在 agent 上，无法删除。');
    }

    const basicInfo = readBasicInfo();
    basicInfo.baseSkills = basicInfo.baseSkills.filter((item) => item.id !== skillId);
    basicInfo.selectedBaseSkillIds = (basicInfo.selectedBaseSkillIds || []).filter((item) => item !== skillId);
    writeBasicInfo(basicInfo);
  }

  function listSelectedRoles() {
    const basicInfo = readBasicInfo();
    const selectedRoleIds = new Set(basicInfo.selectedRoleIds || []);
    return basicInfo.roles.filter((role) => selectedRoleIds.has(role.id));
  }

  function setSelectedRoles(roleIds) {
    const basicInfo = readBasicInfo();
    const validRoleIds = new Set(basicInfo.roles.map((role) => role.id));
    basicInfo.selectedRoleIds = normalizeSelectedRoleIds(roleIds, validRoleIds);
    writeBasicInfo(basicInfo);
    return listSelectedRoles();
  }

  function listSelectedBaseSkills() {
    const basicInfo = readBasicInfo();
    const selectedBaseSkillIds = new Set(basicInfo.selectedBaseSkillIds || []);
    return basicInfo.baseSkills.filter((skill) => selectedBaseSkillIds.has(skill.id));
  }

  function setSelectedBaseSkills(skillIds) {
    const basicInfo = readBasicInfo();
    const validSkillIds = new Set(basicInfo.baseSkills.map((skill) => skill.id));
    basicInfo.selectedBaseSkillIds = [...new Set((skillIds || []).filter((skillId) => validSkillIds.has(skillId)))];
    writeBasicInfo(basicInfo);
    return listSelectedBaseSkills();
  }

  function listUseCasesForRole(roleId) {
    return listUseCases().filter((useCase) => useCase.applicableRoleIds.includes(roleId));
  }

  function upsertUseCase(input) {
    const useCases = readUseCases();
    const roleIds = new Set(listRoles().map((role) => role.id));

    for (const roleId of input.applicableRoleIds || []) {
      if (!roleIds.has(roleId)) {
        throw new Error(`未找到岗位: ${roleId}`);
      }
    }

    if (input.id) {
      const existing = useCases.useCases.find((useCase) => useCase.id === input.id);
      if (!existing) {
        throw new Error(`未找到用例: ${input.id}`);
      }

      existing.name = input.name;
      existing.description = input.description;
      existing.infoSources = input.infoSources;
      existing.rules = input.rules;
      existing.applicableRoleIds = [...input.applicableRoleIds];
      writeUseCases(useCases);
      return existing;
    }

    const existingIds = new Set(useCases.useCases.map((useCase) => useCase.id));
    const created = {
      applicableRoleIds: [...(input.applicableRoleIds || [])],
      description: input.description,
      id: createUniqueId(existingIds, input.name),
      infoSources: input.infoSources,
      name: input.name,
      rules: input.rules,
    };

    useCases.useCases.push(created);
    writeUseCases(useCases);
    return created;
  }

  function deleteUseCase(useCaseId) {
    const useCases = readUseCases();
    useCases.useCases = useCases.useCases.filter((useCase) => useCase.id !== useCaseId);
    writeUseCases(useCases);
  }

  function createAgent(input) {
    if (!['codex', 'claude-code', 'workbuddy'].includes(input.type)) {
      throw new Error(`不支持的 agent 类型: ${input.type}`);
    }

    const installations = readInstallations();
    const existingIds = new Set(installations.agents.map((agent) => agent.id));
    const created = {
      id: createUniqueId(existingIds, input.name),
      installRoot: input.installRoot,
      installedSkillIds: [],
      name: input.name,
      type: input.type,
    };

    installations.agents.push(created);
    writeInstallations(installations);
    return created;
  }

  function updateAgent(agentId, updates) {
    const installations = readInstallations();
    const agent = installations.agents.find((item) => item.id === agentId);

    if (!agent) {
      throw new Error(`未找到 agent: ${agentId}`);
    }

    if (updates.name !== undefined) {
      agent.name = updates.name;
    }
    if (updates.installRoot !== undefined) {
      agent.installRoot = updates.installRoot;
    }

    writeInstallations(installations);
    return agent;
  }

  function deleteAgent(agentId) {
    const agent = getAgent(agentId);
    if (!agent) {
      throw new Error(`未找到 agent: ${agentId}`);
    }

    if (agent.installedSkillIds.length > 0) {
      throw new Error('该 agent 仍安装有技能，请先卸载后再删除。');
    }

    const installations = readInstallations();
    installations.agents = installations.agents.filter((item) => item.id !== agentId);
    writeInstallations(installations);
  }

  function setAgentInstalledSkills(agentId, skillIds) {
    const basicSkillIds = new Set(listBaseSkills().map((skill) => skill.id));
    const generatedUseCaseSkillIds = listGeneratedUseCaseSkillIds(sharedConfig, listUseCases());
    const validSkillIds = new Set([...basicSkillIds, ...generatedUseCaseSkillIds]);

    for (const skillId of skillIds) {
      if (!validSkillIds.has(skillId)) {
        throw new Error(`未找到技能: ${skillId}`);
      }
    }

    const installations = readInstallations();
    const agent = installations.agents.find((item) => item.id === agentId);
    if (!agent) {
      throw new Error(`未找到 agent: ${agentId}`);
    }

    agent.installedSkillIds = [...new Set(skillIds)];
    writeInstallations(installations);
    return agent;
  }

  function readRawFiles() {
    return {
      basicInfo: readBasicInfo(),
      installations: readInstallations(),
      useCases: readUseCases(),
    };
  }

  return {
    createAgent,
    createBaseSkill,
    createRole,
    deleteAgent,
    deleteBaseSkill,
    deleteRole,
    deleteUseCase,
    getAgent,
    initialize,
    listAgents,
    listBaseSkills,
    listRoles,
    listSelectedBaseSkills,
    listSelectedRoles,
    listUseCases,
    listUseCasesForRole,
    readRawFiles,
    renameBaseSkill,
    renameRole,
    setSelectedBaseSkills,
    setAgentInstalledSkills,
    setSelectedRoles,
    storageDir,
    updateAgent,
    upsertUseCase,
  };
}

module.exports = {
  createOnboardingConfigStore,
  normalizeNameToId,
  resolveDefaultStorageDir,
  requireHomeDirectory,
};
