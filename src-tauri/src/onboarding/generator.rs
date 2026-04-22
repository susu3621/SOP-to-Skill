use crate::models::OnboardingRoleUseCaseContent;
use crate::models::SkillError;
use crate::template::{get_data_root, get_skills_dir};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub struct OnboardingUseCaseTemplateAssets {
    pub repo_dir: String,
    pub default_template_path: String,
    #[serde(default)]
    pub example_data_path: Option<String>,
    pub renderer_base_skill_id: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct StageOnboardingPackageInput {
    pub role_id: String,
    pub role_name: String,
    pub selected_agent_ids: Vec<String>,
    pub selected_base_skill_ids: Vec<String>,
    #[serde(default)]
    pub template_assets: Option<OnboardingUseCaseTemplateAssets>,
    pub use_case: OnboardingRoleUseCaseContent,
    pub use_case_directory: String,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub struct StagedOnboardingPackage {
    pub skill_id: String,
    pub source_dir: PathBuf,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub struct StagedOnboardingPackages {
    pub production: StagedOnboardingPackage,
    pub test: StagedOnboardingPackage,
}

fn get_data_root_override(data_root: Option<&PathBuf>) -> PathBuf {
    data_root.cloned().unwrap_or_else(get_data_root)
}

fn get_onboarding_staging_dir_with_data_root(data_root: Option<&PathBuf>) -> PathBuf {
    get_data_root_override(data_root)
        .join("onboarding")
        .join("generated-skills")
}

const EIGHT_D_USE_CASE_ID: &str = "eight-d-report-preparation";
const ISO9001_INTERNAL_AUDIT_USE_CASE_ID: &str = "iso9001-package-preparation";
const DOCUMENT_TEMPLATE_SKILL_ID: &str = "document-template";

fn is_eight_d_use_case(input: &StageOnboardingPackageInput) -> bool {
    input.use_case.use_case_id == EIGHT_D_USE_CASE_ID
}

fn is_iso9001_internal_audit_use_case(input: &StageOnboardingPackageInput) -> bool {
    input.use_case.use_case_id == ISO9001_INTERNAL_AUDIT_USE_CASE_ID
}

fn normalize_display_path(path: &str) -> String {
    path.replace('\\', "/").trim_matches('/').to_string()
}

fn build_repo_asset_display_path(repo_dir: &str, asset_path: &str) -> String {
    let normalized_repo_dir = normalize_display_path(repo_dir);
    let normalized_asset_path = normalize_display_path(asset_path);

    match (normalized_repo_dir.is_empty(), normalized_asset_path.is_empty()) {
        (true, true) => String::new(),
        (true, false) => normalized_asset_path,
        (false, true) => normalized_repo_dir,
        (false, false) => format!("{normalized_repo_dir}/{normalized_asset_path}"),
    }
}

fn repository_root_candidates() -> Vec<PathBuf> {
    let mut candidates = Vec::new();

    if let Some(parent) = get_skills_dir().parent() {
        let candidate = parent.to_path_buf();
        if !candidates.iter().any(|existing| existing == &candidate) {
            candidates.push(candidate);
        }
    }

    let workspace_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..");
    if !candidates.iter().any(|existing| existing == &workspace_root) {
        candidates.push(workspace_root);
    }

    candidates
}

fn resolve_repo_relative_path(relative_path: &str) -> Option<PathBuf> {
    let normalized = relative_path.trim();
    if normalized.is_empty() {
        return None;
    }

    let relative = PathBuf::from(normalized);
    for root in repository_root_candidates() {
        let candidate = root.join(&relative);
        if candidate.exists() {
            return Some(candidate);
        }
    }

    None
}

fn resolve_use_case_asset_source_path(
    template_assets: &OnboardingUseCaseTemplateAssets,
    asset_relative_path: &str,
) -> Option<PathBuf> {
    let repo_relative = Path::new(&template_assets.repo_dir).join(asset_relative_path);
    resolve_repo_relative_path(repo_relative.to_string_lossy().as_ref())
}

fn use_case_has_repository_template_asset(
    template_assets: &OnboardingUseCaseTemplateAssets,
) -> bool {
    resolve_use_case_asset_source_path(template_assets, &template_assets.default_template_path)
        .is_some()
}

fn normalized_template_extension(path: &str) -> String {
    Path::new(path)
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase()
}

fn stage_use_case_template_assets(
    source_dir: &Path,
    input: &StageOnboardingPackageInput,
) -> Result<(), SkillError> {
    let Some(template_assets) = input.template_assets.as_ref() else {
        return Ok(());
    };

    let mut asset_relative_paths = vec![template_assets.default_template_path.clone()];
    if let Some(example_data_path) = template_assets.example_data_path.as_ref() {
        asset_relative_paths.push(example_data_path.clone());
    }

    for asset_relative_path in asset_relative_paths {
        if asset_relative_path.trim().is_empty() {
            continue;
        }

        let Some(source_path) =
            resolve_use_case_asset_source_path(template_assets, &asset_relative_path)
        else {
            continue;
        };

        let destination_path = source_dir.join(&asset_relative_path);
        let Some(parent_dir) = destination_path.parent() else {
            continue;
        };

        fs::create_dir_all(parent_dir).map_err(|error| SkillError::WriteError(error.to_string()))?;
        fs::copy(&source_path, &destination_path)
            .map_err(|error| SkillError::WriteError(error.to_string()))?;
    }

    Ok(())
}

const BUILT_IN_TEMPLATE_START_MARKERS: &[&str] = &[
    "如果用户填写了模板链接，则优先采用用户模板；未填写时，默认按以下模板整理：\n",
    "如果用户填写了公司 SOP / 模板链接，则优先采用用户提供的内容；未填写时，默认按以下模板整理：\n",
    "If the user provides a template link, follow the user template first. Otherwise, use this built-in template:\n",
    "If the user provides a template link, follow the user template first. Otherwise, use this built-in structure:\n",
    "If the user provides a company SOP or template link, follow the user-provided content first. Otherwise, use this built-in template:\n",
];

const BUILT_IN_TEMPLATE_END_MARKERS: &[&str] = &[
    "\n\n输入（每次执行都需要提供给Skill的信息）：",
    "\n\nInput (information required every run):",
];

fn find_built_in_template_section(description: &str) -> Option<(usize, usize, usize)> {
    for start_marker in BUILT_IN_TEMPLATE_START_MARKERS {
        let Some(start_index) = description.find(start_marker) else {
            continue;
        };

        let template_start = start_index + start_marker.len();
        let template_end = BUILT_IN_TEMPLATE_END_MARKERS
            .iter()
            .filter_map(|marker| {
                description[template_start..]
                    .find(marker)
                    .map(|offset| template_start + offset)
            })
            .min()
            .unwrap_or(description.len());

        return Some((start_index, template_start, template_end));
    }

    None
}

fn extract_built_in_template_value(description: &str) -> Option<String> {
    let (_, template_start, template_end) = find_built_in_template_section(description)?;
    let value = description[template_start..template_end].trim();

    if value.is_empty() {
        None
    } else {
        Some(value.to_string())
    }
}

fn strip_built_in_template_content(description: &str) -> String {
    let Some((section_start, _, section_end)) = find_built_in_template_section(description) else {
        return description.trim().to_string();
    };

    let prefix = description[..section_start].trim();
    let suffix = description[section_end..].trim();

    match (prefix.is_empty(), suffix.is_empty()) {
        (true, true) => String::new(),
        (true, false) => suffix.to_string(),
        (false, true) => prefix.to_string(),
        (false, false) => format!("{prefix}\n\n{suffix}"),
    }
}

fn is_built_in_template_question(question_id: &str) -> bool {
    question_id.ends_with("template-source")
        || question_id.ends_with("sop")
        || question_id.ends_with("sop-source")
}

fn resolve_effective_question_answer(
    question_id: &str,
    answer: &str,
    built_in_template_value: Option<&str>,
    template_assets: Option<&OnboardingUseCaseTemplateAssets>,
) -> String {
    let trimmed_answer = answer.trim();
    if !trimmed_answer.is_empty() {
        return trimmed_answer.to_string();
    }

    if is_built_in_template_question(question_id) {
        if let Some(template_assets) = template_assets {
            let current_skill_template_path =
                normalize_display_path(&template_assets.default_template_path);

            if !current_skill_template_path.is_empty() {
                return format!(
                    "留空时默认使用当前 Skill 目录中的 `{current_skill_template_path}`"
                );
            }
        }

        return built_in_template_value.unwrap_or("").to_string();
    }

    String::new()
}

fn should_render_default_template_section(
    use_case: &OnboardingRoleUseCaseContent,
    built_in_template_value: Option<&str>,
) -> bool {
    if built_in_template_value.is_none() {
        return false;
    }

    if use_case.questions.is_empty() {
        return true;
    }

    !use_case
        .questions
        .iter()
        .any(|question| is_built_in_template_question(&question.id))
}

fn build_use_case_template_asset_guidance(input: &StageOnboardingPackageInput) -> Option<String> {
    let template_assets = input.template_assets.as_ref()?;

    let current_skill_template_path =
        normalize_display_path(&template_assets.default_template_path);
    let repository_template_path = build_repo_asset_display_path(
        &template_assets.repo_dir,
        &template_assets.default_template_path,
    );
    let template_extension = normalized_template_extension(&template_assets.default_template_path);
    let has_repository_template_asset = use_case_has_repository_template_asset(template_assets);

    if template_extension != "docx" {
        let mut body = format!(
            "## 默认模板资产\n\n- 默认情况下，使用当前业务 Skill 目录中的 `{current_skill_template_path}` 作为内置模板资产。\n- 生成 Skill 时会将模板复制到当前业务 Skill 目录的 `{current_skill_template_path}`，后续使用当前 Skill 内的副本。\n"
        );

        if !has_repository_template_asset {
            body.push_str(&format!(
                "- 当前业务模板资产目录 `{}` 下还没有模板文件 `{}`，先按业务结构补齐或构建模板，再开始执行。\n",
                normalize_display_path(&template_assets.repo_dir),
                current_skill_template_path
            ));
        }

        if template_extension == "xlsx" {
            body.push_str(
                "- 该模板是 Excel 检查表模板，优先按表内结构完成检查表，再围绕同一结构整理配套资料。\n",
            );
        }

        if is_iso9001_internal_audit_use_case(input) {
            body.push_str(
                "- 输出应至少包含内审检查表文件和内审资料包压缩包。\n- 资料包目录应与内审检查表中的条款目录保持一致。\n- 页面类证据先导出为文件，再放入对应条款目录。\n",
            );
        }

        body.push_str("- 如果用户提供了自定义模板，优先改用用户模板，但仍保持当前输出和目录约束。\n\n");

        return Some(body);
    }

    if !input
        .selected_base_skill_ids
        .iter()
        .any(|skill_id| skill_id == &template_assets.renderer_base_skill_id)
    {
        return None;
    }

    let renderer_base_skill_id = &template_assets.renderer_base_skill_id;
    let mut body = if is_eight_d_use_case(input) {
        format!(
            "## 默认模板出具流程\n\n- 默认情况下，使用当前 8D Skill 目录中的 `{current_skill_template_path}` 作为模板，并调用 `{renderer_base_skill_id}` 基础技能来生成正式 8D 报告。\n- 当前 8D 模板资产在仓库目录 `{repository_template_path}` 中维护。\n- 如果用户没有提供外部模板链接，优先使用当前 8D Skill 自带模板；如果当前 8D Skill 中还没有模板，先按 8D 报告结构补齐或构建模板。\n- 先整理成结构化 JSON，再进行模板校验和文档渲染。\n"
        )
    } else {
        format!(
            "## 默认模板出具流程\n\n- 默认情况下，使用当前业务 Skill 目录中的 `{current_skill_template_path}` 作为模板，并调用 `{renderer_base_skill_id}` 基础技能来生成正式文档。\n- 当前业务模板资产在仓库目录 `{repository_template_path}` 中维护。\n"
        )
    };

    if !has_repository_template_asset {
        body.push_str(&format!(
            "- 当前业务模板资产目录 `{}` 下还没有模板文件 `{}`，先按业务结构补齐或构建模板，再进行模板校验和文档渲染。\n",
            normalize_display_path(&template_assets.repo_dir),
            current_skill_template_path
        ));
    }

    if is_eight_d_use_case(input) {
        body.push_str(
            r#"- 建议 JSON 至少包含以下结构：

```json
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
```

"#,
        );
    }

    if renderer_base_skill_id == DOCUMENT_TEMPLATE_SKILL_ID {
        body.push_str("- 先用 `validate_doc_template.js` 校验模板和 JSON 的匹配结果，再用 `render_doc_template.js` 输出 `docx`；如果用户要求，再进一步输出 `pdf`。\n");
    }

    body.push_str(
        "- 如果用户提供了自定义模板，优先改用用户模板，但仍保持“先结构化 JSON、再模板渲染”的流程。\n\n",
    );

    Some(body)
}

pub fn render_generated_skill_markdown(
    input: &StageOnboardingPackageInput,
    skill_id: &str,
    include_test_guidance: bool,
) -> String {
    let base_skill_ids = if input.selected_base_skill_ids.is_empty() {
        "无".to_string()
    } else {
        input.selected_base_skill_ids.join("、")
    };

    let agent_ids = if input.selected_agent_ids.is_empty() {
        "无".to_string()
    } else {
        input.selected_agent_ids.join("、")
    };

    let sanitized_description = strip_built_in_template_content(&input.use_case.description);
    let built_in_template_value = extract_built_in_template_value(&input.use_case.description);

    let mut body = format!(
        "---\nname: {skill_id}\ndescription: {role_name} - {use_case_name}\n---\n\n# {skill_id}\n\n## 配置信息\n\n- **岗位**: {role_name}\n- **用例**: {use_case_name}\n- **Agent**: {agent_ids}\n- **基础技能**: {base_skill_ids}\n\n## 用例说明\n\n{description}\n\n",
        skill_id = skill_id,
        role_name = input.role_name,
        use_case_name = input.use_case.use_case_name,
        agent_ids = agent_ids,
        base_skill_ids = base_skill_ids,
        description = sanitized_description,
    );

    if input.use_case.questions.is_empty() {
        body.push_str(&format!(
            "## 配置详情\n\n- **信息来源**: {info_sources}\n- **规则**: {rules}\n\n",
            info_sources = input.use_case.info_sources,
            rules = input.use_case.rules,
        ));
    } else {
        body.push_str("## 结构化填写\n\n");

        for question in &input.use_case.questions {
            let answer = resolve_effective_question_answer(
                &question.id,
                &question.answer,
                built_in_template_value.as_deref(),
                input.template_assets.as_ref(),
            );
            body.push_str(&format!("- **{}**: {}\n", question.label, answer));
        }

        body.push('\n');
    }

    if should_render_default_template_section(&input.use_case, built_in_template_value.as_deref()) {
        body.push_str("## 默认模板\n\n");
        body.push_str(built_in_template_value.as_deref().unwrap_or_default());
        body.push_str("\n\n");
    }

    if let Some(guidance) = build_use_case_template_asset_guidance(input) {
        body.push_str(&guidance);
    }

    if include_test_guidance {
        body.push_str(
            "## 测试环境说明\n\n- 将产生的结果存储到 `/tmp/skills-for-no-engineer`\n- 不要实际进行发送\n- 最终结果不要进行更新执行，而是打印出来。\n",
        );
    }

    body
}

fn stage_variant(
    input: &StageOnboardingPackageInput,
    skill_id: &str,
    include_test_guidance: bool,
    data_root: Option<&PathBuf>,
) -> Result<StagedOnboardingPackage, SkillError> {
    let source_dir = get_onboarding_staging_dir_with_data_root(data_root).join(skill_id);
    fs::create_dir_all(&source_dir).map_err(|error| SkillError::WriteError(error.to_string()))?;
    fs::write(
        source_dir.join("SKILL.md"),
        render_generated_skill_markdown(input, skill_id, include_test_guidance),
    )
    .map_err(|error| SkillError::WriteError(error.to_string()))?;
    stage_use_case_template_assets(&source_dir, input)?;

    Ok(StagedOnboardingPackage {
        skill_id: skill_id.to_string(),
        source_dir,
    })
}

pub fn stage_generated_use_case_skill_packages(
    input: &StageOnboardingPackageInput,
) -> Result<StagedOnboardingPackages, SkillError> {
    stage_generated_use_case_skill_packages_with_data_root(input, None)
}

fn stage_generated_use_case_skill_packages_with_data_root(
    input: &StageOnboardingPackageInput,
    data_root: Option<&PathBuf>,
) -> Result<StagedOnboardingPackages, SkillError> {
    if input.use_case_directory.trim().is_empty() {
        return Err(SkillError::WriteError(
            "Use case directory cannot be empty".to_string(),
        ));
    }

    let production_skill_id = format!("{}-{}", input.role_id, input.use_case_directory);
    let test_skill_id = format!("test-{}", production_skill_id);

    Ok(StagedOnboardingPackages {
        production: stage_variant(input, &production_skill_id, false, data_root)?,
        test: stage_variant(input, &test_skill_id, true, data_root)?,
    })
}

#[cfg(test)]
mod tests {
    use super::{
        stage_generated_use_case_skill_packages_with_data_root, OnboardingUseCaseTemplateAssets,
        StageOnboardingPackageInput,
    };
    use crate::models::OnboardingUseCaseQuestion;
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_data_dir(prefix: &str) -> PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("time went backwards")
            .as_nanos();
        let path = std::env::temp_dir().join(format!("sop-to-skill-{prefix}-{unique}"));
        fs::create_dir_all(&path).expect("create temp dir");
        path
    }

    use std::path::PathBuf;

    #[test]
    fn onboarding_stages_both_generated_package_variants_under_app_data_root() {
        let data_dir = temp_data_dir("onboarding-stage");

        let result = stage_generated_use_case_skill_packages_with_data_root(
            &StageOnboardingPackageInput {
                role_id: "project-manager".to_string(),
                role_name: "项目经理".to_string(),
                selected_agent_ids: vec!["codex".to_string(), "workbuddy".to_string()],
                selected_base_skill_ids: vec!["jira".to_string(), "confluence".to_string()],
                template_assets: None,
                use_case: crate::models::OnboardingRoleUseCaseContent {
                    role_id: "project-manager".to_string(),
                    use_case_id: "weekly-report".to_string(),
                    use_case_name: "项目周报".to_string(),
                    description: "按周报模板输出项目状态".to_string(),
                    description_locked: false,
                    info_sources: "Jira 看板、Confluence 模板".to_string(),
                    rules: "先风险后里程碑".to_string(),
                    questions: vec![],
                },
                use_case_directory: "weekly-report".to_string(),
            },
            Some(&data_dir),
        )
        .expect("stage packages");

        assert_eq!(result.production.skill_id, "project-manager-weekly-report");
        assert_eq!(result.test.skill_id, "test-project-manager-weekly-report");
        assert!(result.production.source_dir.starts_with(&data_dir));
        assert!(result.test.source_dir.starts_with(&data_dir));
        assert!(result.production.source_dir.join("SKILL.md").exists());
        assert!(result.test.source_dir.join("SKILL.md").exists());
        assert!(fs::read_to_string(result.test.source_dir.join("SKILL.md"))
            .expect("test skill md")
            .contains("/tmp/skills-for-no-engineer"));
    }

    #[test]
    fn onboarding_rejects_empty_use_case_directory() {
        let result = stage_generated_use_case_skill_packages_with_data_root(
            &StageOnboardingPackageInput {
                role_id: "project-manager".to_string(),
                role_name: "项目经理".to_string(),
                selected_agent_ids: vec!["codex".to_string()],
                selected_base_skill_ids: vec!["jira".to_string()],
                template_assets: None,
                use_case: crate::models::OnboardingRoleUseCaseContent {
                    role_id: "project-manager".to_string(),
                    use_case_id: "weekly-report".to_string(),
                    use_case_name: "项目周报".to_string(),
                    description: "按周报模板输出项目状态".to_string(),
                    description_locked: false,
                    info_sources: "Jira 看板".to_string(),
                    rules: "先风险后里程碑".to_string(),
                    questions: vec![],
                },
                use_case_directory: String::new(),
            },
            None,
        );

        assert!(result.is_err());
        assert_eq!(
            result.err().unwrap().to_string(),
            "Failed to write output file: Use case directory cannot be empty"
        );
    }

    #[test]
    fn onboarding_renders_structured_questions_into_generated_markdown() {
        let data_dir = temp_data_dir("onboarding-structured");

        let result = stage_generated_use_case_skill_packages_with_data_root(
            &StageOnboardingPackageInput {
                role_id: "project-manager".to_string(),
                role_name: "项目经理".to_string(),
                selected_agent_ids: vec!["codex".to_string()],
                selected_base_skill_ids: vec!["jira".to_string(), "confluence".to_string()],
                template_assets: None,
                use_case: crate::models::OnboardingRoleUseCaseContent {
                    role_id: "project-manager".to_string(),
                    use_case_id: "weekly-report".to_string(),
                    use_case_name: "项目周报".to_string(),
                    description: "汇总项目状态、风险和下周动作，形成标准化周报输出。".to_string(),
                    description_locked: true,
                    info_sources: "".to_string(),
                    rules: "".to_string(),
                    questions: vec![
                        OnboardingUseCaseQuestion {
                            id: "project-list-source".to_string(),
                            label: "从哪里获取负责的项目清单？".to_string(),
                            placeholder: "".to_string(),
                            required: true,
                            answer: "https://wiki.company.com/project-list".to_string(),
                            locked: true,
                        },
                        OnboardingUseCaseQuestion {
                            id: "weekly-report-sop".to_string(),
                            label: "从哪里获取周报 SOP？".to_string(),
                            placeholder: "".to_string(),
                            required: true,
                            answer: "https://wiki.company.com/pmo/weekly-report-template"
                                .to_string(),
                            locked: true,
                        },
                    ],
                },
                use_case_directory: "weekly-report".to_string(),
            },
            Some(&data_dir),
        )
        .expect("stage packages");

        let production_markdown = fs::read_to_string(result.production.source_dir.join("SKILL.md"))
            .expect("production skill md");

        assert!(production_markdown.contains("## 用例说明"));
        assert!(production_markdown.contains("汇总项目状态、风险和下周动作，形成标准化周报输出。"));
        assert!(production_markdown.contains("## 结构化填写"));
        assert!(production_markdown.contains("从哪里获取负责的项目清单？"));
        assert!(production_markdown.contains("https://wiki.company.com/project-list"));
        assert!(production_markdown.contains("从哪里获取周报 SOP？"));
        assert!(production_markdown.contains("https://wiki.company.com/pmo/weekly-report-template"));
        assert!(!production_markdown.contains("- **信息来源**:"));
        assert!(!production_markdown.contains("- **规则**:"));
    }

    #[test]
    fn onboarding_moves_built_in_template_content_out_of_use_case_summary_and_into_template_answers() {
        let data_dir = temp_data_dir("onboarding-template-fallback");

        let result = stage_generated_use_case_skill_packages_with_data_root(
            &StageOnboardingPackageInput {
                role_id: "project-manager".to_string(),
                role_name: "项目经理".to_string(),
                selected_agent_ids: vec!["codex".to_string()],
                selected_base_skill_ids: vec!["confluence".to_string()],
                template_assets: None,
                use_case: crate::models::OnboardingRoleUseCaseContent {
                    role_id: "project-manager".to_string(),
                    use_case_id: "weekly-report".to_string(),
                    use_case_name: "项目周报".to_string(),
                    description: "汇总项目状态、风险和下周动作，形成标准化周报输出。\n\n适合配置成固定节奏产出项目周报的助手。\n\n如果用户填写了公司 SOP / 模板链接，则优先采用用户提供的内容；未填写时，默认按以下模板整理：\n1. 本周进展：关键交付、完成情况、里程碑状态\n2. 风险与问题：新增风险、阻塞项、影响评估\n3. 下周计划：关键动作、责任人、目标时间\n4. 需要支持：待决策事项、资源需求、升级提醒\n\n输入（每次执行都需要提供给Skill的信息）：本周进展、风险、里程碑状态和下周计划。".to_string(),
                    description_locked: true,
                    info_sources: "".to_string(),
                    rules: "".to_string(),
                    questions: vec![
                        OnboardingUseCaseQuestion {
                            id: "project-list-source".to_string(),
                            label: "从哪里获取负责的项目清单？".to_string(),
                            placeholder: "".to_string(),
                            required: true,
                            answer: "https://wiki.company.com/project-list".to_string(),
                            locked: true,
                        },
                        OnboardingUseCaseQuestion {
                            id: "weekly-report-sop".to_string(),
                            label: "从哪里获取周报 SOP？".to_string(),
                            placeholder: "".to_string(),
                            required: true,
                            answer: "".to_string(),
                            locked: true,
                        },
                    ],
                },
                use_case_directory: "weekly-report".to_string(),
            },
            Some(&data_dir),
        )
        .expect("stage packages");

        let production_markdown = fs::read_to_string(result.production.source_dir.join("SKILL.md"))
            .expect("production skill md");

        assert!(production_markdown.contains("## 用例说明"));
        assert!(production_markdown.contains("汇总项目状态、风险和下周动作，形成标准化周报输出。"));
        assert!(!production_markdown.contains("默认按以下模板整理"));
        assert!(production_markdown.contains("输入（每次执行都需要提供给Skill的信息）：本周进展、风险、里程碑状态和下周计划。"));
        assert!(production_markdown.contains("- **从哪里获取周报 SOP？**: 1. 本周进展：关键交付、完成情况、里程碑状态"));
        assert!(production_markdown.contains("4. 需要支持：待决策事项、资源需求、升级提醒"));
    }

    #[test]
    fn onboarding_renders_document_template_guidance_for_eight_d_report() {
        let data_dir = temp_data_dir("onboarding-eight-d");

        let result = stage_generated_use_case_skill_packages_with_data_root(
            &StageOnboardingPackageInput {
                role_id: "qa-manager".to_string(),
                role_name: "质量经理".to_string(),
                selected_agent_ids: vec!["codex".to_string()],
                selected_base_skill_ids: vec![
                    "document-template".to_string(),
                    "jira".to_string(),
                ],
                template_assets: Some(OnboardingUseCaseTemplateAssets {
                    repo_dir: "skills/use-cases/eight-d-report-preparation".to_string(),
                    default_template_path: "templates/8d-report.docx".to_string(),
                    example_data_path: Some("examples/8d-report.sample.json".to_string()),
                    renderer_base_skill_id: "document-template".to_string(),
                }),
                use_case: crate::models::OnboardingRoleUseCaseContent {
                    role_id: "qa-manager".to_string(),
                    use_case_id: "eight-d-report-preparation".to_string(),
                    use_case_name: "8D报告出具".to_string(),
                    description: "基于质量异常或客诉记录，生成 8D 报告。".to_string(),
                    description_locked: true,
                    info_sources: "".to_string(),
                    rules: "".to_string(),
                    questions: vec![OnboardingUseCaseQuestion {
                        id: "eight-d-template-source".to_string(),
                        label: "如果要覆盖内置模板，从哪里获取用户指定的 8D 模板？".to_string(),
                        placeholder: "".to_string(),
                        required: false,
                        answer: "".to_string(),
                        locked: true,
                    }],
                },
                use_case_directory: "eight-d-report-preparation".to_string(),
            },
            Some(&data_dir),
        )
        .expect("stage packages");

        let production_markdown = fs::read_to_string(result.production.source_dir.join("SKILL.md"))
            .expect("production skill md");

        assert!(production_markdown.contains("document-template"));
        assert!(production_markdown.contains("skills/use-cases/eight-d-report-preparation"));
        assert!(production_markdown.contains("当前 8D Skill 目录中的 `templates/8d-report.docx`"));
        assert!(production_markdown.contains("如果当前 8D Skill 中还没有模板，先按 8D 报告结构补齐或构建模板"));
        assert!(production_markdown.contains("先整理成结构化 JSON"));
        assert!(production_markdown.contains("render_doc_template.js"));
        assert!(production_markdown.contains("8d-report.docx"));
        assert!(result
            .production
            .source_dir
            .join("templates")
            .join("8d-report.docx")
            .exists());
        assert!(result
            .production
            .source_dir
            .join("examples")
            .join("8d-report.sample.json")
            .exists());
    }

    #[test]
    fn onboarding_renders_non_docx_template_guidance_for_iso9001_internal_audit() {
        let data_dir = temp_data_dir("onboarding-iso9001-internal-audit");

        let result = stage_generated_use_case_skill_packages_with_data_root(
            &StageOnboardingPackageInput {
                role_id: "qa-manager".to_string(),
                role_name: "质量经理".to_string(),
                selected_agent_ids: vec!["codex".to_string()],
                selected_base_skill_ids: vec!["document-template".to_string()],
                template_assets: Some(OnboardingUseCaseTemplateAssets {
                    repo_dir: "skills/use-cases/iso9001-package-preparation".to_string(),
                    default_template_path: "templates/iso9001-internal-audit-checklist.xlsx"
                        .to_string(),
                    example_data_path: None,
                    renderer_base_skill_id: "document-template".to_string(),
                }),
                use_case: crate::models::OnboardingRoleUseCaseContent {
                    role_id: "qa-manager".to_string(),
                    use_case_id: "iso9001-package-preparation".to_string(),
                    use_case_name: "ISO9001内审检查表与资料包出具".to_string(),
                    description: "基于现有体系文件和记录，整理 ISO9001 内审检查表与资料包。"
                        .to_string(),
                    description_locked: true,
                    info_sources: "".to_string(),
                    rules: "".to_string(),
                    questions: vec![OnboardingUseCaseQuestion {
                        id: "iso9001-template-source".to_string(),
                        label:
                            "如果要覆盖内置模板，从哪里获取用户指定的 ISO9001 内审检查表模板？"
                                .to_string(),
                        placeholder: "".to_string(),
                        required: false,
                        answer: "".to_string(),
                        locked: true,
                    }],
                },
                use_case_directory: "iso9001-package-preparation".to_string(),
            },
            Some(&data_dir),
        )
        .expect("stage packages");

        let production_markdown = fs::read_to_string(result.production.source_dir.join("SKILL.md"))
            .expect("production skill md");

        assert!(production_markdown.contains(
            "当前业务 Skill 目录中的 `templates/iso9001-internal-audit-checklist.xlsx`"
        ));
        assert!(production_markdown.contains(
            "生成 Skill 时会将模板复制到当前业务 Skill 目录的 `templates/iso9001-internal-audit-checklist.xlsx`"
        ));
        assert!(production_markdown.contains("输出应至少包含内审检查表文件和内审资料包压缩包"));
        assert!(production_markdown.contains("目录应与内审检查表中的条款目录保持一致"));
        assert!(production_markdown.contains("页面类证据先导出为文件"));
        assert!(!production_markdown.contains("skills/use-cases/iso9001-package-preparation"));
        assert!(!production_markdown.contains("render_doc_template.js"));
        assert!(!production_markdown.contains("生成正式文档"));
        assert!(result
            .production
            .source_dir
            .join("templates")
            .join("iso9001-internal-audit-checklist.xlsx")
            .exists());
    }

    #[test]
    fn onboarding_uses_local_template_path_as_blank_template_answer_when_assets_are_staged() {
        let data_dir = temp_data_dir("onboarding-iso9001-template-answer");

        let result = stage_generated_use_case_skill_packages_with_data_root(
            &StageOnboardingPackageInput {
                role_id: "qa-manager".to_string(),
                role_name: "质量经理".to_string(),
                selected_agent_ids: vec!["codex".to_string()],
                selected_base_skill_ids: vec!["document-template".to_string()],
                template_assets: Some(OnboardingUseCaseTemplateAssets {
                    repo_dir: "skills/use-cases/iso9001-package-preparation".to_string(),
                    default_template_path: "templates/iso9001-internal-audit-checklist.xlsx"
                        .to_string(),
                    example_data_path: None,
                    renderer_base_skill_id: "document-template".to_string(),
                }),
                use_case: crate::models::OnboardingRoleUseCaseContent {
                    role_id: "qa-manager".to_string(),
                    use_case_id: "iso9001-package-preparation".to_string(),
                    use_case_name: "ISO9001内审检查表与资料包出具".to_string(),
                    description: "基于现有体系文件和记录，整理一套用于 ISO9001 内审的检查表和资料包。\n\n适合配置成质量经理按审核范围快速整理内审资料、识别缺口并给出补件清单的助手。\n\n如果用户填写了模板链接，则优先采用用户模板；未填写时，默认按以下模板整理：\n默认使用当前 ISO9001 内审 Skill 自带的 Excel 检查表模板 `templates/iso9001-internal-audit-checklist.xlsx`，该模板资产在仓库目录 `skills/use-cases/iso9001-package-preparation/` 中维护。\n内审检查表目录默认参考 `ISO9001：内审检查表.xlsx` 的条款结构，例如 4.1、4.2、4.3、4.4、5.1.1、9.2、9.3、10.2、10.3。\n输出内容：\n1. 内审检查表文件：基于内置 Excel 检查表模板填写本次内审记录\n2. 内审资料包压缩包：按检查表目录整理内审参考文件、体系文件、过程记录和导出后的页面文件\n\n输入（每次执行都需要提供给Skill的信息）：本次内审的审核范围、客户 / 工厂 / 项目名称，以及时间范围。".to_string(),
                    description_locked: true,
                    info_sources: "".to_string(),
                    rules: "".to_string(),
                    questions: vec![OnboardingUseCaseQuestion {
                        id: "iso9001-template-source".to_string(),
                        label:
                            "如果要覆盖内置模板，从哪里获取用户指定的 ISO9001 内审检查表模板？"
                                .to_string(),
                        placeholder: "".to_string(),
                        required: false,
                        answer: "".to_string(),
                        locked: true,
                    }],
                },
                use_case_directory: "iso9001-package-preparation".to_string(),
            },
            Some(&data_dir),
        )
        .expect("stage packages");

        let production_markdown = fs::read_to_string(result.production.source_dir.join("SKILL.md"))
            .expect("production skill md");

        assert!(production_markdown.contains(
            "- **如果要覆盖内置模板，从哪里获取用户指定的 ISO9001 内审检查表模板？**: 留空时默认使用当前 Skill 目录中的 `templates/iso9001-internal-audit-checklist.xlsx`"
        ));
        assert!(!production_markdown.contains(
            "- **如果要覆盖内置模板，从哪里获取用户指定的 ISO9001 内审检查表模板？**: 默认使用当前 ISO9001 内审 Skill 自带的 Excel 检查表模板"
        ));
        assert!(!production_markdown.contains("该模板资产在仓库目录"));
    }
}
