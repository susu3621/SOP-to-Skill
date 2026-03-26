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

function createDefaultUseCases() {
  return DEFAULT_USE_CASE_TEMPLATES.map((template) => ({
    applicableRoleIds: [],
    description: template.description,
    id: normalizeNameToId(template.name),
    infoSources: template.infoSources,
    name: template.name,
    rules: template.rules,
  }));
}

function createOnboardingConfigStore(options) {
  const storageDir = options.storageDir || resolveDefaultStorageDir();
  const sharedConfig = options.sharedConfig || {};

  const basicInfoPath = path.join(storageDir, 'basic-info.json');
  const useCasesPath = path.join(storageDir, 'use-cases.json');
  const installationsPath = path.join(storageDir, 'installations.json');

  function initialize() {
    ensureDirectory(storageDir);

    if (!fs.existsSync(basicInfoPath)) {
      writeJsonFileAtomic(basicInfoPath, {
        baseSkills: sortByName(toSeedArray(sharedConfig.baseSkills)),
        roles: sortByName(toSeedArray(sharedConfig.roles)),
      });
    }

    if (!fs.existsSync(useCasesPath)) {
      writeJsonFileAtomic(useCasesPath, {
        useCases: createDefaultUseCases(),
      });
    }

    if (!fs.existsSync(installationsPath)) {
      writeJsonFileAtomic(installationsPath, {
        agents: [],
      });
    }
  }

  function readBasicInfo() {
    return readJsonFile(basicInfoPath);
  }

  function writeBasicInfo(payload) {
    writeJsonFileAtomic(basicInfoPath, {
      baseSkills: sortByName(payload.baseSkills),
      roles: sortByName(payload.roles),
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
    writeBasicInfo(basicInfo);
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
    if (!['codex', 'claude-code'].includes(input.type)) {
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
    for (const skillId of skillIds) {
      if (!basicSkillIds.has(skillId)) {
        throw new Error(`未找到基础技能: ${skillId}`);
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
    listUseCases,
    readRawFiles,
    renameBaseSkill,
    renameRole,
    setAgentInstalledSkills,
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
