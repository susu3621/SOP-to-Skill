const fs = require('fs');
const path = require('path');
const {
  getOnboardingGeneratedSkillIds,
} = require('./onboarding-skill-set.cjs');

const EIGHT_D_USE_CASE_DIR = 'eight-d-report-preparation';
const EIGHT_D_TEMPLATE_RELATIVE_PATH = path.join('templates', '8d-report.docx');
const DOCUMENT_TEMPLATE_SKILL_ID = 'document-template';

function resolveExplicitSkillVariant(options) {
  const explicitVariant = options?.variant;

  if (explicitVariant === undefined) {
    return null;
  }

  if (explicitVariant !== 'production' && explicitVariant !== 'test') {
    throw new Error(`Unsupported skill variant: ${explicitVariant}`);
  }

  return explicitVariant;
}

function buildEightDDocumentTemplateGuidance(cfg, useCaseDir) {
  if (useCaseDir !== EIGHT_D_USE_CASE_DIR || !cfg.baseSkills.includes(DOCUMENT_TEMPLATE_SKILL_ID)) {
    return '';
  }

  return `## 默认模板出具流程

- 默认情况下，使用当前 8D Skill 目录中的 \`templates/8d-report.docx\` 作为模板，并调用 \`document-template\` 基础技能来生成正式 8D 报告。
- 如果用户没有提供外部模板链接，优先使用当前 8D Skill 自带模板；如果当前 8D Skill 中还没有模板，先按 8D 报告结构补齐或构建模板。
- 先整理成结构化 JSON，再进行模板校验和文档渲染。
- 建议 JSON 至少包含以下结构：

\`\`\`json
{
  "report_object": { "customer_mark": "☑", "supplier_mark": "☐", "internal_mark": "☐" },
  "severity": { "critical_mark": "☑", "major_mark": "☐", "minor_mark": "☐" },
  "report_no": "MC20260421001",
  "report_date": "2026-04-21",
  "subject": { "customer_mark": "☑", "supplier_mark": "☐", "name": "客户或供应商名称" },
  "related_report": "涉及报告或文件",
  "d1_leader": "小组负责人",
  "d1_members": "小组成员",
  "d2": { "problem_1": "", "problem_2": "", "problem_3": "", "problem_4": "", "problem_image": "" },
  "d3": { "row1": { "description": "", "owner": "", "due_date": "", "result": "" } },
  "d4": { "row1": { "description": "", "owner": "", "due_date": "", "result": "" } },
  "d5": { "row1": { "description": "", "owner": "", "due_date": "", "result": "" } },
  "d6": { "row1": { "description": "", "owner": "", "due_date": "", "result": "" } },
  "d7": { "row1": { "description": "", "owner": "", "due_date": "", "result": "" } },
  "d8_summary": "批量验证 / 团队激励结论",
  "team_leader": "小组负责人",
  "management_representative": "管理者代表"
}
\`\`\`

- 先用 \`validate_doc_template.js\` 校验模板和 JSON 的匹配结果，再用 \`render_doc_template.js\` 输出 \`docx\`；如果用户要求，再进一步输出 \`pdf\`。
- 如果用户提供了自定义模板，优先改用用户模板，但仍保持“先结构化 JSON、再模板渲染”的流程。

`;
}

function buildEightDSeedFiles(useCaseDir, skillOutputDir) {
  if (useCaseDir !== EIGHT_D_USE_CASE_DIR) {
    return [];
  }

  const sourcePath = path.resolve(
    __dirname,
    '..',
    '..',
    'skills',
    DOCUMENT_TEMPLATE_SKILL_ID,
    EIGHT_D_TEMPLATE_RELATIVE_PATH
  );

  if (!fs.existsSync(sourcePath)) {
    return [];
  }

  return [
    {
      sourcePath,
      targetPath: path.join(skillOutputDir, EIGHT_D_TEMPLATE_RELATIVE_PATH),
    },
  ];
}

function getSkillOutputDetails(cfg, sharedConfig, options) {
  const explicitVariant = resolveExplicitSkillVariant(options);
  const variant = explicitVariant || 'production';
  const useCaseConfig = sharedConfig.useCases?.[cfg.useCase];
  const useCaseDir = useCaseConfig?.directory;
  const skillName = `${cfg.role}-${cfg.useCase}`;

  if (!useCaseDir) {
    throw new Error(`Missing directory mapping for use case: ${cfg.useCase}`);
  }

  if (!cfg.roleKey) {
    throw new Error(`Missing roleKey for skill generation: ${cfg.role}`);
  }

  const generatedSkillIds = getOnboardingGeneratedSkillIds({
    roleKey: cfg.roleKey,
    useCaseDirectory: useCaseDir,
  });
  const skillId = variant === 'test' ? generatedSkillIds.testSkillId : generatedSkillIds.productionSkillId;
  const skillOutputDir = path.join(cfg.outputDir, skillId);
  const includeLocalOnlyGuidance = explicitVariant ? variant === 'test' : Boolean(cfg.localOnly);
  const documentTemplateGuidance = buildEightDDocumentTemplateGuidance(cfg, useCaseDir);

  if (explicitVariant && cfg.localOnly !== undefined && cfg.localOnly !== includeLocalOnlyGuidance) {
    throw new Error(
      `Conflicting skill generation flags: variant=${explicitVariant} localOnly=${cfg.localOnly}`
    );
  }

  const skillConfig = {
    name: skillName,
    version: '1.0.0',
    description: `${cfg.role} - ${cfg.useCase}`,
    generatedAt: new Date().toISOString(),
    config: {
      agentApps: cfg.agentApps,
      role: cfg.role,
      baseSkills: cfg.baseSkills,
      useCase: cfg.useCase,
      infoSources: cfg.infoSources,
      reportRules: cfg.reportRules,
    },
    credentials: Object.keys(cfg.credentials).reduce((acc, key) => {
      acc[key] = '******';
      return acc;
    }, {}),
  };

  const skillMD = `---
name: ${skillName}
description: ${skillConfig.description}
---

# ${skillName}

## 配置信息

- **岗位**: ${cfg.role}
- **用例**: ${cfg.useCase}
- **基础工具**: ${cfg.baseSkills.map((s) => sharedConfig.baseSkills[s]?.name || s).join('、')}
- **Agent 应用**: ${cfg.agentApps.map((a) => sharedConfig.agentApps[a]?.name || a).join('、')}

## 信息来源

${cfg.infoSources}

## 用例规则

${cfg.reportRules || '未设置'}

${documentTemplateGuidance}${includeLocalOnlyGuidance ? `## 测试环境说明

- 将产生的结果存储到 \`/tmp/skills-for-no-engineer\`
- 不要实际进行发送
- 最终结果不要进行更新执行，而是打印出来。

` : ''}---

*Generated by test-onboarding.cjs at ${new Date().toLocaleString('zh-CN')}*
`;

  return {
    seedFiles: buildEightDSeedFiles(useCaseDir, skillOutputDir),
    skillConfig,
    skillJsonPath: path.join(skillOutputDir, 'skill.json'),
    skillMdPath: path.join(skillOutputDir, 'SKILL.md'),
    skillMD,
    useCaseDir: skillId,
  };
}

function generateSkillArtifacts(cfg, sharedConfig, options = {}) {
  return getSkillOutputDetails(cfg, sharedConfig, options);
}

function generateOnboardingSkillSetArtifacts(cfg, sharedConfig) {
  return {
    production: generateSkillArtifacts(cfg, sharedConfig, { variant: 'production' }),
    test: generateSkillArtifacts(cfg, sharedConfig, { variant: 'test' }),
  };
}

function writeSkillArtifacts(result) {
  fs.mkdirSync(path.dirname(result.skillJsonPath), { recursive: true });
  fs.writeFileSync(result.skillJsonPath, JSON.stringify(result.skillConfig, null, 2));
  fs.writeFileSync(result.skillMdPath, result.skillMD);
  for (const file of result.seedFiles || []) {
    fs.mkdirSync(path.dirname(file.targetPath), { recursive: true });
    fs.copyFileSync(file.sourcePath, file.targetPath);
  }
}

module.exports = {
  generateOnboardingSkillSetArtifacts,
  generateSkillArtifacts,
  writeSkillArtifacts,
};
