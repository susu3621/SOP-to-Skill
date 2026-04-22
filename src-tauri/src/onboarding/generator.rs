use crate::models::OnboardingRoleUseCaseContent;
use crate::models::SkillError;
use crate::template::{get_data_root, get_skills_dir};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct StageOnboardingPackageInput {
    pub role_id: String,
    pub role_name: String,
    pub selected_agent_ids: Vec<String>,
    pub selected_base_skill_ids: Vec<String>,
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
const EIGHT_D_TEMPLATE_RELATIVE_PATH: &str = "templates/8d-report.docx";
const DOCUMENT_TEMPLATE_SKILL_ID: &str = "document-template";

fn is_eight_d_use_case(input: &StageOnboardingPackageInput) -> bool {
    input.use_case.use_case_id == EIGHT_D_USE_CASE_ID
}

fn resolve_eight_d_seed_template_path() -> Option<PathBuf> {
    let runtime_template = get_skills_dir()
        .join(DOCUMENT_TEMPLATE_SKILL_ID)
        .join(EIGHT_D_TEMPLATE_RELATIVE_PATH);
    if runtime_template.exists() {
        return Some(runtime_template);
    }

    let repository_template = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("skills")
        .join(DOCUMENT_TEMPLATE_SKILL_ID)
        .join(EIGHT_D_TEMPLATE_RELATIVE_PATH);
    if repository_template.exists() {
        return Some(repository_template);
    }

    None
}

fn seed_eight_d_template(source_dir: &Path) -> Result<(), SkillError> {
    let Some(source_template) = resolve_eight_d_seed_template_path() else {
        return Ok(());
    };

    let destination_template = source_dir.join(EIGHT_D_TEMPLATE_RELATIVE_PATH);
    let Some(parent_dir) = destination_template.parent() else {
        return Ok(());
    };

    fs::create_dir_all(parent_dir).map_err(|error| SkillError::WriteError(error.to_string()))?;
    fs::copy(&source_template, &destination_template)
        .map_err(|error| SkillError::WriteError(error.to_string()))?;

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
) -> String {
    let trimmed_answer = answer.trim();
    if !trimmed_answer.is_empty() {
        return trimmed_answer.to_string();
    }

    if is_built_in_template_question(question_id) {
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

fn build_eight_d_document_template_guidance(input: &StageOnboardingPackageInput) -> Option<String> {
    if !is_eight_d_use_case(input)
        || !input
            .selected_base_skill_ids
            .iter()
            .any(|skill_id| skill_id == DOCUMENT_TEMPLATE_SKILL_ID)
    {
        return None;
    }

    Some(
        r#"## 默认模板出具流程

- 默认情况下，使用当前 8D Skill 目录中的 `templates/8d-report.docx` 作为模板，并调用 `document-template` 基础技能来生成正式 8D 报告。
- 如果用户没有提供外部模板链接，优先使用当前 8D Skill 自带模板；如果当前 8D Skill 中还没有模板，先按 8D 报告结构补齐或构建模板。
- 先整理成结构化 JSON，再进行模板校验和文档渲染。
- 建议 JSON 至少包含以下结构：

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

- 先用 `validate_doc_template.js` 校验模板和 JSON 的匹配结果，再用 `render_doc_template.js` 输出 `docx`；如果用户要求，再进一步输出 `pdf`。
- 如果用户提供了自定义模板，优先改用用户模板，但仍保持“先结构化 JSON、再模板渲染”的流程。

"#
        .to_string(),
    )
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

    if let Some(guidance) = build_eight_d_document_template_guidance(input) {
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
    if is_eight_d_use_case(input) {
        seed_eight_d_template(&source_dir)?;
    }

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
        stage_generated_use_case_skill_packages_with_data_root, StageOnboardingPackageInput,
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
    }
}
