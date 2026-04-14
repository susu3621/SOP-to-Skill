use crate::commands::skill::{self, SkillResult};
use crate::models::{
    GeneratedSkillIds, OnboardingAgentState, OnboardingAgentSyncPreview, OnboardingState,
    OnboardingSyncPlan, OnboardingUseCase,
};
use crate::onboarding::{
    generator::{
        stage_generated_use_case_skill_packages, StageOnboardingPackageInput,
        StagedOnboardingPackages,
    },
    state::{
        default_selected_install_skill_ids, generated_skill_ids_for_use_case,
        resolve_selected_install_skill_ids,
    },
    sync::build_selected_agent_install_sync_plans,
};
use crate::template::{get_output_dir, get_skills_dir};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use std::collections::HashSet;
use std::fs;
use std::io::ErrorKind;
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::process::{Command, Output, Stdio};
use std::sync::mpsc;
use std::thread;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter};

use super::{migrate_storage_metadata, parse_json_with_optional_utf8_bom};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct OnboardingInstallPreview {
    pub install_candidate_skill_ids: Vec<String>,
    pub generated_skill_ids: Vec<GeneratedSkillIds>,
    pub selected_agent_ids: Vec<String>,
    pub selected_install_skill_ids: Vec<String>,
    pub agent_previews: Vec<OnboardingAgentSyncPreview>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct OnboardingAgentSyncResult {
    pub agent_id: String,
    pub added_skill_ids: Vec<String>,
    pub removed_skill_ids: Vec<String>,
    pub unchanged_skill_ids: Vec<String>,
    pub success: bool,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct OnboardingBatchSyncResult {
    pub selected_agent_ids: Vec<String>,
    pub selected_install_skill_ids: Vec<String>,
    pub agent_results: Vec<OnboardingAgentSyncResult>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct OnboardingSyncCommandInput {
    pub state: OnboardingState,
    pub selected_use_cases: Vec<OnboardingUseCase>,
    pub agents: Vec<OnboardingAgentState>,
    #[serde(default)]
    pub staged_packages: Vec<StagedOnboardingPackages>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct OnboardingConnectionTestInput {
    pub service_id: String,
    pub credential_values: HashMap<String, String>,
    pub trigger: String,
    pub tested_fingerprint: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct OnboardingConnectionTestResult {
    pub service_id: String,
    pub success: bool,
    pub status: String,
    pub summary: String,
    pub details: String,
    pub trigger: String,
    pub tested_fingerprint: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct OnboardingEnvironmentCheckInput {
    pub service_id: String,
    pub credential_values: HashMap<String, String>,
    pub trigger: String,
    pub tested_fingerprint: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct OnboardingEnvironmentRequirement {
    pub id: String,
    pub label: String,
    pub required: bool,
    pub status: String,
    pub details: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct OnboardingEnvironmentCheckResult {
    pub service_id: String,
    pub platform: String,
    pub status: String,
    pub summary: String,
    pub details: String,
    pub requirements: Vec<OnboardingEnvironmentRequirement>,
    pub missing_requirement_ids: Vec<String>,
    pub install_supported: bool,
    pub install_support_message: String,
    pub trigger: String,
    pub tested_fingerprint: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct OnboardingEnvironmentInstallInput {
    pub install_id: String,
    pub service_id: String,
    pub credential_values: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct OnboardingEnvironmentInstallResult {
    pub install_id: String,
    pub service_id: String,
    pub success: bool,
    pub summary: String,
    pub details: String,
    pub installed_requirement_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct OnboardingEnvironmentInstallProgressEvent {
    pub install_id: String,
    pub service_id: String,
    pub status: String,
    pub progress_percent: u8,
    pub step: String,
    pub log_line: Option<String>,
}

#[derive(Debug, Clone, Deserialize, PartialEq, Eq)]
struct ScriptConnectionTestResult {
    service_id: String,
    success: bool,
    status: String,
    summary: String,
    details: String,
}

struct OnboardingConnectionServiceConfig {
    service_id: &'static str,
    required_field_ids: &'static [&'static str],
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct OnboardingEnvironmentRequirementSpec {
    id: String,
    label: String,
    required: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct OnboardingEnvironmentInstallStep {
    requirement_id: String,
    label: String,
    program: String,
    args: Vec<String>,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum OnboardingEnvironmentPlatform {
    MacOS,
    Windows,
    Unsupported,
}

const HOME_ENV_FILE_NAME: &str = ".env";
const ONBOARDING_MANAGED_ENV_KEYS: &[&str] = &[
    "CONFLUENCE_URL",
    "CONFLUENCE_USERNAME",
    "CONFLUENCE_PASSWORD",
    "GERRIT_AUTH_MODE",
    "GERRIT_URL",
    "GERRIT_USERNAME",
    "GERRIT_PASSWORD",
    "GERRIT_SSH_HOST",
    "GERRIT_SSH_PORT",
    "GERRIT_SSH_USERNAME",
    "JIRA_URL",
    "JIRA_USERNAME",
    "JIRA_PASSWORD",
    "SVN_URL",
    "SVN_USERNAME",
    "SVN_PASSWORD",
    "LINUX_DEVICES_JSON",
    "MAIL_HOST",
    "MAIL_PORT",
    "MAIL_USERNAME",
    "MAIL_PASSWORD",
    "MAIL_FROM",
    "MAIL_USE_SSL",
    "MAIL_USE_STARTTLS",
];
const CONNECTION_TEST_SCRIPT_NAME: &str = "test_connection.py";
const ONBOARDING_CONNECTION_SERVICES: &[OnboardingConnectionServiceConfig] = &[
    OnboardingConnectionServiceConfig {
        service_id: "confluence",
        required_field_ids: &["confluenceUrl", "confluenceUsername", "confluencePassword"],
    },
    OnboardingConnectionServiceConfig {
        service_id: "jira",
        required_field_ids: &["jiraUrl", "jiraUsername", "jiraPassword"],
    },
    OnboardingConnectionServiceConfig {
        service_id: "gerrit",
        required_field_ids: &[],
    },
    OnboardingConnectionServiceConfig {
        service_id: "svn",
        required_field_ids: &["svnUrl", "svnUsername", "svnPassword"],
    },
    OnboardingConnectionServiceConfig {
        service_id: "linux",
        required_field_ids: &[
            "linuxDeviceName",
            "linuxHost",
            "linuxUsername",
            "linuxPassword",
        ],
    },
    OnboardingConnectionServiceConfig {
        service_id: "mail",
        required_field_ids: &["mailUsername", "mailPassword"],
    },
];

impl OnboardingEnvironmentPlatform {
    fn as_str(&self) -> &'static str {
        match self {
            Self::MacOS => "macos",
            Self::Windows => "windows",
            Self::Unsupported => "unsupported",
        }
    }
}

fn current_onboarding_environment_platform() -> OnboardingEnvironmentPlatform {
    #[cfg(target_os = "macos")]
    {
        OnboardingEnvironmentPlatform::MacOS
    }

    #[cfg(target_os = "windows")]
    {
        OnboardingEnvironmentPlatform::Windows
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        OnboardingEnvironmentPlatform::Unsupported
    }
}

fn build_onboarding_environment_requirements(
    service_id: &str,
    credential_values: &HashMap<String, String>,
) -> Result<Vec<OnboardingEnvironmentRequirementSpec>, String> {
    match service_id {
        "confluence" | "jira" | "mail" => Ok(vec![OnboardingEnvironmentRequirementSpec {
            id: "python3".to_string(),
            label: "Python 3".to_string(),
            required: true,
        }]),
        "svn" => Ok(vec![
            OnboardingEnvironmentRequirementSpec {
                id: "python3".to_string(),
                label: "Python 3".to_string(),
                required: true,
            },
            OnboardingEnvironmentRequirementSpec {
                id: "svn".to_string(),
                label: "SVN".to_string(),
                required: true,
            },
        ]),
        "linux" => Ok(vec![
            OnboardingEnvironmentRequirementSpec {
                id: "python3".to_string(),
                label: "Python 3".to_string(),
                required: true,
            },
            OnboardingEnvironmentRequirementSpec {
                id: "paramiko".to_string(),
                label: "Paramiko".to_string(),
                required: true,
            },
        ]),
        "gerrit" => {
            let auth_mode = credential_values
                .get("gerritAuthMode")
                .map(|value| value.trim())
                .filter(|value| !value.is_empty())
                .unwrap_or("http");
            let mut requirements = vec![
                OnboardingEnvironmentRequirementSpec {
                    id: "python3".to_string(),
                    label: "Python 3".to_string(),
                    required: true,
                },
                OnboardingEnvironmentRequirementSpec {
                    id: "git".to_string(),
                    label: "Git".to_string(),
                    required: true,
                },
            ];

            if auth_mode == "ssh" {
                requirements.push(OnboardingEnvironmentRequirementSpec {
                    id: "ssh".to_string(),
                    label: "SSH".to_string(),
                    required: true,
                });
            }

            Ok(requirements)
        }
        _ => Err(format!(
            "Unsupported onboarding service for environment checks: {}",
            service_id
        )),
    }
}

fn build_onboarding_environment_install_steps(
    platform: OnboardingEnvironmentPlatform,
    missing_requirement_ids: &[String],
) -> Result<Vec<OnboardingEnvironmentInstallStep>, String> {
    let mut steps: Vec<OnboardingEnvironmentInstallStep> = Vec::new();
    let mut added_requirements = HashSet::new();

    for requirement_id in missing_requirement_ids {
        if !added_requirements.insert(requirement_id.clone()) {
            continue;
        }

        let requirement_steps =
            match platform {
                OnboardingEnvironmentPlatform::MacOS => match requirement_id.as_str() {
                    "python3" => vec![OnboardingEnvironmentInstallStep {
                        requirement_id: requirement_id.clone(),
                        label: "Python 3".to_string(),
                        program: "brew".to_string(),
                        args: vec!["install".to_string(), "python".to_string()],
                    }],
                    "git" => vec![OnboardingEnvironmentInstallStep {
                        requirement_id: requirement_id.clone(),
                        label: "Git".to_string(),
                        program: "brew".to_string(),
                        args: vec!["install".to_string(), "git".to_string()],
                    }],
                    "svn" => vec![OnboardingEnvironmentInstallStep {
                        requirement_id: requirement_id.clone(),
                        label: "SVN".to_string(),
                        program: "brew".to_string(),
                        args: vec!["install".to_string(), "subversion".to_string()],
                    }],
                    "ssh" => vec![OnboardingEnvironmentInstallStep {
                        requirement_id: requirement_id.clone(),
                        label: "SSH".to_string(),
                        program: "brew".to_string(),
                        args: vec!["install".to_string(), "openssh".to_string()],
                    }],
                    "paramiko" => vec![OnboardingEnvironmentInstallStep {
                        requirement_id: requirement_id.clone(),
                        label: "Paramiko".to_string(),
                        program: "python3".to_string(),
                        args: vec![
                            "-m".to_string(),
                            "pip".to_string(),
                            "install".to_string(),
                            "-r".to_string(),
                            linux_requirements_path()?.display().to_string(),
                        ],
                    }],
                    _ => {
                        return Err(format!(
                            "Unsupported environment requirement for macOS install: {}",
                            requirement_id
                        ))
                    }
                },
                OnboardingEnvironmentPlatform::Windows => match requirement_id.as_str() {
                    "python3" => vec![OnboardingEnvironmentInstallStep {
                        requirement_id: requirement_id.clone(),
                        label: "Python 3".to_string(),
                        program: "winget".to_string(),
                        args: vec![
                            "install".to_string(),
                            "--id".to_string(),
                            "Python.Python.3.12".to_string(),
                            "-e".to_string(),
                            "--accept-source-agreements".to_string(),
                            "--accept-package-agreements".to_string(),
                        ],
                    }],
                    "git" | "ssh" => vec![OnboardingEnvironmentInstallStep {
                        requirement_id: requirement_id.clone(),
                        label: if requirement_id == "ssh" {
                            "SSH".to_string()
                        } else {
                            "Git".to_string()
                        },
                        program: "winget".to_string(),
                        args: vec![
                            "install".to_string(),
                            "--id".to_string(),
                            "Git.Git".to_string(),
                            "-e".to_string(),
                            "--accept-source-agreements".to_string(),
                            "--accept-package-agreements".to_string(),
                        ],
                    }],
                    "svn" => vec![OnboardingEnvironmentInstallStep {
                        requirement_id: requirement_id.clone(),
                        label: "SVN".to_string(),
                        program: "winget".to_string(),
                        args: vec![
                            "install".to_string(),
                            "--id".to_string(),
                            "TortoiseSVN.TortoiseSVN".to_string(),
                            "-e".to_string(),
                            "--accept-source-agreements".to_string(),
                            "--accept-package-agreements".to_string(),
                            "--custom".to_string(),
                            "ADDLOCAL=ALL".to_string(),
                        ],
                    }],
                    "paramiko" => vec![OnboardingEnvironmentInstallStep {
                        requirement_id: requirement_id.clone(),
                        label: "Paramiko".to_string(),
                        program: "python".to_string(),
                        args: vec![
                            "-m".to_string(),
                            "pip".to_string(),
                            "install".to_string(),
                            "-r".to_string(),
                            linux_requirements_path()?.display().to_string(),
                        ],
                    }],
                    _ => {
                        return Err(format!(
                            "Unsupported environment requirement for Windows install: {}",
                            requirement_id
                        ))
                    }
                },
                OnboardingEnvironmentPlatform::Unsupported => return Err(
                    "Automatic environment installation is only supported on macOS and Windows."
                        .to_string(),
                ),
            };

        for step in requirement_steps {
            let already_has_same_command = steps
                .iter()
                .any(|existing| existing.program == step.program && existing.args == step.args);

            if !already_has_same_command {
                steps.push(step);
            }
        }
    }

    Ok(steps)
}

#[cfg_attr(not(windows), allow(dead_code))]
fn merge_windows_search_path_values<'a, I>(values: I) -> String
where
    I: IntoIterator<Item = &'a str>,
{
    let mut merged = Vec::new();
    let mut seen = HashSet::new();

    for value in values {
        for segment in value.split(';') {
            let trimmed = segment.trim();
            if trimmed.is_empty() {
                continue;
            }

            let normalized = trimmed.to_ascii_lowercase();
            if seen.insert(normalized) {
                merged.push(trimmed.to_string());
            }
        }
    }

    merged.join(";")
}

#[cfg_attr(windows, allow(dead_code))]
fn merge_unix_search_path_values<'a, I>(values: I) -> String
where
    I: IntoIterator<Item = &'a str>,
{
    let mut merged = Vec::new();
    let mut seen = HashSet::new();

    for value in values {
        for segment in value.split(':') {
            let trimmed = segment.trim();
            if trimmed.is_empty() {
                continue;
            }

            if seen.insert(trimmed.to_string()) {
                merged.push(trimmed.to_string());
            }
        }
    }

    merged.join(":")
}

const LOGIN_SHELL_PATH_MARKER: &str = "__SKILL_CONFIGURATOR_LOGIN_PATH__=";

#[cfg(target_os = "macos")]
fn login_shell_candidates() -> Vec<String> {
    let mut candidates = Vec::new();

    if let Ok(shell) = std::env::var("SHELL") {
        let trimmed = shell.trim();
        if !trimmed.is_empty() {
            candidates.push(trimmed.to_string());
        }
    }

    for shell in ["/bin/zsh", "/bin/bash", "/bin/sh"] {
        if !candidates.iter().any(|candidate| candidate == shell) {
            candidates.push(shell.to_string());
        }
    }

    candidates
}

#[cfg(target_os = "macos")]
fn parse_login_shell_search_path(output: &str) -> Option<String> {
    output.lines().rev().find_map(|line| {
        line.trim()
            .strip_prefix(LOGIN_SHELL_PATH_MARKER)
            .map(str::trim)
            .filter(|path| !path.is_empty())
            .map(ToOwned::to_owned)
    })
}

#[cfg(target_os = "macos")]
fn resolve_macos_login_shell_search_path() -> Option<String> {
    for shell in login_shell_candidates() {
        let mut command = Command::new(&shell);
        command.arg("-lc");
        command.arg(format!(
            "printf '{}%s\\n' \"$PATH\"",
            LOGIN_SHELL_PATH_MARKER
        ));

        let output = match command.output() {
            Ok(output) => output,
            Err(_) => continue,
        };

        if !output.status.success() {
            continue;
        }

        let stdout = trim_process_output(&output.stdout);
        if let Some(path) = parse_login_shell_search_path(&stdout) {
            return Some(path);
        }
    }

    None
}

#[cfg(not(target_os = "macos"))]
fn resolve_macos_login_shell_search_path() -> Option<String> {
    None
}

fn resolve_process_search_path_from_values(
    platform: OnboardingEnvironmentPlatform,
    current_path: Option<String>,
    login_shell_path: Option<String>,
) -> Option<String> {
    match platform {
        OnboardingEnvironmentPlatform::MacOS => {
            let current_path = current_path.unwrap_or_default();
            let login_shell_path = login_shell_path.unwrap_or_default();
            let merged =
                merge_unix_search_path_values([login_shell_path.as_str(), current_path.as_str()]);

            if merged.is_empty() {
                None
            } else {
                Some(merged)
            }
        }
        OnboardingEnvironmentPlatform::Windows | OnboardingEnvironmentPlatform::Unsupported => {
            current_path
                .map(|path| path.trim().to_string())
                .filter(|path| !path.is_empty())
        }
    }
}

fn resolve_process_search_path() -> Option<String> {
    let platform = current_onboarding_environment_platform();
    let current_path = std::env::var("PATH").ok();
    let login_shell_path = match platform {
        OnboardingEnvironmentPlatform::MacOS => resolve_macos_login_shell_search_path(),
        OnboardingEnvironmentPlatform::Windows | OnboardingEnvironmentPlatform::Unsupported => None,
    };

    resolve_process_search_path_from_values(platform, current_path, login_shell_path)
}

fn configure_onboarding_command(command: &mut Command) {
    if let Some(path) = resolve_process_search_path() {
        command.env("PATH", path);
    }

    command.env("PYTHONUTF8", "1");
    command.env("PYTHONIOENCODING", "UTF-8");
}

fn command_output_with_search_path(
    program: &str,
    args: &[&str],
    search_path: Option<&str>,
) -> Result<Output, std::io::Error> {
    let mut command = Command::new(program);
    if let Some(path) = search_path.filter(|path| !path.trim().is_empty()) {
        command.env("PATH", path);
    }
    command.args(args);
    command.output()
}

fn command_output_with_search_path_owned(
    program: &str,
    args: &[String],
    search_path: Option<&str>,
) -> Result<Output, std::io::Error> {
    let arg_refs = args.iter().map(String::as_str).collect::<Vec<_>>();
    command_output_with_search_path(program, &arg_refs, search_path)
}

fn probe_command_output(program: &str, args: &[&str]) -> Result<Output, std::io::Error> {
    let search_path = resolve_process_search_path();
    command_output_with_search_path(program, args, search_path.as_deref())
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct CommandSpec {
    program: String,
    args: Vec<String>,
}

fn command_spec(program: &str, args: &[&str]) -> CommandSpec {
    CommandSpec {
        program: program.to_string(),
        args: args.iter().map(|arg| arg.to_string()).collect(),
    }
}

fn build_requirement_probe_candidates(requirement_id: &str) -> Result<Vec<CommandSpec>, String> {
    match requirement_id {
        "python3" => Ok(python_command_candidates()
            .into_iter()
            .map(|candidate| {
                let mut args = candidate.args;
                args.push("--version".to_string());
                CommandSpec {
                    program: candidate.program,
                    args,
                }
            })
            .collect()),
        "git" => Ok(vec![command_spec("git", &["--version"])]),
        "svn" => Ok(vec![command_spec("svn", &["--version", "--quiet"])]),
        "ssh" => Ok(vec![command_spec("ssh", &["-V"])]),
        "paramiko" => Ok(python_command_candidates()
            .into_iter()
            .map(|candidate| {
                let mut args = candidate.args;
                args.push("-c".to_string());
                args.push("import paramiko; print(paramiko.__version__)".to_string());
                CommandSpec {
                    program: candidate.program,
                    args,
                }
            })
            .collect()),
        _ => Err(format!(
            "Unsupported environment requirement probe: {}",
            requirement_id
        )),
    }
}

fn probe_requirement_with_runner<F>(
    requirement_id: &str,
    mut runner: F,
) -> Result<(String, String), String>
where
    F: FnMut(&str, &[String]) -> Result<Output, std::io::Error>,
{
    let probe_candidates = build_requirement_probe_candidates(requirement_id)?;
    let mut last_failure_detail: Option<String> = None;

    for candidate in probe_candidates {
        match runner(&candidate.program, &candidate.args) {
            Ok(output) => {
                let stdout = trim_process_output(&output.stdout);
                let stderr = trim_process_output(&output.stderr);

                if output.status.success() {
                    let details = first_non_empty_line(&stdout)
                        .or_else(|| first_non_empty_line(&stderr))
                        .unwrap_or_else(|| format!("{} available", candidate.program));

                    return Ok(("ready".to_string(), details));
                }

                last_failure_detail = first_non_empty_line(&stderr)
                    .or_else(|| first_non_empty_line(&stdout))
                    .or_else(|| Some(format!("{} probe failed", candidate.program)));
            }
            Err(error) if error.kind() == ErrorKind::NotFound => continue,
            Err(error) => {
                return Err(format!(
                    "Failed to probe {} using {}: {}",
                    requirement_id, candidate.program, error
                ))
            }
        }
    }

    Ok((
        "missing".to_string(),
        last_failure_detail.unwrap_or_else(|| format!("{} not found in PATH", requirement_id)),
    ))
}

fn resolve_available_python_command_with_runner<F>(mut runner: F) -> Result<CommandSpec, String>
where
    F: FnMut(&str, &[String]) -> Result<Output, std::io::Error>,
{
    let mut last_failure_detail: Option<String> = None;

    for candidate in python_command_candidates() {
        let mut probe_args = candidate.args.clone();
        probe_args.push("--version".to_string());

        match runner(&candidate.program, &probe_args) {
            Ok(output) => {
                if output.status.success() {
                    return Ok(candidate);
                }

                let stdout = trim_process_output(&output.stdout);
                let stderr = trim_process_output(&output.stderr);
                last_failure_detail = first_non_empty_line(&stderr)
                    .or_else(|| first_non_empty_line(&stdout))
                    .or_else(|| Some(format!("{} probe failed", candidate.program)));
            }
            Err(error) if error.kind() == ErrorKind::NotFound => continue,
            Err(error) => {
                return Err(format!(
                    "Failed to probe python runtime using {}: {}",
                    candidate.program, error
                ))
            }
        }
    }

    Err(last_failure_detail.unwrap_or_else(|| {
        "Python runtime not found. Install python3 or python to run bundled connection tests."
            .to_string()
    }))
}

fn resolve_available_python_command() -> Result<CommandSpec, String> {
    let search_path = resolve_process_search_path();
    resolve_available_python_command_with_runner(|program, args| {
        command_output_with_search_path_owned(program, args, search_path.as_deref())
    })
}

fn resolve_install_step_command_with_runner<F>(
    step: &OnboardingEnvironmentInstallStep,
    platform: OnboardingEnvironmentPlatform,
    runner: F,
) -> Result<CommandSpec, String>
where
    F: FnMut(&str, &[String]) -> Result<Output, std::io::Error>,
{
    if platform == OnboardingEnvironmentPlatform::Windows && step.requirement_id == "paramiko" {
        let mut command = resolve_available_python_command_with_runner(runner)?;
        command.args.extend(step.args.clone());
        return Ok(command);
    }

    Ok(CommandSpec {
        program: step.program.clone(),
        args: step.args.clone(),
    })
}

fn resolve_install_step_command(
    step: &OnboardingEnvironmentInstallStep,
    platform: OnboardingEnvironmentPlatform,
) -> Result<CommandSpec, String> {
    let search_path = resolve_process_search_path();
    resolve_install_step_command_with_runner(step, platform, |program, args| {
        command_output_with_search_path_owned(program, args, search_path.as_deref())
    })
}

const WINDOWS_PARAMIKO_MIRROR_INDEX_URL: &str = "https://mirrors.aliyun.com/pypi/simple/";
const WINDOWS_PARAMIKO_MIRROR_HOST: &str = "mirrors.aliyun.com";

fn build_windows_paramiko_mirror_install_args(base_args: &[String]) -> Vec<String> {
    let mut args = Vec::with_capacity(base_args.len() + 5);
    let mut inserted = false;

    for arg in base_args {
        args.push(arg.clone());

        if !inserted && arg == "install" {
            args.extend([
                "--disable-pip-version-check".to_string(),
                "-i".to_string(),
                WINDOWS_PARAMIKO_MIRROR_INDEX_URL.to_string(),
                "--trusted-host".to_string(),
                WINDOWS_PARAMIKO_MIRROR_HOST.to_string(),
            ]);
            inserted = true;
        }
    }

    if !inserted {
        args.extend([
            "--disable-pip-version-check".to_string(),
            "-i".to_string(),
            WINDOWS_PARAMIKO_MIRROR_INDEX_URL.to_string(),
            "--trusted-host".to_string(),
            WINDOWS_PARAMIKO_MIRROR_HOST.to_string(),
        ]);
    }

    args
}

fn should_retry_windows_paramiko_install_with_mirror(output_lines: &[String]) -> bool {
    let joined_output = output_lines.join("\n").to_ascii_lowercase();
    let mentions_pypi = joined_output.contains("pypi.org")
        || joined_output.contains("/simple/paramiko/")
        || joined_output.contains("httpsconnectionpool(host='pypi.org'");
    let mentions_tls_failure = joined_output.contains("ssl")
        || joined_output.contains("tls")
        || joined_output.contains("schannel")
        || joined_output.contains("unexpected_eof_while_reading")
        || joined_output.contains("problem confirming the ssl certificate")
        || joined_output.contains("failed to receive handshake");

    mentions_pypi && mentions_tls_failure
}

fn build_windows_paramiko_mirror_install_command(command: &CommandSpec) -> CommandSpec {
    CommandSpec {
        program: command.program.clone(),
        args: build_windows_paramiko_mirror_install_args(&command.args),
    }
}

#[cfg(windows)]
fn read_windows_environment_variable(name: &str, target: &str) -> Result<String, String> {
    let script = format!("[Environment]::GetEnvironmentVariable('{name}','{target}')");
    let args = vec!["-NoProfile", "-NonInteractive", "-Command", script.as_str()];
    let output = probe_command_output("powershell", &args).map_err(|error| {
        format!(
            "Failed to read Windows environment variable {} from {} scope: {}",
            name, target, error
        )
    })?;

    if !output.status.success() {
        let stderr = trim_process_output(&output.stderr);
        return Err(format!(
            "Failed to read Windows environment variable {} from {} scope: {}",
            name,
            target,
            if stderr.is_empty() {
                output.status.to_string()
            } else {
                stderr
            }
        ));
    }

    Ok(trim_process_output(&output.stdout))
}

#[cfg(windows)]
fn refresh_windows_process_environment() -> Result<(), String> {
    let current_path = std::env::var("PATH").unwrap_or_default();
    let machine_path = read_windows_environment_variable("Path", "Machine")?;
    let user_path = read_windows_environment_variable("Path", "User")?;
    let merged_path = merge_windows_search_path_values([
        current_path.as_str(),
        machine_path.as_str(),
        user_path.as_str(),
    ]);

    if !merged_path.is_empty() {
        std::env::set_var("PATH", merged_path);
    }

    let current_pathext = std::env::var("PATHEXT").unwrap_or_default();
    let machine_pathext = read_windows_environment_variable("PATHEXT", "Machine")?;
    let user_pathext = read_windows_environment_variable("PATHEXT", "User")?;
    let merged_pathext = merge_windows_search_path_values([
        current_pathext.as_str(),
        machine_pathext.as_str(),
        user_pathext.as_str(),
    ]);

    if !merged_pathext.is_empty() {
        std::env::set_var("PATHEXT", merged_pathext);
    }

    Ok(())
}

#[cfg(not(windows))]
fn refresh_windows_process_environment() -> Result<(), String> {
    Ok(())
}

fn probe_requirement(requirement_id: &str) -> Result<(String, String), String> {
    let search_path = resolve_process_search_path();
    probe_requirement_with_runner(requirement_id, |program, args| {
        command_output_with_search_path_owned(program, args, search_path.as_deref())
    })
}

fn installer_support_message(
    platform: OnboardingEnvironmentPlatform,
    package_manager_available: bool,
) -> String {
    match platform {
        OnboardingEnvironmentPlatform::MacOS => {
            if package_manager_available {
                "可通过 Homebrew 自动安装缺失环境。".to_string()
            } else {
                "未检测到 Homebrew，无法自动安装缺失环境。".to_string()
            }
        }
        OnboardingEnvironmentPlatform::Windows => {
            if package_manager_available {
                "可通过 winget 自动安装缺失环境。".to_string()
            } else {
                "未检测到 winget，无法自动安装缺失环境。".to_string()
            }
        }
        OnboardingEnvironmentPlatform::Unsupported => {
            "当前仅支持 macOS 和 Windows 自动安装缺失环境。".to_string()
        }
    }
}

fn package_manager_available(platform: OnboardingEnvironmentPlatform) -> bool {
    let probe = match platform {
        OnboardingEnvironmentPlatform::MacOS => Some(("brew", vec!["--version"])),
        OnboardingEnvironmentPlatform::Windows => Some(("winget", vec!["--version"])),
        OnboardingEnvironmentPlatform::Unsupported => None,
    };

    probe
        .map(|(program, args)| {
            probe_command_output(program, &args)
                .map(|output| output.status.success())
                .unwrap_or(false)
        })
        .unwrap_or(false)
}

fn run_onboarding_environment_check(
    input: &OnboardingEnvironmentCheckInput,
) -> Result<OnboardingEnvironmentCheckResult, String> {
    let platform = current_onboarding_environment_platform();
    let package_manager_ready = package_manager_available(platform);
    let requirements =
        build_onboarding_environment_requirements(&input.service_id, &input.credential_values)?;
    let mut rendered_requirements = Vec::new();
    let mut missing_labels = Vec::new();
    let mut missing_requirement_ids = Vec::new();
    let mut detail_lines = Vec::new();

    for requirement in requirements {
        let (status, details) = probe_requirement(&requirement.id)?;
        if status == "missing" {
            missing_labels.push(requirement.label.clone());
            missing_requirement_ids.push(requirement.id.clone());
            detail_lines.push(format!("{}: {}", requirement.label, details));
        }

        rendered_requirements.push(OnboardingEnvironmentRequirement {
            id: requirement.id,
            label: requirement.label,
            required: requirement.required,
            status,
            details,
        });
    }

    let status = if missing_requirement_ids.is_empty() {
        "ready".to_string()
    } else {
        "missing".to_string()
    };

    let summary = if missing_labels.is_empty() {
        "环境已就绪".to_string()
    } else {
        format!("缺少环境：{}", missing_labels.join("、"))
    };
    let install_supported = !missing_requirement_ids.is_empty()
        && matches!(
            platform,
            OnboardingEnvironmentPlatform::MacOS | OnboardingEnvironmentPlatform::Windows
        )
        && package_manager_ready;
    let install_support_message = installer_support_message(platform, package_manager_ready);
    let details = if detail_lines.is_empty() {
        install_support_message.clone()
    } else {
        let mut lines = detail_lines;
        lines.push(install_support_message.clone());
        lines.join("\n")
    };

    Ok(OnboardingEnvironmentCheckResult {
        service_id: input.service_id.clone(),
        platform: platform.as_str().to_string(),
        status,
        summary,
        details,
        requirements: rendered_requirements,
        missing_requirement_ids,
        install_supported,
        install_support_message,
        trigger: input.trigger.clone(),
        tested_fingerprint: input.tested_fingerprint.clone(),
    })
}

fn emit_environment_install_progress(
    app: &AppHandle,
    payload: OnboardingEnvironmentInstallProgressEvent,
) {
    let _ = app.emit("onboarding-environment-install-progress", payload);
}

struct InstallCommandExecution {
    status: std::process::ExitStatus,
    output_lines: Vec<String>,
}

fn run_install_command(
    app: &AppHandle,
    install_id: &str,
    service_id: &str,
    step_label: &str,
    step_label_for_errors: &str,
    command_spec: &CommandSpec,
    progress_percent: u8,
) -> Result<InstallCommandExecution, String> {
    let mut command = Command::new(&command_spec.program);
    configure_onboarding_command(&mut command);
    command.args(&command_spec.args);
    command.stdout(Stdio::piped());
    command.stderr(Stdio::piped());

    let mut child = command.spawn().map_err(|error| {
        format!(
            "Failed to start {} install command {}: {}",
            step_label_for_errors, command_spec.program, error
        )
    })?;

    emit_environment_install_progress(
        app,
        OnboardingEnvironmentInstallProgressEvent {
            install_id: install_id.to_string(),
            service_id: service_id.to_string(),
            status: "running".to_string(),
            progress_percent,
            step: step_label.to_string(),
            log_line: None,
        },
    );

    let (tx, rx) = mpsc::channel::<String>();
    let mut handles = Vec::new();

    if let Some(stdout) = child.stdout.take() {
        let tx = tx.clone();
        handles.push(thread::spawn(move || {
            for line in BufReader::new(stdout).lines().flatten() {
                let trimmed = line.trim();
                if !trimmed.is_empty() {
                    let _ = tx.send(trimmed.to_string());
                }
            }
        }));
    }

    if let Some(stderr) = child.stderr.take() {
        let tx = tx.clone();
        handles.push(thread::spawn(move || {
            for line in BufReader::new(stderr).lines().flatten() {
                let trimmed = line.trim();
                if !trimmed.is_empty() {
                    let _ = tx.send(trimmed.to_string());
                }
            }
        }));
    }

    drop(tx);

    let mut output_lines = Vec::new();

    for line in rx {
        output_lines.push(line.clone());
        emit_environment_install_progress(
            app,
            OnboardingEnvironmentInstallProgressEvent {
                install_id: install_id.to_string(),
                service_id: service_id.to_string(),
                status: "running".to_string(),
                progress_percent,
                step: step_label.to_string(),
                log_line: Some(line),
            },
        );
    }

    let status = child.wait().map_err(|error| {
        format!(
            "Failed to wait for {} install command: {}",
            step_label_for_errors, error
        )
    })?;

    for handle in handles {
        let _ = handle.join();
    }

    Ok(InstallCommandExecution {
        status,
        output_lines,
    })
}

fn run_install_step(
    app: &AppHandle,
    install_id: &str,
    service_id: &str,
    step: &OnboardingEnvironmentInstallStep,
    progress_percent: u8,
    step_label: &str,
    platform: OnboardingEnvironmentPlatform,
) -> Result<(), String> {
    let resolved_step = resolve_install_step_command(step, platform)?;
    let execution = run_install_command(
        app,
        install_id,
        service_id,
        step_label,
        &step.label,
        &resolved_step,
        progress_percent,
    )?;

    if execution.status.success() {
        return Ok(());
    }

    if platform == OnboardingEnvironmentPlatform::Windows
        && step.requirement_id == "paramiko"
        && should_retry_windows_paramiko_install_with_mirror(&execution.output_lines)
    {
        emit_environment_install_progress(
            app,
            OnboardingEnvironmentInstallProgressEvent {
                install_id: install_id.to_string(),
                service_id: service_id.to_string(),
                status: "running".to_string(),
                progress_percent,
                step: step_label.to_string(),
                log_line: Some("PyPI 下载失败，正在切换阿里云镜像重试 Paramiko 安装。".to_string()),
            },
        );

        let mirror_command = build_windows_paramiko_mirror_install_command(&resolved_step);
        let mirror_execution = run_install_command(
            app,
            install_id,
            service_id,
            step_label,
            &step.label,
            &mirror_command,
            progress_percent,
        )?;

        if mirror_execution.status.success() {
            return Ok(());
        }

        return Err(format!(
            "{} install command failed with status {}",
            step.label, mirror_execution.status
        ));
    }

    Err(format!(
        "{} install command failed with status {}",
        step.label, execution.status
    ))
}

async fn run_onboarding_environment_install(
    app: &AppHandle,
    input: &OnboardingEnvironmentInstallInput,
) -> Result<OnboardingEnvironmentInstallResult, String> {
    let platform = current_onboarding_environment_platform();
    let check_result = run_onboarding_environment_check(&OnboardingEnvironmentCheckInput {
        service_id: input.service_id.clone(),
        credential_values: input.credential_values.clone(),
        trigger: "install".to_string(),
        tested_fingerprint: input.install_id.clone(),
    })?;

    if check_result.missing_requirement_ids.is_empty() {
        emit_environment_install_progress(
            app,
            OnboardingEnvironmentInstallProgressEvent {
                install_id: input.install_id.clone(),
                service_id: input.service_id.clone(),
                status: "success".to_string(),
                progress_percent: 100,
                step: "环境已就绪".to_string(),
                log_line: None,
            },
        );

        return Ok(OnboardingEnvironmentInstallResult {
            install_id: input.install_id.clone(),
            service_id: input.service_id.clone(),
            success: true,
            summary: "环境已就绪，无需安装".to_string(),
            details: check_result.details,
            installed_requirement_ids: vec![],
        });
    }

    if !check_result.install_supported {
        return Err(check_result.install_support_message);
    }

    let steps = build_onboarding_environment_install_steps(
        platform,
        &check_result.missing_requirement_ids,
    )?;
    let total_steps = steps.len().max(1);

    for (index, step) in steps.iter().enumerate() {
        let progress_percent = ((index * 100) / total_steps) as u8;
        let step_label = format!("正在安装 {}", step.label);
        run_install_step(
            app,
            &input.install_id,
            &input.service_id,
            step,
            progress_percent,
            &step_label,
            platform,
        )?;

        if platform == OnboardingEnvironmentPlatform::Windows {
            refresh_windows_process_environment()?;
        }

        emit_environment_install_progress(
            app,
            OnboardingEnvironmentInstallProgressEvent {
                install_id: input.install_id.clone(),
                service_id: input.service_id.clone(),
                status: "running".to_string(),
                progress_percent: (((index + 1) * 100) / total_steps) as u8,
                step: step_label,
                log_line: None,
            },
        );
    }

    let final_check = run_onboarding_environment_check(&OnboardingEnvironmentCheckInput {
        service_id: input.service_id.clone(),
        credential_values: input.credential_values.clone(),
        trigger: "install".to_string(),
        tested_fingerprint: input.install_id.clone(),
    })?;
    let success = final_check.missing_requirement_ids.is_empty();

    emit_environment_install_progress(
        app,
        OnboardingEnvironmentInstallProgressEvent {
            install_id: input.install_id.clone(),
            service_id: input.service_id.clone(),
            status: if success { "success" } else { "error" }.to_string(),
            progress_percent: 100,
            step: final_check.summary.clone(),
            log_line: None,
        },
    );

    Ok(OnboardingEnvironmentInstallResult {
        install_id: input.install_id.clone(),
        service_id: input.service_id.clone(),
        success,
        summary: final_check.summary,
        details: final_check.details,
        installed_requirement_ids: check_result.missing_requirement_ids,
    })
}

fn get_onboarding_state_path() -> PathBuf {
    crate::template::get_config_path().with_file_name("onboarding-state.json")
}

fn build_staged_package_lookup(
    staged_packages: &[StagedOnboardingPackages],
) -> HashMap<String, PathBuf> {
    let mut lookup = HashMap::new();

    for staged in staged_packages {
        lookup.insert(
            staged.production.skill_id.clone(),
            staged.production.source_dir.clone(),
        );
        lookup.insert(staged.test.skill_id.clone(), staged.test.source_dir.clone());
    }

    lookup
}

fn validate_selected_agent_ids(
    agents: &[OnboardingAgentState],
    selected_agent_ids: &[String],
) -> Result<(), String> {
    let available_agent_ids: HashSet<&str> = agents.iter().map(|agent| agent.id.as_str()).collect();
    let mut invalid_agent_ids = Vec::new();

    for agent_id in selected_agent_ids {
        let agent_id_str = agent_id.as_str();
        let supported_backend_agent = skill::parse_target_app_id(agent_id_str).is_ok();

        if (!available_agent_ids.contains(agent_id_str) || !supported_backend_agent)
            && !invalid_agent_ids.contains(agent_id)
        {
            invalid_agent_ids.push(agent_id.clone());
        }
    }

    if invalid_agent_ids.is_empty() {
        Ok(())
    } else {
        Err(format!(
            "Unsupported agent ids: {}",
            invalid_agent_ids.join(", ")
        ))
    }
}

fn get_onboarding_home_env_path() -> Result<PathBuf, String> {
    let data_root = crate::template::get_data_root();
    let home_dir = data_root
        .parent()
        .filter(|path| !path.as_os_str().is_empty());

    home_dir
        .map(|path| path.join(HOME_ENV_FILE_NAME))
        .or_else(|| dirs::home_dir().map(|path| path.join(HOME_ENV_FILE_NAME)))
        .ok_or_else(|| "Failed to resolve home directory for ~/.env".to_string())
}

fn linux_requirements_path() -> Result<PathBuf, String> {
    let path = get_skills_dir()
        .join("linux")
        .join("scripts")
        .join("requirements.txt");

    if !path.is_file() {
        return Err(format!(
            "Linux requirements file not found: {}",
            path.display()
        ));
    }

    Ok(path)
}

fn require_non_empty_credential_value(
    credential_values: &HashMap<String, String>,
    field_id: &str,
) -> Result<String, String> {
    credential_values
        .get(field_id)
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
        .map(|value| value.to_string())
        .ok_or_else(|| format!("Missing required credential field: {}", field_id))
}

fn get_onboarding_connection_service_config(
    service_id: &str,
) -> Option<&'static OnboardingConnectionServiceConfig> {
    ONBOARDING_CONNECTION_SERVICES
        .iter()
        .find(|config| config.service_id == service_id)
}

fn build_connection_test_env_entries(
    service_id: &str,
    credential_values: &HashMap<String, String>,
) -> Result<Vec<(String, String)>, String> {
    let Some(service_config) = get_onboarding_connection_service_config(service_id) else {
        return Err(format!("Unsupported onboarding service: {}", service_id));
    };

    for field_id in service_config.required_field_ids {
        require_non_empty_credential_value(credential_values, field_id)?;
    }

    match service_id {
        "confluence" => Ok(vec![
            (
                "CONFLUENCE_URL".to_string(),
                require_non_empty_credential_value(credential_values, "confluenceUrl")?,
            ),
            (
                "CONFLUENCE_USERNAME".to_string(),
                require_non_empty_credential_value(credential_values, "confluenceUsername")?,
            ),
            (
                "CONFLUENCE_PASSWORD".to_string(),
                require_non_empty_credential_value(credential_values, "confluencePassword")?,
            ),
        ]),
        "jira" => Ok(vec![
            (
                "JIRA_URL".to_string(),
                require_non_empty_credential_value(credential_values, "jiraUrl")?,
            ),
            (
                "JIRA_USERNAME".to_string(),
                require_non_empty_credential_value(credential_values, "jiraUsername")?,
            ),
            (
                "JIRA_PASSWORD".to_string(),
                require_non_empty_credential_value(credential_values, "jiraPassword")?,
            ),
        ]),
        "gerrit" => {
            let auth_mode = credential_values
                .get("gerritAuthMode")
                .map(|value| value.trim())
                .filter(|value| !value.is_empty())
                .unwrap_or("http");

            match auth_mode {
                "http" => Ok(vec![
                    ("GERRIT_AUTH_MODE".to_string(), "http".to_string()),
                    (
                        "GERRIT_URL".to_string(),
                        require_non_empty_credential_value(credential_values, "gerritUrl")?,
                    ),
                    (
                        "GERRIT_USERNAME".to_string(),
                        require_non_empty_credential_value(
                            credential_values,
                            "gerritHttpUsername",
                        )?,
                    ),
                    (
                        "GERRIT_PASSWORD".to_string(),
                        require_non_empty_credential_value(
                            credential_values,
                            "gerritHttpPassword",
                        )?,
                    ),
                ]),
                "ssh" => Ok(vec![
                    ("GERRIT_AUTH_MODE".to_string(), "ssh".to_string()),
                    (
                        "GERRIT_SSH_HOST".to_string(),
                        require_non_empty_credential_value(credential_values, "gerritSshHost")?,
                    ),
                    (
                        "GERRIT_SSH_PORT".to_string(),
                        require_non_empty_credential_value(credential_values, "gerritSshPort")?,
                    ),
                    (
                        "GERRIT_SSH_USERNAME".to_string(),
                        require_non_empty_credential_value(credential_values, "gerritSshUsername")?,
                    ),
                ]),
                _ => Err(format!("Unsupported Gerrit auth mode: {}", auth_mode)),
            }
        }
        "svn" => Ok(vec![
            (
                "SVN_URL".to_string(),
                require_non_empty_credential_value(credential_values, "svnUrl")?,
            ),
            (
                "SVN_USERNAME".to_string(),
                require_non_empty_credential_value(credential_values, "svnUsername")?,
            ),
            (
                "SVN_PASSWORD".to_string(),
                require_non_empty_credential_value(credential_values, "svnPassword")?,
            ),
        ]),
        "mail" => {
            let username = require_non_empty_credential_value(credential_values, "mailUsername")?;
            let password = require_non_empty_credential_value(credential_values, "mailPassword")?;

            Ok(vec![
                ("MAIL_HOST".to_string(), "smtp.exmail.qq.com".to_string()),
                ("MAIL_PORT".to_string(), "465".to_string()),
                ("MAIL_USERNAME".to_string(), username.clone()),
                ("MAIL_PASSWORD".to_string(), password),
                ("MAIL_FROM".to_string(), username),
                ("MAIL_USE_SSL".to_string(), "true".to_string()),
                ("MAIL_USE_STARTTLS".to_string(), "false".to_string()),
            ])
        }
        "linux" => Ok(vec![
            (
                "LINUX_DEVICE_NAME".to_string(),
                require_non_empty_credential_value(credential_values, "linuxDeviceName")?,
            ),
            (
                "LINUX_HOST".to_string(),
                require_non_empty_credential_value(credential_values, "linuxHost")?,
            ),
            (
                "LINUX_USERNAME".to_string(),
                require_non_empty_credential_value(credential_values, "linuxUsername")?,
            ),
            (
                "LINUX_PASSWORD".to_string(),
                require_non_empty_credential_value(credential_values, "linuxPassword")?,
            ),
        ]),
        _ => Err(format!("Unsupported onboarding service: {}", service_id)),
    }
}

fn build_linux_devices_env_entry(
    state: &OnboardingState,
) -> Result<Option<(String, String)>, String> {
    let devices = state
        .linux_devices
        .iter()
        .filter(|device| {
            [
                device.name.as_str(),
                device.host.as_str(),
                device.username.as_str(),
                device.password.as_str(),
            ]
            .iter()
            .any(|value| !value.trim().is_empty())
        })
        .map(|device| {
            json!({
                "id": device.id,
                "name": device.name.trim(),
                "host": device.host.trim(),
                "username": device.username.trim(),
                "password": device.password,
            })
        })
        .collect::<Vec<_>>();

    if devices.is_empty() {
        return Ok(None);
    }

    let serialized = serde_json::to_string(&devices)
        .map_err(|error| format!("Failed to serialize Linux devices: {}", error))?;

    Ok(Some(("LINUX_DEVICES_JSON".to_string(), serialized)))
}

fn build_onboarding_home_env_entries(
    state: &OnboardingState,
) -> Result<Vec<(String, String)>, String> {
    let mut entries = Vec::new();

    for base_skill_id in &state.selected_base_skill_ids {
        if base_skill_id == "linux" {
            if let Some(entry) = build_linux_devices_env_entry(state)? {
                entries.push(entry);
            }
            continue;
        }

        if get_onboarding_connection_service_config(base_skill_id).is_none() {
            continue;
        }

        entries.extend(build_connection_test_env_entries(
            base_skill_id,
            &state.credential_values,
        )?);
    }

    Ok(entries)
}

fn parse_env_assignment_key(line: &str) -> Option<&str> {
    let trimmed = line.trim_start();
    let trimmed = trimmed.strip_prefix("export ").unwrap_or(trimmed);
    let (key, _) = trimmed.split_once('=')?;

    if key.is_empty()
        || !key
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || character == '_')
    {
        return None;
    }

    Some(key)
}

fn escape_env_value(value: &str) -> String {
    value
        .replace('\\', "\\\\")
        .replace('"', "\\\"")
        .replace('\n', "\\n")
}

fn format_env_assignment(key: &str, value: &str) -> String {
    format!(r#"{key}="{}""#, escape_env_value(value))
}

fn write_managed_home_env_entries(
    env_path: &Path,
    managed_entries: &[(String, String)],
) -> Result<(), String> {
    let existing_content = match fs::read_to_string(env_path) {
        Ok(content) => content,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => String::new(),
        Err(error) => return Err(format!("Failed to read {:?}: {}", env_path, error)),
    };

    if managed_entries.is_empty() && existing_content.is_empty() {
        return Ok(());
    }

    let managed_map = managed_entries
        .iter()
        .map(|(key, value)| (key.as_str(), value.as_str()))
        .collect::<HashMap<_, _>>();
    let managed_key_set = ONBOARDING_MANAGED_ENV_KEYS
        .iter()
        .copied()
        .collect::<HashSet<_>>();
    let mut written_keys = HashSet::new();
    let mut output_lines = Vec::new();

    for line in existing_content.lines() {
        if let Some(key) = parse_env_assignment_key(line) {
            if managed_key_set.contains(key) {
                if let Some(value) = managed_map.get(key) {
                    if written_keys.insert(key.to_string()) {
                        output_lines.push(format_env_assignment(key, value));
                    }
                }
                continue;
            }
        }

        output_lines.push(line.to_string());
    }

    for (key, value) in managed_entries {
        if written_keys.insert(key.clone()) {
            output_lines.push(format_env_assignment(key, value));
        }
    }

    let mut rendered = output_lines.join("\n");
    if !rendered.is_empty() {
        rendered.push('\n');
    }

    fs::write(env_path, rendered)
        .map_err(|error| format!("Failed to write {:?}: {}", env_path, error))
}

fn sync_onboarding_credentials_to_env_path(
    state: &OnboardingState,
    env_path: &Path,
) -> Result<(), String> {
    let managed_entries = build_onboarding_home_env_entries(state)?;
    write_managed_home_env_entries(env_path, &managed_entries)
}

fn sync_onboarding_credentials_to_home_env(state: &OnboardingState) -> Result<(), String> {
    let env_path = get_onboarding_home_env_path()?;
    sync_onboarding_credentials_to_env_path(state, &env_path)
}

fn service_label(service_id: &str) -> &str {
    match service_id {
        "confluence" => "Confluence",
        "gerrit" => "Gerrit",
        "jira" => "Jira",
        "linux" => "Linux",
        "svn" => "SVN",
        "mail" => "Mail",
        _ => "Service",
    }
}

fn trim_process_output(bytes: &[u8]) -> String {
    String::from_utf8_lossy(bytes).trim().to_string()
}

fn first_non_empty_line(value: &str) -> Option<String> {
    value
        .lines()
        .map(str::trim)
        .find(|line| !line.is_empty())
        .map(str::to_string)
}

fn build_connection_test_details(stdout: &str, stderr: &str) -> String {
    let mut sections = Vec::new();

    if !stdout.is_empty() {
        sections.push(format!("stdout:\n{}", stdout));
    }

    if !stderr.is_empty() {
        sections.push(format!("stderr:\n{}", stderr));
    }

    sections.join("\n\n")
}

fn build_onboarding_connection_test_result(
    service_id: &str,
    trigger: &str,
    tested_fingerprint: &str,
    output: Output,
) -> OnboardingConnectionTestResult {
    let stdout = trim_process_output(&output.stdout);
    let stderr = trim_process_output(&output.stderr);
    if let Ok(parsed) = parse_json_with_optional_utf8_bom::<ScriptConnectionTestResult>(&stdout) {
        return OnboardingConnectionTestResult {
            service_id: service_id.to_string(),
            success: parsed.success,
            status: if parsed.success {
                "success".to_string()
            } else {
                "error".to_string()
            },
            summary: parsed.summary,
            details: parsed.details,
            trigger: trigger.to_string(),
            tested_fingerprint: tested_fingerprint.to_string(),
        };
    }

    let success = output.status.success();
    let summary = if success {
        first_non_empty_line(&stdout)
            .or_else(|| first_non_empty_line(&stderr))
            .unwrap_or_else(|| format!("{} connection test succeeded.", service_label(service_id)))
    } else {
        first_non_empty_line(&stderr)
            .or_else(|| first_non_empty_line(&stdout))
            .unwrap_or_else(|| format!("{} connection test failed.", service_label(service_id)))
    };

    OnboardingConnectionTestResult {
        service_id: service_id.to_string(),
        success,
        status: if success {
            "success".to_string()
        } else {
            "error".to_string()
        },
        summary,
        details: build_connection_test_details(&stdout, &stderr),
        trigger: trigger.to_string(),
        tested_fingerprint: tested_fingerprint.to_string(),
    }
}

fn build_connection_test_env_file_content(entries: &[(String, String)]) -> String {
    let mut rendered = entries
        .iter()
        .map(|(key, value)| format_env_assignment(key, value))
        .collect::<Vec<_>>()
        .join("\n");

    if !rendered.is_empty() {
        rendered.push('\n');
    }

    rendered
}

fn write_connection_test_env_file(
    service_id: &str,
    entries: &[(String, String)],
) -> Result<PathBuf, String> {
    let unique = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| format!("Failed to build temp env timestamp: {}", error))?
        .as_nanos();
    let env_path = std::env::temp_dir().join(format!(
        "onboarding-connection-{}-{}-{}.env",
        service_id,
        std::process::id(),
        unique
    ));

    fs::write(&env_path, build_connection_test_env_file_content(entries)).map_err(|error| {
        format!(
            "Failed to write connection test env {:?}: {}",
            env_path, error
        )
    })?;

    Ok(env_path)
}

fn resolve_connection_test_script_path(service_id: &str) -> Result<PathBuf, String> {
    if get_onboarding_connection_service_config(service_id).is_none() {
        return Err(format!("Unsupported onboarding service: {}", service_id));
    }

    let script_path = get_skills_dir()
        .join(service_id)
        .join("scripts")
        .join(CONNECTION_TEST_SCRIPT_NAME);

    if !script_path.is_file() {
        return Err(format!(
            "Connection test script not found for {}: {}",
            service_id,
            script_path.display()
        ));
    }

    Ok(script_path)
}

fn python_command_candidates() -> Vec<CommandSpec> {
    #[cfg(target_os = "windows")]
    {
        vec![command_spec("py", &["-3"]), command_spec("python", &[])]
    }

    #[cfg(not(target_os = "windows"))]
    {
        vec![command_spec("python3", &[]), command_spec("python", &[])]
    }
}

fn execute_connection_test_script(script_path: &Path, env_path: &Path) -> Result<Output, String> {
    let python_command = resolve_available_python_command()?;
    let mut command = Command::new(&python_command.program);
    configure_onboarding_command(&mut command);
    command.args(&python_command.args);
    command.arg(script_path);
    command.arg("--test-only");
    command.arg("--json");
    command.arg("--env-file");
    command.arg(env_path);

    if let Some(script_dir) = script_path.parent() {
        command.current_dir(script_dir);
    }

    command.output().map_err(|error| {
        format!(
            "Failed to execute {} with {}: {}",
            script_path.display(),
            python_command.program,
            error
        )
    })
}

fn run_onboarding_connection_test(
    input: &OnboardingConnectionTestInput,
) -> Result<OnboardingConnectionTestResult, String> {
    let env_entries =
        build_connection_test_env_entries(&input.service_id, &input.credential_values)?;
    let script_path = resolve_connection_test_script_path(&input.service_id)?;
    let env_path = write_connection_test_env_file(&input.service_id, &env_entries)?;

    let output = execute_connection_test_script(&script_path, &env_path);
    let _ = fs::remove_file(&env_path);

    Ok(build_onboarding_connection_test_result(
        &input.service_id,
        &input.trigger,
        &input.tested_fingerprint,
        output?,
    ))
}

async fn run_onboarding_connection_test_async<F>(
    input: OnboardingConnectionTestInput,
    runner: F,
) -> Result<OnboardingConnectionTestResult, String>
where
    F: FnOnce(OnboardingConnectionTestInput) -> Result<OnboardingConnectionTestResult, String>
        + Send
        + 'static,
{
    tokio::task::spawn_blocking(move || runner(input))
        .await
        .map_err(|error| format!("Failed to run onboarding connection test: {error}"))?
}

#[tauri::command]
pub fn get_onboarding_state() -> SkillResult<OnboardingState> {
    SkillResult::Success {
        success: load_onboarding_state(),
    }
}

#[tauri::command]
pub fn set_onboarding_state(state: OnboardingState) -> SkillResult<OnboardingState> {
    match save_onboarding_state(&state) {
        Ok(()) => SkillResult::Success { success: state },
        Err(error) => SkillResult::Error { error },
    }
}

#[tauri::command]
pub fn sync_onboarding_credentials(state: OnboardingState) -> SkillResult<bool> {
    match sync_onboarding_credentials_to_home_env(&state) {
        Ok(()) => SkillResult::Success { success: true },
        Err(error) => SkillResult::Error { error },
    }
}

#[tauri::command]
pub async fn test_onboarding_connection(
    input: OnboardingConnectionTestInput,
) -> SkillResult<OnboardingConnectionTestResult> {
    match run_onboarding_connection_test_async(input, |input| run_onboarding_connection_test(&input))
        .await
    {
        Ok(result) => SkillResult::Success { success: result },
        Err(error) => SkillResult::Error { error },
    }
}

#[tauri::command]
pub async fn check_onboarding_skill_environment(
    input: OnboardingEnvironmentCheckInput,
) -> SkillResult<OnboardingEnvironmentCheckResult> {
    match tokio::task::spawn_blocking(move || run_onboarding_environment_check(&input)).await {
        Ok(Ok(result)) => SkillResult::Success { success: result },
        Ok(Err(error)) => SkillResult::Error { error },
        Err(error) => SkillResult::Error {
            error: format!("Failed to run onboarding environment check: {error}"),
        },
    }
}

#[tauri::command]
pub async fn install_onboarding_skill_environment(
    app: AppHandle,
    input: OnboardingEnvironmentInstallInput,
) -> SkillResult<OnboardingEnvironmentInstallResult> {
    match run_onboarding_environment_install(&app, &input).await {
        Ok(result) => SkillResult::Success { success: result },
        Err(error) => {
            emit_environment_install_progress(
                &app,
                OnboardingEnvironmentInstallProgressEvent {
                    install_id: input.install_id,
                    service_id: input.service_id,
                    status: "error".to_string(),
                    progress_percent: 0,
                    step: "环境安装失败".to_string(),
                    log_line: Some(error.clone()),
                },
            );

            SkillResult::Error { error }
        }
    }
}

#[tauri::command]
pub fn get_onboarding_install_preview(
    state: OnboardingState,
    selected_use_cases: Vec<OnboardingUseCase>,
    agents: Vec<OnboardingAgentState>,
) -> SkillResult<OnboardingInstallPreview> {
    if let Err(error) = validate_selected_agent_ids(&agents, &state.selected_agent_ids) {
        return SkillResult::Error { error };
    }

    SkillResult::Success {
        success: build_onboarding_install_preview(&state, &selected_use_cases, &agents),
    }
}

#[tauri::command]
pub fn stage_onboarding_generated_packages(
    input: StageOnboardingPackageInput,
) -> SkillResult<StagedOnboardingPackages> {
    match stage_generated_use_case_skill_packages(&input) {
        Ok(result) => SkillResult::Success { success: result },
        Err(error) => SkillResult::Error {
            error: error.to_string(),
        },
    }
}

#[tauri::command]
pub async fn sync_onboarding_installation(
    input: OnboardingSyncCommandInput,
) -> SkillResult<OnboardingBatchSyncResult> {
    if let Err(error) = validate_selected_agent_ids(&input.agents, &input.state.selected_agent_ids)
    {
        return SkillResult::Error { error };
    }

    if let Err(error) = sync_onboarding_credentials_to_home_env(&input.state) {
        return SkillResult::Error { error };
    }

    let preview =
        build_onboarding_install_preview(&input.state, &input.selected_use_cases, &input.agents);
    let staged_package_lookup = build_staged_package_lookup(&input.staged_packages);
    let mut agent_results = Vec::new();

    for agent_preview in preview.agent_previews {
        let Some(agent_state) = input
            .agents
            .iter()
            .find(|agent| agent.id == agent_preview.agent_id)
        else {
            agent_results.push(OnboardingAgentSyncResult {
                agent_id: agent_preview.agent_id,
                added_skill_ids: agent_preview.added_skill_ids,
                removed_skill_ids: agent_preview.removed_skill_ids,
                unchanged_skill_ids: agent_preview.unchanged_skill_ids,
                success: false,
                error: Some("Missing agent state".to_string()),
            });
            continue;
        };

        let mut result_error: Option<String> = None;

        for skill_id in &agent_preview.removed_skill_ids {
            match skill::uninstall_skill(skill_id.clone(), agent_state.id.clone()).await {
                SkillResult::Success { .. } => {}
                SkillResult::Error { error } => {
                    result_error = Some(error);
                    break;
                }
            }
        }

        if result_error.is_none() {
            for skill_id in &agent_preview.added_skill_ids {
                if let Some(source_dir) = staged_package_lookup.get(skill_id) {
                    let target_app_id = match skill::parse_target_app_id(&agent_state.id) {
                        Ok(app_id) => app_id,
                        Err(error) => {
                            result_error = Some(error.to_string());
                            break;
                        }
                    };

                    let output_dir = get_output_dir(&target_app_id, skill_id);
                    match skill::install_directory_package_at_path(
                        skill_id,
                        &target_app_id,
                        source_dir,
                        &output_dir,
                        "local",
                        &HashMap::new(),
                        true,
                        None,
                    ) {
                        Ok(_) => {}
                        Err(error) => {
                            result_error = Some(error.to_string());
                            break;
                        }
                    }
                } else {
                    match skill::install_skill(
                        skill_id.clone(),
                        agent_state.id.clone(),
                        HashMap::new(),
                    )
                    .await
                    {
                        SkillResult::Success { .. } => {}
                        SkillResult::Error { error } => {
                            result_error = Some(error);
                            break;
                        }
                    }
                }
            }
        }

        agent_results.push(OnboardingAgentSyncResult {
            agent_id: agent_preview.agent_id,
            added_skill_ids: agent_preview.added_skill_ids,
            removed_skill_ids: agent_preview.removed_skill_ids,
            unchanged_skill_ids: agent_preview.unchanged_skill_ids,
            success: result_error.is_none(),
            error: result_error,
        });
    }

    SkillResult::Success {
        success: OnboardingBatchSyncResult {
            selected_agent_ids: preview.selected_agent_ids,
            selected_install_skill_ids: preview.selected_install_skill_ids,
            agent_results,
        },
    }
}

pub fn load_onboarding_state() -> OnboardingState {
    let path = get_onboarding_state_path();

    if let Ok(content) = fs::read_to_string(&path) {
        if let Ok(mut value) = parse_json_with_optional_utf8_bom::<serde_json::Value>(&content) {
            let migrated = migrate_storage_metadata(&mut value);

            if migrated {
                let _ = persist_onboarding_state_value(&path, &value);
            }

            if let Ok(state) = serde_json::from_value(value) {
                return state;
            }
        }
    }

    OnboardingState::default()
}

pub fn save_onboarding_state(state: &OnboardingState) -> Result<(), String> {
    let path = get_onboarding_state_path();
    let mut value = serde_json::to_value(state)
        .map_err(|error| format!("Failed to serialize onboarding state: {error}"))?;
    migrate_storage_metadata(&mut value);
    persist_onboarding_state_value(&path, &value)
}

fn persist_onboarding_state_value(path: &Path, value: &serde_json::Value) -> Result<(), String> {
    let _ = crate::template::ensure_directories();
    let content = serde_json::to_string_pretty(value)
        .map_err(|error| format!("Failed to serialize onboarding state: {error}"))?;
    fs::write(path, content).map_err(|error| format!("Failed to write onboarding state: {error}"))
}

pub fn build_onboarding_install_preview(
    state: &OnboardingState,
    selected_use_cases: &[OnboardingUseCase],
    agents: &[OnboardingAgentState],
) -> OnboardingInstallPreview {
    let generated_skill_ids = selected_use_cases
        .iter()
        .filter(|use_case| {
            use_case
                .applicable_role_ids
                .iter()
                .any(|role_id| role_id == &state.selected_role_id)
        })
        .map(|use_case| {
            generated_skill_ids_for_use_case(&state.selected_role_id, &use_case.directory)
        })
        .collect::<Vec<_>>();

    let managed_skill_ids = default_selected_install_skill_ids(
        &state.selected_base_skill_ids,
        &state.selected_role_id,
        selected_use_cases,
    );
    let selected_install_skill_ids = resolve_selected_install_skill_ids(state, &managed_skill_ids);

    let plan: OnboardingSyncPlan = build_selected_agent_install_sync_plans(
        agents,
        &managed_skill_ids,
        &state.selected_agent_ids,
        &selected_install_skill_ids,
    );

    OnboardingInstallPreview {
        install_candidate_skill_ids: managed_skill_ids,
        generated_skill_ids,
        selected_agent_ids: plan.selected_agent_ids,
        selected_install_skill_ids: plan.selected_install_skill_ids,
        agent_previews: plan.agent_previews,
    }
}

#[cfg(test)]
pub fn apply_onboarding_sync_plan<F>(
    plan: OnboardingSyncPlan,
    mut apply_agent: F,
) -> OnboardingBatchSyncResult
where
    F: FnMut(&OnboardingAgentSyncPreview) -> Result<(), String>,
{
    let mut agent_results = Vec::new();

    for agent_preview in plan.agent_previews {
        let result = apply_agent(&agent_preview);
        agent_results.push(OnboardingAgentSyncResult {
            agent_id: agent_preview.agent_id,
            added_skill_ids: agent_preview.added_skill_ids,
            removed_skill_ids: agent_preview.removed_skill_ids,
            unchanged_skill_ids: agent_preview.unchanged_skill_ids,
            success: result.is_ok(),
            error: result.err(),
        });
    }

    OnboardingBatchSyncResult {
        selected_agent_ids: plan.selected_agent_ids,
        selected_install_skill_ids: plan.selected_install_skill_ids,
        agent_results,
    }
}

#[cfg(test)]
mod tests {
    use super::OnboardingSyncCommandInput;
    use super::{
        apply_onboarding_sync_plan, build_connection_test_env_entries,
        build_onboarding_connection_test_result, build_onboarding_environment_install_steps,
        build_windows_paramiko_mirror_install_args,
        build_onboarding_environment_requirements, build_onboarding_install_preview,
        command_output_with_search_path, merge_unix_search_path_values,
        merge_windows_search_path_values, probe_requirement_with_runner,
        resolve_connection_test_script_path, resolve_install_step_command_with_runner,
        resolve_process_search_path_from_values, should_retry_windows_paramiko_install_with_mirror,
        trim_process_output, OnboardingAgentSyncResult,
        OnboardingEnvironmentInstallStep, OnboardingEnvironmentPlatform,
    };
    use crate::models::{
        OnboardingAgentState, OnboardingLinuxDevice, OnboardingRoleUseCaseContent, OnboardingState,
        OnboardingUseCase,
    };
    use crate::onboarding::state::default_selected_install_skill_ids;
    use std::collections::HashMap;
    use std::fs;
    use std::io::ErrorKind;
    use std::path::PathBuf;
    use std::process::Output;
    use std::sync::{Mutex, OnceLock};
    use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

    const DATA_DIR_ENV_VAR: &str = "SKILL_CONFIGURATOR_DATA_DIR";

    fn temp_dir(prefix: &str) -> PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("time went backwards")
            .as_nanos();
        let path = std::env::temp_dir().join(format!("onboarding-command-{prefix}-{unique}"));
        fs::create_dir_all(&path).expect("create temp dir");
        path
    }

    fn env_lock() -> &'static Mutex<()> {
        static LOCK: OnceLock<Mutex<()>> = OnceLock::new();
        LOCK.get_or_init(|| Mutex::new(()))
    }

    fn restore_env_var(key: &str, value: Option<String>) {
        match value {
            Some(value) => std::env::set_var(key, value),
            None => std::env::remove_var(key),
        }
    }

    #[cfg(unix)]
    fn success_status() -> std::process::ExitStatus {
        use std::os::unix::process::ExitStatusExt;
        std::process::ExitStatus::from_raw(0)
    }

    #[cfg(windows)]
    fn success_status() -> std::process::ExitStatus {
        use std::os::windows::process::ExitStatusExt;
        std::process::ExitStatus::from_raw(0)
    }

    #[cfg(unix)]
    fn failure_status() -> std::process::ExitStatus {
        use std::os::unix::process::ExitStatusExt;
        std::process::ExitStatus::from_raw(1)
    }

    #[cfg(windows)]
    fn failure_status() -> std::process::ExitStatus {
        use std::os::windows::process::ExitStatusExt;
        std::process::ExitStatus::from_raw(1)
    }

    fn command_output(status: std::process::ExitStatus, stdout: &str, stderr: &str) -> Output {
        Output {
            status,
            stdout: stdout.as_bytes().to_vec(),
            stderr: stderr.as_bytes().to_vec(),
        }
    }

    #[test]
    fn onboarding_windows_environment_refresh_merges_path_segments_without_duplicates() {
        let merged = merge_windows_search_path_values([
            r"C:\Windows\System32;C:\Program Files\Git\cmd",
            r"c:\program files\git\cmd;C:\Users\sujun\AppData\Local\Programs\Python\Python312",
            r"C:\Users\sujun\AppData\Local\Programs\Python\Launcher",
        ]);

        assert_eq!(
            merged,
            [
                r"C:\Windows\System32",
                r"C:\Program Files\Git\cmd",
                r"C:\Users\sujun\AppData\Local\Programs\Python\Python312",
                r"C:\Users\sujun\AppData\Local\Programs\Python\Launcher",
            ]
            .join(";")
        );
    }

    #[test]
    fn onboarding_windows_environment_refresh_skips_empty_entries() {
        let merged = merge_windows_search_path_values([
            "",
            r"C:\Tools;;C:\Windows\System32;",
            " ; ; ",
            r"C:\Tools\bin",
        ]);

        assert_eq!(
            merged,
            [r"C:\Tools", r"C:\Windows\System32", r"C:\Tools\bin"].join(";")
        );
    }

    #[test]
    fn onboarding_unix_path_merge_prefers_first_occurrence_order() {
        let merged = merge_unix_search_path_values([
            "/opt/homebrew/bin:/usr/local/bin",
            "/usr/local/bin:/usr/bin",
        ]);

        assert_eq!(merged, "/opt/homebrew/bin:/usr/local/bin:/usr/bin");
    }

    #[test]
    fn onboarding_process_search_path_prefers_macos_login_shell_entries() {
        let resolved = resolve_process_search_path_from_values(
            OnboardingEnvironmentPlatform::MacOS,
            Some("/usr/bin:/bin".to_string()),
            Some("/opt/homebrew/bin:/opt/anaconda3/envs/python312/bin".to_string()),
        );

        assert_eq!(
            resolved,
            Some("/opt/homebrew/bin:/opt/anaconda3/envs/python312/bin:/usr/bin:/bin".to_string())
        );
    }

    #[cfg(unix)]
    #[test]
    fn onboarding_command_output_uses_supplied_search_path() {
        let executable_dir = temp_dir("command-search-path");
        let command_path = executable_dir.join("path-only-tool");
        fs::write(&command_path, "#!/bin/sh\necho resolved-from-search-path\n")
            .expect("write command");
        let mut permissions = fs::metadata(&command_path)
            .expect("read command metadata")
            .permissions();
        use std::os::unix::fs::PermissionsExt;
        permissions.set_mode(0o755);
        fs::set_permissions(&command_path, permissions).expect("set executable bit");

        let output = command_output_with_search_path(
            "path-only-tool",
            &[],
            Some(executable_dir.to_string_lossy().as_ref()),
        )
        .expect("run command from supplied search path");

        assert!(output.status.success());
        assert_eq!(
            trim_process_output(&output.stdout),
            "resolved-from-search-path"
        );
    }

    #[test]
    fn onboarding_python_probe_falls_back_to_python_when_py_launcher_fails() {
        let result = probe_requirement_with_runner("python3", |program, args| {
            if program == "py" && args == ["-3".to_string(), "--version".to_string()] {
                return Ok(command_output(
                    failure_status(),
                    "",
                    "No installed Python found for -3",
                ));
            }

            if program == "python" && args == ["--version".to_string()] {
                return Ok(command_output(success_status(), "Python 3.12.8", ""));
            }

            Err(std::io::Error::new(ErrorKind::NotFound, "missing"))
        })
        .expect("probe result");

        assert_eq!(result, ("ready".to_string(), "Python 3.12.8".to_string()));
    }

    #[tokio::test(flavor = "current_thread")]
    async fn onboarding_connection_test_async_offloads_blocking_work() {
        let input = super::OnboardingConnectionTestInput {
            service_id: "jira".to_string(),
            credential_values: HashMap::new(),
            trigger: "manual".to_string(),
            tested_fingerprint: "fingerprint-1".to_string(),
        };
        let started_at = Instant::now();
        let background_test = tokio::spawn(super::run_onboarding_connection_test_async(
            input.clone(),
            move |input| {
                std::thread::sleep(Duration::from_millis(120));

                Ok(super::OnboardingConnectionTestResult {
                    service_id: input.service_id,
                    success: true,
                    status: "success".to_string(),
                    summary: "Jira connection test succeeded.".to_string(),
                    details: String::new(),
                    trigger: input.trigger,
                    tested_fingerprint: input.tested_fingerprint,
                })
            },
        ));

        tokio::time::sleep(Duration::from_millis(20)).await;

        assert!(
            started_at.elapsed() < Duration::from_millis(80),
            "connection test blocked the runtime instead of running in the background"
        );

        let result = background_test
            .await
            .expect("join background connection test")
            .expect("background connection test result");

        assert_eq!(result.service_id, "jira");
        assert!(result.success);
        assert_eq!(result.status, "success");
    }

    #[test]
    fn onboarding_windows_paramiko_install_uses_python_when_py_launcher_fails() {
        let step = OnboardingEnvironmentInstallStep {
            requirement_id: "paramiko".to_string(),
            label: "Paramiko".to_string(),
            program: "python".to_string(),
            args: vec![
                "-m".to_string(),
                "pip".to_string(),
                "install".to_string(),
                "-r".to_string(),
                r"C:\tmp\requirements.txt".to_string(),
            ],
        };

        let resolved = resolve_install_step_command_with_runner(
            &step,
            OnboardingEnvironmentPlatform::Windows,
            |program, args| {
                if program == "py" && args == ["-3".to_string(), "--version".to_string()] {
                    return Ok(command_output(
                        failure_status(),
                        "",
                        "No installed Python found for -3",
                    ));
                }

                if program == "python" && args == ["--version".to_string()] {
                    return Ok(command_output(success_status(), "Python 3.12.8", ""));
                }

                Err(std::io::Error::new(ErrorKind::NotFound, "missing"))
            },
        )
        .expect("resolved paramiko install command");

        assert_eq!(resolved.program, "python");
        assert_eq!(
            resolved.args,
            vec![
                "-m".to_string(),
                "pip".to_string(),
                "install".to_string(),
                "-r".to_string(),
                r"C:\tmp\requirements.txt".to_string(),
            ]
        );
    }

    #[test]
    fn onboarding_windows_paramiko_install_builds_aliyun_mirror_retry_args() {
        let args = build_windows_paramiko_mirror_install_args(&[
            "-m".to_string(),
            "pip".to_string(),
            "install".to_string(),
            "-r".to_string(),
            r"C:\tmp\requirements.txt".to_string(),
        ]);

        assert_eq!(
            args,
            vec![
                "-m".to_string(),
                "pip".to_string(),
                "install".to_string(),
                "--disable-pip-version-check".to_string(),
                "-i".to_string(),
                "https://mirrors.aliyun.com/pypi/simple/".to_string(),
                "--trusted-host".to_string(),
                "mirrors.aliyun.com".to_string(),
                "-r".to_string(),
                r"C:\tmp\requirements.txt".to_string(),
            ]
        );
    }

    #[test]
    fn onboarding_windows_paramiko_install_retries_with_mirror_for_tls_failures() {
        assert!(should_retry_windows_paramiko_install_with_mirror(&[
            "WARNING: Retrying after connection broken by 'SSLError(SSLEOFError(8, '[SSL: UNEXPECTED_EOF_WHILE_READING] EOF occurred in violation of protocol (_ssl.c:1010)'))': /simple/paramiko/".to_string(),
            "Could not fetch URL https://pypi.org/simple/paramiko/: There was a problem confirming the ssl certificate".to_string(),
        ]));
    }

    #[test]
    fn onboarding_windows_paramiko_install_does_not_retry_with_mirror_for_generic_failures() {
        assert!(!should_retry_windows_paramiko_install_with_mirror(&[
            "ERROR: subprocess-exited-with-error".to_string(),
            "error: Microsoft Visual C++ 14.0 or greater is required".to_string(),
        ]));
    }

    #[test]
    fn onboarding_connection_test_builds_mail_env_entries() {
        let entries = build_connection_test_env_entries(
            "mail",
            &HashMap::from([
                ("mailUsername".to_string(), "pm@example.com".to_string()),
                ("mailPassword".to_string(), "mail-secret".to_string()),
            ]),
        )
        .expect("mail env entries");

        assert!(entries.contains(&("MAIL_HOST".to_string(), "smtp.exmail.qq.com".to_string())));
        assert!(entries.contains(&("MAIL_PORT".to_string(), "465".to_string())));
        assert!(entries.contains(&("MAIL_USERNAME".to_string(), "pm@example.com".to_string())));
        assert!(entries.contains(&("MAIL_PASSWORD".to_string(), "mail-secret".to_string())));
        assert!(entries.contains(&("MAIL_FROM".to_string(), "pm@example.com".to_string())));
        assert!(entries.contains(&("MAIL_USE_SSL".to_string(), "true".to_string())));
        assert!(entries.contains(&("MAIL_USE_STARTTLS".to_string(), "false".to_string())));
    }

    #[test]
    fn onboarding_connection_test_builds_gerrit_http_env_entries() {
        let entries = build_connection_test_env_entries(
            "gerrit",
            &HashMap::from([
                ("gerritAuthMode".to_string(), "http".to_string()),
                (
                    "gerritUrl".to_string(),
                    "https://gerrit.example.com".to_string(),
                ),
                ("gerritHttpUsername".to_string(), "gerrit.user".to_string()),
                (
                    "gerritHttpPassword".to_string(),
                    "gerrit-secret".to_string(),
                ),
            ]),
        )
        .expect("gerrit http env entries");

        assert!(entries.contains(&("GERRIT_AUTH_MODE".to_string(), "http".to_string())));
        assert!(entries.contains(&(
            "GERRIT_URL".to_string(),
            "https://gerrit.example.com".to_string()
        )));
        assert!(entries.contains(&("GERRIT_USERNAME".to_string(), "gerrit.user".to_string())));
        assert!(entries.contains(&("GERRIT_PASSWORD".to_string(), "gerrit-secret".to_string())));
    }

    #[test]
    fn onboarding_connection_test_builds_gerrit_ssh_env_entries() {
        let entries = build_connection_test_env_entries(
            "gerrit",
            &HashMap::from([
                ("gerritAuthMode".to_string(), "ssh".to_string()),
                (
                    "gerritSshHost".to_string(),
                    "gerrit.example.com".to_string(),
                ),
                ("gerritSshPort".to_string(), "29418".to_string()),
                ("gerritSshUsername".to_string(), "gerrit.user".to_string()),
            ]),
        )
        .expect("gerrit ssh env entries");

        assert!(entries.contains(&("GERRIT_AUTH_MODE".to_string(), "ssh".to_string())));
        assert!(entries.contains(&(
            "GERRIT_SSH_HOST".to_string(),
            "gerrit.example.com".to_string()
        )));
        assert!(entries.contains(&("GERRIT_SSH_PORT".to_string(), "29418".to_string())));
        assert!(entries.contains(&("GERRIT_SSH_USERNAME".to_string(), "gerrit.user".to_string())));
    }

    #[test]
    fn onboarding_environment_builds_svn_requirements() {
        let requirements = build_onboarding_environment_requirements("svn", &HashMap::new())
            .expect("svn requirements");

        let ids = requirements
            .iter()
            .map(|requirement| requirement.id.as_str())
            .collect::<Vec<_>>();

        assert_eq!(ids, vec!["python3", "svn"]);
    }

    #[test]
    fn onboarding_environment_builds_gerrit_ssh_requirements() {
        let requirements = build_onboarding_environment_requirements(
            "gerrit",
            &HashMap::from([("gerritAuthMode".to_string(), "ssh".to_string())]),
        )
        .expect("gerrit ssh requirements");

        let ids = requirements
            .iter()
            .map(|requirement| requirement.id.as_str())
            .collect::<Vec<_>>();

        assert_eq!(ids, vec!["python3", "git", "ssh"]);
    }

    #[test]
    fn onboarding_connection_test_builds_linux_env_entries() {
        let entries = build_connection_test_env_entries(
            "linux",
            &HashMap::from([
                ("linuxDeviceName".to_string(), "Build Server".to_string()),
                ("linuxHost".to_string(), "192.168.9.20".to_string()),
                ("linuxUsername".to_string(), "ops".to_string()),
                ("linuxPassword".to_string(), "linux-secret".to_string()),
            ]),
        )
        .expect("linux env entries");

        assert!(entries.contains(&("LINUX_DEVICE_NAME".to_string(), "Build Server".to_string())));
        assert!(entries.contains(&("LINUX_HOST".to_string(), "192.168.9.20".to_string())));
        assert!(entries.contains(&("LINUX_USERNAME".to_string(), "ops".to_string())));
        assert!(entries.contains(&("LINUX_PASSWORD".to_string(), "linux-secret".to_string())));
    }

    #[test]
    fn onboarding_environment_builds_linux_requirements() {
        let requirements = build_onboarding_environment_requirements("linux", &HashMap::new())
            .expect("linux requirements");

        let ids = requirements
            .iter()
            .map(|requirement| requirement.id.as_str())
            .collect::<Vec<_>>();

        assert_eq!(ids, vec!["python3", "paramiko"]);
    }

    #[test]
    fn onboarding_environment_builds_windows_install_steps_for_svn() {
        let steps = build_onboarding_environment_install_steps(
            OnboardingEnvironmentPlatform::Windows,
            &["python3".to_string(), "svn".to_string()],
        )
        .expect("windows install steps");

        assert_eq!(steps.len(), 2);
        assert_eq!(steps[0].requirement_id, "python3");
        assert_eq!(steps[0].program, "winget");
        assert!(steps[0].args.contains(&"Python.Python.3.12".to_string()));
        assert_eq!(steps[1].requirement_id, "svn");
        assert_eq!(steps[1].program, "winget");
        assert!(steps[1].args.contains(&"TortoiseSVN.TortoiseSVN".to_string()));
        assert!(steps[1].args.contains(&"--custom".to_string()));
        assert!(steps[1].args.contains(&"ADDLOCAL=ALL".to_string()));
    }

    #[test]
    fn onboarding_environment_builds_macos_install_steps_for_gerrit_ssh() {
        let steps = build_onboarding_environment_install_steps(
            OnboardingEnvironmentPlatform::MacOS,
            &["python3".to_string(), "git".to_string(), "ssh".to_string()],
        )
        .expect("macos install steps");

        assert_eq!(steps.len(), 3);
        assert_eq!(steps[0].program, "brew");
        assert_eq!(
            steps[0].args,
            vec!["install".to_string(), "python".to_string()]
        );
        assert_eq!(
            steps[1].args,
            vec!["install".to_string(), "git".to_string()]
        );
        assert_eq!(
            steps[2].args,
            vec!["install".to_string(), "openssh".to_string()]
        );
    }

    #[test]
    fn onboarding_connection_test_builds_svn_env_entries() {
        let entries = build_connection_test_env_entries(
            "svn",
            &HashMap::from([
                (
                    "svnUrl".to_string(),
                    "https://svn.example.com/repo".to_string(),
                ),
                ("svnUsername".to_string(), "svn.user".to_string()),
                ("svnPassword".to_string(), "svn-secret".to_string()),
            ]),
        )
        .expect("svn env entries");

        assert!(entries.contains(&(
            "SVN_URL".to_string(),
            "https://svn.example.com/repo".to_string()
        )));
        assert!(entries.contains(&("SVN_USERNAME".to_string(), "svn.user".to_string())));
        assert!(entries.contains(&("SVN_PASSWORD".to_string(), "svn-secret".to_string())));
    }

    #[test]
    fn onboarding_connection_test_rejects_missing_required_fields() {
        let error = build_connection_test_env_entries(
            "jira",
            &HashMap::from([(
                "jiraUrl".to_string(),
                "https://jira.example.com".to_string(),
            )]),
        )
        .expect_err("missing jira credentials should fail");

        assert!(error.contains("jiraUsername"));
    }

    #[test]
    fn onboarding_connection_test_rejects_missing_gerrit_http_fields() {
        let error = build_connection_test_env_entries(
            "gerrit",
            &HashMap::from([
                ("gerritAuthMode".to_string(), "http".to_string()),
                (
                    "gerritUrl".to_string(),
                    "https://gerrit.example.com".to_string(),
                ),
            ]),
        )
        .expect_err("missing gerrit http fields should fail");

        assert!(error.contains("gerritHttpUsername"));
    }

    #[test]
    fn onboarding_connection_test_rejects_missing_svn_fields() {
        let error = build_connection_test_env_entries(
            "svn",
            &HashMap::from([(
                "svnUrl".to_string(),
                "https://svn.example.com/repo".to_string(),
            )]),
        )
        .expect_err("missing svn credentials should fail");

        assert!(error.contains("svnUsername"));
    }

    #[test]
    fn onboarding_connection_test_resolves_script_path_in_skills_dir() {
        let _guard = env_lock().lock().unwrap();
        let data_dir = temp_dir("connection-script-path-data");
        let skills_dir = temp_dir("connection-script-path-skills");
        let script_path = skills_dir
            .join("jira")
            .join("scripts")
            .join("test_connection.py");
        let original_data_dir = std::env::var(DATA_DIR_ENV_VAR).ok();
        let original_skills_dir = std::env::var("SKILL_CONFIGURATOR_SKILLS_DIR").ok();

        fs::create_dir_all(script_path.parent().expect("script dir")).expect("create script dir");
        fs::write(&script_path, "print('ok')\n").expect("write script");
        std::env::set_var(DATA_DIR_ENV_VAR, &data_dir);
        std::env::set_var("SKILL_CONFIGURATOR_SKILLS_DIR", &skills_dir);

        let resolved = resolve_connection_test_script_path("jira").expect("resolve jira script");

        restore_env_var("SKILL_CONFIGURATOR_SKILLS_DIR", original_skills_dir);
        restore_env_var(DATA_DIR_ENV_VAR, original_data_dir);

        assert_eq!(resolved, script_path);
    }

    #[test]
    fn onboarding_connection_test_resolves_gerrit_script_path_in_skills_dir() {
        let _guard = env_lock().lock().unwrap();
        let data_dir = temp_dir("connection-gerrit-script-path-data");
        let skills_dir = temp_dir("connection-gerrit-script-path-skills");
        let script_path = skills_dir
            .join("gerrit")
            .join("scripts")
            .join("test_connection.py");
        let original_data_dir = std::env::var(DATA_DIR_ENV_VAR).ok();
        let original_skills_dir = std::env::var("SKILL_CONFIGURATOR_SKILLS_DIR").ok();

        fs::create_dir_all(script_path.parent().expect("script dir")).expect("create script dir");
        fs::write(&script_path, "print('ok')\n").expect("write script");
        std::env::set_var(DATA_DIR_ENV_VAR, &data_dir);
        std::env::set_var("SKILL_CONFIGURATOR_SKILLS_DIR", &skills_dir);

        let resolved =
            resolve_connection_test_script_path("gerrit").expect("resolve gerrit script");

        restore_env_var("SKILL_CONFIGURATOR_SKILLS_DIR", original_skills_dir);
        restore_env_var(DATA_DIR_ENV_VAR, original_data_dir);

        assert_eq!(resolved, script_path);
    }

    #[test]
    fn onboarding_connection_test_resolves_svn_script_path_in_skills_dir() {
        let _guard = env_lock().lock().unwrap();
        let data_dir = temp_dir("connection-svn-script-path-data");
        let skills_dir = temp_dir("connection-svn-script-path-skills");
        let script_path = skills_dir
            .join("svn")
            .join("scripts")
            .join("test_connection.py");
        let original_data_dir = std::env::var(DATA_DIR_ENV_VAR).ok();
        let original_skills_dir = std::env::var("SKILL_CONFIGURATOR_SKILLS_DIR").ok();

        fs::create_dir_all(script_path.parent().expect("script dir")).expect("create script dir");
        fs::write(&script_path, "print('ok')\n").expect("write script");
        std::env::set_var(DATA_DIR_ENV_VAR, &data_dir);
        std::env::set_var("SKILL_CONFIGURATOR_SKILLS_DIR", &skills_dir);

        let resolved = resolve_connection_test_script_path("svn").expect("resolve svn script");

        restore_env_var("SKILL_CONFIGURATOR_SKILLS_DIR", original_skills_dir);
        restore_env_var(DATA_DIR_ENV_VAR, original_data_dir);

        assert_eq!(resolved, script_path);
    }

    #[test]
    fn onboarding_connection_test_normalizes_success_output() {
        let result = build_onboarding_connection_test_result(
            "jira",
            "automatic",
            "fingerprint-1",
            Output {
                status: success_status(),
                stdout: b"Jira login succeeded.\nstatus_code: 200\n".to_vec(),
                stderr: Vec::new(),
            },
        );

        assert!(result.success);
        assert_eq!(result.status, "success");
        assert_eq!(result.trigger, "automatic");
        assert_eq!(result.tested_fingerprint, "fingerprint-1");
        assert!(result.summary.contains("Jira login succeeded"));
        assert!(result.details.contains("status_code: 200"));
    }

    #[test]
    fn onboarding_connection_test_parses_json_success_output() {
        let result = build_onboarding_connection_test_result(
            "jira",
            "automatic",
            "fingerprint-1",
            Output {
                status: success_status(),
                stdout: "{\"service_id\":\"jira\",\"success\":true,\"status\":\"success\",\"summary\":\"Jira 连接成功\",\"details\":\"status_code: 200\"}"
                    .as_bytes()
                    .to_vec(),
                stderr: Vec::new(),
            },
        );

        assert!(result.success);
        assert_eq!(result.status, "success");
        assert_eq!(result.summary, "Jira 连接成功");
        assert_eq!(result.details, "status_code: 200");
        assert_eq!(result.trigger, "automatic");
        assert_eq!(result.tested_fingerprint, "fingerprint-1");
    }

    #[test]
    fn onboarding_connection_test_normalizes_failure_output() {
        let result = build_onboarding_connection_test_result(
            "mail",
            "manual",
            "fingerprint-2",
            Output {
                status: failure_status(),
                stdout: Vec::new(),
                stderr: b"Error: bad credentials\n".to_vec(),
            },
        );

        assert!(!result.success);
        assert_eq!(result.status, "error");
        assert_eq!(result.trigger, "manual");
        assert_eq!(result.tested_fingerprint, "fingerprint-2");
        assert!(result.summary.contains("Error: bad credentials"));
    }

    #[test]
    fn onboarding_connection_test_parses_json_failure_output() {
        let result = build_onboarding_connection_test_result(
            "confluence",
            "manual",
            "fingerprint-2",
            Output {
                status: failure_status(),
                stdout: "{\"service_id\":\"confluence\",\"success\":false,\"status\":\"error\",\"summary\":\"Confluence 连接失败\",\"details\":\"HTTP 401: invalid token\"}"
                    .as_bytes()
                    .to_vec(),
                stderr: Vec::new(),
            },
        );

        assert!(!result.success);
        assert_eq!(result.status, "error");
        assert_eq!(result.summary, "Confluence 连接失败");
        assert_eq!(result.details, "HTTP 401: invalid token");
        assert_eq!(result.trigger, "manual");
        assert_eq!(result.tested_fingerprint, "fingerprint-2");
    }

    #[test]
    fn onboarding_preview_returns_both_generated_package_ids() {
        let state = OnboardingState {
            selected_agent_ids: vec!["codex".to_string(), "workbuddy".to_string()],
            selected_role_id: "project-manager".to_string(),
            selected_base_skill_ids: vec!["jira".to_string(), "confluence".to_string()],
            role_use_case_contents: vec![OnboardingRoleUseCaseContent {
                role_id: "project-manager".to_string(),
                use_case_id: "weekly-report".to_string(),
                use_case_name: "项目周报".to_string(),
                description: "按周报模板输出项目状态".to_string(),
                description_locked: false,
                info_sources: "Jira 看板、Confluence 模板".to_string(),
                rules: "先风险后里程碑".to_string(),
                questions: vec![],
            }],
            selected_install_skill_ids: default_selected_install_skill_ids(
                &["jira".to_string(), "confluence".to_string()],
                "project-manager",
                &[OnboardingUseCase {
                    id: "weekly-report".to_string(),
                    name: "项目周报".to_string(),
                    directory: "weekly-report".to_string(),
                    applicable_role_ids: vec!["project-manager".to_string()],
                }],
            ),
            selected_install_skill_ids_initialized: false,
            selected_install_candidate_skill_ids: vec![],
            credential_values: std::collections::HashMap::new(),
            linux_devices: vec![],
        };

        let preview = build_onboarding_install_preview(
            &state,
            &[OnboardingUseCase {
                id: "weekly-report".to_string(),
                name: "项目周报".to_string(),
                directory: "weekly-report".to_string(),
                applicable_role_ids: vec!["project-manager".to_string()],
            }],
            &[
                OnboardingAgentState {
                    id: "codex".to_string(),
                    installed_skill_ids: vec![],
                },
                OnboardingAgentState {
                    id: "workbuddy".to_string(),
                    installed_skill_ids: vec![],
                },
            ],
        );

        assert_eq!(
            preview.generated_skill_ids,
            vec![crate::models::GeneratedSkillIds {
                production_skill_id: "project-manager-weekly-report".to_string(),
                test_skill_id: "test-project-manager-weekly-report".to_string(),
            }]
        );
        assert!(preview
            .selected_install_skill_ids
            .contains(&"project-manager-weekly-report".to_string()));
        assert!(preview
            .selected_install_skill_ids
            .contains(&"test-project-manager-weekly-report".to_string()));
    }

    #[test]
    fn onboarding_preview_returns_full_install_candidate_set_and_keeps_explicit_empty_selection_empty(
    ) {
        let state = OnboardingState {
            selected_agent_ids: vec!["codex".to_string()],
            selected_role_id: "project-manager".to_string(),
            selected_base_skill_ids: vec!["jira".to_string()],
            role_use_case_contents: vec![OnboardingRoleUseCaseContent {
                role_id: "project-manager".to_string(),
                use_case_id: "weekly-report".to_string(),
                use_case_name: "项目周报".to_string(),
                description: "按周报模板输出项目状态".to_string(),
                description_locked: false,
                info_sources: "Jira 看板".to_string(),
                rules: "先风险后里程碑".to_string(),
                questions: vec![],
            }],
            selected_install_skill_ids: vec![],
            selected_install_skill_ids_initialized: true,
            selected_install_candidate_skill_ids: vec![
                "jira".to_string(),
                "project-manager-weekly-report".to_string(),
                "test-project-manager-weekly-report".to_string(),
            ],
            credential_values: std::collections::HashMap::new(),
            linux_devices: vec![],
        };

        let preview = build_onboarding_install_preview(
            &state,
            &[OnboardingUseCase {
                id: "weekly-report".to_string(),
                name: "项目周报".to_string(),
                directory: "weekly-report".to_string(),
                applicable_role_ids: vec!["project-manager".to_string()],
            }],
            &[OnboardingAgentState {
                id: "codex".to_string(),
                installed_skill_ids: vec![
                    "jira".to_string(),
                    "project-manager-weekly-report".to_string(),
                    "test-project-manager-weekly-report".to_string(),
                    "legacy-package".to_string(),
                ],
            }],
        );

        assert_eq!(
            preview.install_candidate_skill_ids,
            vec![
                "jira".to_string(),
                "project-manager-weekly-report".to_string(),
                "test-project-manager-weekly-report".to_string(),
            ]
        );
        assert!(preview.selected_install_skill_ids.is_empty());
        assert_eq!(
            preview.agent_previews[0].removed_skill_ids,
            vec![
                "jira".to_string(),
                "project-manager-weekly-report".to_string(),
                "test-project-manager-weekly-report".to_string(),
            ]
        );
        assert_eq!(
            preview.agent_previews[0].unchanged_skill_ids,
            vec!["legacy-package".to_string()]
        );
    }

    #[test]
    fn onboarding_preview_defaults_fresh_state_to_all_managed_candidates() {
        let state = OnboardingState {
            selected_agent_ids: vec!["codex".to_string()],
            selected_role_id: "project-manager".to_string(),
            selected_base_skill_ids: vec!["jira".to_string()],
            role_use_case_contents: vec![],
            selected_install_skill_ids: vec![],
            selected_install_skill_ids_initialized: false,
            selected_install_candidate_skill_ids: vec![],
            credential_values: std::collections::HashMap::new(),
            linux_devices: vec![],
        };

        let preview = build_onboarding_install_preview(
            &state,
            &[OnboardingUseCase {
                id: "weekly-report".to_string(),
                name: "项目周报".to_string(),
                directory: "weekly-report".to_string(),
                applicable_role_ids: vec!["project-manager".to_string()],
            }],
            &[OnboardingAgentState {
                id: "codex".to_string(),
                installed_skill_ids: vec![],
            }],
        );

        assert_eq!(
            preview.selected_install_skill_ids,
            vec![
                "jira".to_string(),
                "project-manager-weekly-report".to_string(),
                "test-project-manager-weekly-report".to_string(),
            ]
        );
    }

    #[test]
    fn onboarding_preview_prunes_stale_generated_ids_without_forcing_current_generated_ids_back_in()
    {
        let state = OnboardingState {
            selected_agent_ids: vec!["codex".to_string()],
            selected_role_id: "sales-manager".to_string(),
            selected_base_skill_ids: vec!["jira".to_string()],
            role_use_case_contents: vec![OnboardingRoleUseCaseContent {
                role_id: "sales-manager".to_string(),
                use_case_id: "daily-log".to_string(),
                use_case_name: "记录日志".to_string(),
                description: "记录销售过程".to_string(),
                description_locked: false,
                info_sources: "CRM".to_string(),
                rules: "按日同步".to_string(),
                questions: vec![],
            }],
            selected_install_skill_ids: vec![
                "jira".to_string(),
                "project-manager-weekly-report".to_string(),
            ],
            selected_install_skill_ids_initialized: false,
            selected_install_candidate_skill_ids: vec![
                "jira".to_string(),
                "project-manager-weekly-report".to_string(),
                "test-project-manager-weekly-report".to_string(),
            ],
            credential_values: std::collections::HashMap::new(),
            linux_devices: vec![],
        };

        let preview = build_onboarding_install_preview(
            &state,
            &[OnboardingUseCase {
                id: "daily-log".to_string(),
                name: "记录日志".to_string(),
                directory: "daily-log".to_string(),
                applicable_role_ids: vec!["sales-manager".to_string()],
            }],
            &[OnboardingAgentState {
                id: "codex".to_string(),
                installed_skill_ids: vec![],
            }],
        );

        assert_eq!(
            preview.generated_skill_ids,
            vec![crate::models::GeneratedSkillIds {
                production_skill_id: "sales-manager-daily-log".to_string(),
                test_skill_id: "test-sales-manager-daily-log".to_string(),
            }]
        );
        assert_eq!(
            preview.selected_install_skill_ids,
            vec![
                "jira".to_string(),
                "sales-manager-daily-log".to_string(),
                "test-sales-manager-daily-log".to_string(),
            ]
        );
    }

    #[test]
    fn onboarding_preview_removes_deselected_managed_skills_from_selected_agents() {
        let state = OnboardingState {
            selected_agent_ids: vec!["codex".to_string()],
            selected_role_id: "project-manager".to_string(),
            selected_base_skill_ids: vec!["jira".to_string()],
            role_use_case_contents: vec![OnboardingRoleUseCaseContent {
                role_id: "project-manager".to_string(),
                use_case_id: "weekly-report".to_string(),
                use_case_name: "项目周报".to_string(),
                description: "按周报模板输出项目状态".to_string(),
                description_locked: false,
                info_sources: "Jira 看板".to_string(),
                rules: "先风险后里程碑".to_string(),
                questions: vec![],
            }],
            selected_install_skill_ids: vec!["jira".to_string()],
            selected_install_skill_ids_initialized: false,
            selected_install_candidate_skill_ids: vec![
                "jira".to_string(),
                "project-manager-weekly-report".to_string(),
                "test-project-manager-weekly-report".to_string(),
            ],
            credential_values: std::collections::HashMap::new(),
            linux_devices: vec![],
        };

        let preview = build_onboarding_install_preview(
            &state,
            &[OnboardingUseCase {
                id: "weekly-report".to_string(),
                name: "项目周报".to_string(),
                directory: "weekly-report".to_string(),
                applicable_role_ids: vec!["project-manager".to_string()],
            }],
            &[OnboardingAgentState {
                id: "codex".to_string(),
                installed_skill_ids: vec![
                    "jira".to_string(),
                    "project-manager-weekly-report".to_string(),
                    "test-project-manager-weekly-report".to_string(),
                    "legacy-package".to_string(),
                ],
            }],
        );

        assert_eq!(preview.selected_install_skill_ids, vec!["jira".to_string()]);
        assert_eq!(preview.agent_previews.len(), 1);
        assert_eq!(
            preview.agent_previews[0].removed_skill_ids,
            vec![
                "project-manager-weekly-report".to_string(),
                "test-project-manager-weekly-report".to_string(),
            ]
        );
        assert_eq!(
            preview.agent_previews[0].unchanged_skill_ids,
            vec!["jira".to_string(), "legacy-package".to_string()]
        );
    }

    #[test]
    fn onboarding_preview_rejects_unsupported_agent_ids_at_the_command_boundary() {
        let state = OnboardingState {
            selected_agent_ids: vec!["missing-agent".to_string()],
            selected_role_id: "project-manager".to_string(),
            selected_base_skill_ids: vec!["jira".to_string()],
            role_use_case_contents: vec![],
            selected_install_skill_ids: vec![],
            selected_install_skill_ids_initialized: false,
            selected_install_candidate_skill_ids: vec![],
            credential_values: std::collections::HashMap::new(),
            linux_devices: vec![],
        };

        let result = super::get_onboarding_install_preview(
            state,
            vec![OnboardingUseCase {
                id: "weekly-report".to_string(),
                name: "项目周报".to_string(),
                directory: "weekly-report".to_string(),
                applicable_role_ids: vec!["project-manager".to_string()],
            }],
            vec![OnboardingAgentState {
                id: "codex".to_string(),
                installed_skill_ids: vec![],
            }],
        );

        assert!(matches!(
            result,
            crate::commands::skill::SkillResult::Error { ref error }
            if error == "Unsupported agent ids: missing-agent"
        ));
    }

    #[test]
    fn onboarding_preview_rejects_selected_agent_ids_even_when_the_payload_includes_unsupported_targets(
    ) {
        let state = OnboardingState {
            selected_agent_ids: vec!["staging".to_string()],
            selected_role_id: "project-manager".to_string(),
            selected_base_skill_ids: vec!["jira".to_string()],
            role_use_case_contents: vec![],
            selected_install_skill_ids: vec![],
            selected_install_skill_ids_initialized: false,
            selected_install_candidate_skill_ids: vec![],
            credential_values: std::collections::HashMap::new(),
            linux_devices: vec![],
        };

        let result = super::get_onboarding_install_preview(
            state,
            vec![OnboardingUseCase {
                id: "weekly-report".to_string(),
                name: "项目周报".to_string(),
                directory: "weekly-report".to_string(),
                applicable_role_ids: vec!["project-manager".to_string()],
            }],
            vec![
                OnboardingAgentState {
                    id: "codex".to_string(),
                    installed_skill_ids: vec![],
                },
                OnboardingAgentState {
                    id: "staging".to_string(),
                    installed_skill_ids: vec![],
                },
            ],
        );

        assert!(matches!(
            result,
            crate::commands::skill::SkillResult::Error { ref error }
            if error == "Unsupported agent ids: staging"
        ));
    }

    #[tokio::test]
    async fn onboarding_sync_rejects_unsupported_agent_ids_at_the_command_boundary() {
        let state = OnboardingState {
            selected_agent_ids: vec!["missing-agent".to_string()],
            selected_role_id: "project-manager".to_string(),
            selected_base_skill_ids: vec!["jira".to_string()],
            role_use_case_contents: vec![],
            selected_install_skill_ids: vec![],
            selected_install_skill_ids_initialized: false,
            selected_install_candidate_skill_ids: vec![],
            credential_values: std::collections::HashMap::new(),
            linux_devices: vec![],
        };

        let result = super::sync_onboarding_installation(OnboardingSyncCommandInput {
            state,
            selected_use_cases: vec![OnboardingUseCase {
                id: "weekly-report".to_string(),
                name: "项目周报".to_string(),
                directory: "weekly-report".to_string(),
                applicable_role_ids: vec!["project-manager".to_string()],
            }],
            agents: vec![OnboardingAgentState {
                id: "codex".to_string(),
                installed_skill_ids: vec![],
            }],
            staged_packages: vec![],
        })
        .await;

        assert!(matches!(
            result,
            crate::commands::skill::SkillResult::Error { ref error }
            if error == "Unsupported agent ids: missing-agent"
        ));
    }

    #[tokio::test]
    async fn onboarding_sync_rejects_selected_agent_ids_even_when_the_payload_includes_unsupported_targets(
    ) {
        let state = OnboardingState {
            selected_agent_ids: vec!["staging".to_string()],
            selected_role_id: "project-manager".to_string(),
            selected_base_skill_ids: vec!["jira".to_string()],
            role_use_case_contents: vec![],
            selected_install_skill_ids: vec![],
            selected_install_skill_ids_initialized: false,
            selected_install_candidate_skill_ids: vec![],
            credential_values: std::collections::HashMap::new(),
            linux_devices: vec![],
        };

        let result = super::sync_onboarding_installation(OnboardingSyncCommandInput {
            state,
            selected_use_cases: vec![OnboardingUseCase {
                id: "weekly-report".to_string(),
                name: "项目周报".to_string(),
                directory: "weekly-report".to_string(),
                applicable_role_ids: vec!["project-manager".to_string()],
            }],
            agents: vec![
                OnboardingAgentState {
                    id: "codex".to_string(),
                    installed_skill_ids: vec![],
                },
                OnboardingAgentState {
                    id: "staging".to_string(),
                    installed_skill_ids: vec![],
                },
            ],
            staged_packages: vec![],
        })
        .await;

        assert!(matches!(
            result,
            crate::commands::skill::SkillResult::Error { ref error }
            if error == "Unsupported agent ids: staging"
        ));
    }

    #[test]
    fn onboarding_state_load_supports_utf8_bom_prefixed_json() {
        let _guard = env_lock().lock().unwrap();
        let data_dir = temp_dir("onboarding-state-bom");
        let state_path = data_dir.join("onboarding-state.json");
        let original_data_dir = std::env::var(DATA_DIR_ENV_VAR).ok();

        fs::write(
            &state_path,
            concat!(
                "\u{feff}",
                "{",
                "\"selected_agent_ids\":[\"workbuddy\"],",
                "\"selected_role_id\":\"\",",
                "\"selected_base_skill_ids\":[\"jira\"],",
                "\"role_use_case_contents\":[],",
                "\"selected_install_skill_ids\":[\"jira\"],",
                "\"selected_install_skill_ids_initialized\":true,",
                "\"selected_install_candidate_skill_ids\":[\"jira\"],",
                "\"credential_values\":{\"jiraUrl\":\"https://jira.example.com\"}",
                "}"
            ),
        )
        .expect("write onboarding state");

        std::env::set_var(DATA_DIR_ENV_VAR, &data_dir);
        let loaded = super::load_onboarding_state();
        restore_env_var(DATA_DIR_ENV_VAR, original_data_dir);

        assert_eq!(loaded.selected_agent_ids, vec!["workbuddy".to_string()]);
        assert_eq!(loaded.selected_base_skill_ids, vec!["jira".to_string()]);
        assert_eq!(
            loaded.credential_values.get("jiraUrl"),
            Some(&"https://jira.example.com".to_string())
        );
    }

    #[test]
    fn onboarding_state_load_migrates_legacy_state_file_and_rewrites_metadata() {
        let _guard = env_lock().lock().unwrap();
        let data_dir = temp_dir("onboarding-state-migration");
        let state_path = data_dir.join("onboarding-state.json");
        let original_data_dir = std::env::var(DATA_DIR_ENV_VAR).ok();

        fs::write(
            &state_path,
            concat!(
                "{",
                "\"selected_agent_ids\":[\"workbuddy\"],",
                "\"selected_role_id\":\"project-manager\",",
                "\"selected_base_skill_ids\":[\"jira\"],",
                "\"role_use_case_contents\":[],",
                "\"selected_install_skill_ids\":[\"jira\"],",
                "\"selected_install_skill_ids_initialized\":true,",
                "\"selected_install_candidate_skill_ids\":[\"jira\"],",
                "\"credential_values\":{\"jiraUrl\":\"https://jira.example.com\"},",
                "\"linux_devices\":[]",
                "}"
            ),
        )
        .expect("write legacy onboarding state");

        std::env::set_var(DATA_DIR_ENV_VAR, &data_dir);
        let loaded = super::load_onboarding_state();
        restore_env_var(DATA_DIR_ENV_VAR, original_data_dir);

        assert_eq!(loaded.selected_role_id, "project-manager".to_string());
        assert_eq!(loaded.selected_base_skill_ids, vec!["jira".to_string()]);

        let persisted = fs::read_to_string(&state_path).expect("read migrated onboarding state");
        assert!(persisted.contains("\"storage_version\": 1"));
        assert!(persisted.contains(&format!(
            "\"last_migrated_app_version\": \"{}\"",
            env!("CARGO_PKG_VERSION")
        )));
    }

    #[test]
    fn onboarding_state_load_refreshes_last_migrated_app_version_for_current_schema() {
        let _guard = env_lock().lock().unwrap();
        let data_dir = temp_dir("onboarding-state-version-refresh");
        let state_path = data_dir.join("onboarding-state.json");
        let original_data_dir = std::env::var(DATA_DIR_ENV_VAR).ok();

        fs::write(
            &state_path,
            concat!(
                "{",
                "\"storage_version\":1,",
                "\"last_migrated_app_version\":\"0.0.1\",",
                "\"selected_agent_ids\":[\"workbuddy\"],",
                "\"selected_role_id\":\"project-manager\",",
                "\"selected_base_skill_ids\":[\"jira\"],",
                "\"role_use_case_contents\":[],",
                "\"selected_install_skill_ids\":[\"jira\"],",
                "\"selected_install_skill_ids_initialized\":true,",
                "\"selected_install_candidate_skill_ids\":[\"jira\"],",
                "\"credential_values\":{},",
                "\"linux_devices\":[]",
                "}"
            ),
        )
        .expect("write stale onboarding version state");

        std::env::set_var(DATA_DIR_ENV_VAR, &data_dir);
        let _ = super::load_onboarding_state();
        restore_env_var(DATA_DIR_ENV_VAR, original_data_dir);

        let persisted = fs::read_to_string(&state_path).expect("read refreshed onboarding state");
        assert!(persisted.contains("\"storage_version\": 1"));
        assert!(persisted.contains(&format!(
            "\"last_migrated_app_version\": \"{}\"",
            env!("CARGO_PKG_VERSION")
        )));
        assert!(!persisted.contains("\"last_migrated_app_version\":\"0.0.1\""));
    }

    #[test]
    fn onboarding_sync_writes_home_env_next_to_configured_data_root() {
        let _guard = env_lock().lock().unwrap();
        let actual_home = temp_dir("home-env-data-root-home");
        let data_dir = actual_home.join(".sop-to-skill");
        let unrelated_home = temp_dir("home-env-unrelated-home");
        let original_data_dir = std::env::var(DATA_DIR_ENV_VAR).ok();
        let original_home = std::env::var("HOME").ok();

        fs::create_dir_all(&data_dir).expect("create data dir");
        std::env::set_var(DATA_DIR_ENV_VAR, &data_dir);
        std::env::set_var("HOME", &unrelated_home);

        let state = OnboardingState {
            selected_agent_ids: vec!["workbuddy".to_string()],
            selected_role_id: "".to_string(),
            selected_base_skill_ids: vec![
                "confluence".to_string(),
                "jira".to_string(),
                "mail".to_string(),
            ],
            role_use_case_contents: vec![],
            selected_install_skill_ids: vec![
                "confluence".to_string(),
                "jira".to_string(),
                "mail".to_string(),
            ],
            selected_install_skill_ids_initialized: true,
            selected_install_candidate_skill_ids: vec![
                "confluence".to_string(),
                "jira".to_string(),
                "mail".to_string(),
            ],
            credential_values: HashMap::from([
                (
                    "confluenceUrl".to_string(),
                    "https://wiki.example.com".to_string(),
                ),
                ("confluenceUsername".to_string(), "wiki.user".to_string()),
                ("confluencePassword".to_string(), "wiki-secret".to_string()),
                (
                    "jiraUrl".to_string(),
                    "https://jira.example.com".to_string(),
                ),
                ("jiraUsername".to_string(), "jira.user".to_string()),
                ("jiraPassword".to_string(), "jira-secret".to_string()),
                ("mailUsername".to_string(), "pm@example.com".to_string()),
                ("mailPassword".to_string(), "mail-secret".to_string()),
            ]),
            linux_devices: vec![],
        };

        super::sync_onboarding_credentials_to_home_env(&state).expect("sync home env");

        restore_env_var("HOME", original_home);
        restore_env_var(DATA_DIR_ENV_VAR, original_data_dir);

        let actual_env_path = actual_home.join(".env");
        let unrelated_env_path = unrelated_home.join(".env");
        let content = fs::read_to_string(&actual_env_path).expect("read actual env");

        assert!(actual_env_path.exists());
        assert!(!unrelated_env_path.exists());
        assert!(content.contains("CONFLUENCE_URL=\"https://wiki.example.com\""));
        assert!(content.contains("JIRA_URL=\"https://jira.example.com\""));
        assert!(content.contains("MAIL_HOST=\"smtp.exmail.qq.com\""));
    }

    #[test]
    fn onboarding_sync_writes_selected_base_skill_credentials_to_home_env_file() {
        let home_dir = temp_dir("home-env");
        let env_path = home_dir.join(".env");
        fs::write(
            &env_path,
            "EXISTING_VAR=keep\nJIRA_URL=\"https://stale.example.com\"\n",
        )
        .expect("write existing env");

        let state = OnboardingState {
            selected_agent_ids: vec!["codex".to_string()],
            selected_role_id: "project-manager".to_string(),
            selected_base_skill_ids: vec![
                "confluence".to_string(),
                "jira".to_string(),
                "mail".to_string(),
            ],
            role_use_case_contents: vec![],
            selected_install_skill_ids: vec![],
            selected_install_skill_ids_initialized: false,
            selected_install_candidate_skill_ids: vec![],
            credential_values: HashMap::from([
                (
                    "confluenceUrl".to_string(),
                    "https://wiki.example.com".to_string(),
                ),
                ("confluenceUsername".to_string(), "wiki.user".to_string()),
                ("confluencePassword".to_string(), "wiki-secret".to_string()),
                (
                    "jiraUrl".to_string(),
                    "https://jira.example.com".to_string(),
                ),
                ("jiraUsername".to_string(), "jira.user".to_string()),
                ("jiraPassword".to_string(), "jira-secret".to_string()),
                ("mailUsername".to_string(), "pm@example.com".to_string()),
                ("mailPassword".to_string(), "mail-secret".to_string()),
            ]),
            linux_devices: vec![],
        };

        super::sync_onboarding_credentials_to_env_path(&state, &env_path).expect("sync env");

        let content = fs::read_to_string(&env_path).expect("read env");
        assert!(content.contains("EXISTING_VAR=keep"));
        assert!(content.contains("CONFLUENCE_URL=\"https://wiki.example.com\""));
        assert!(content.contains("CONFLUENCE_USERNAME=\"wiki.user\""));
        assert!(content.contains("CONFLUENCE_PASSWORD=\"wiki-secret\""));
        assert!(content.contains("JIRA_URL=\"https://jira.example.com\""));
        assert!(content.contains("JIRA_USERNAME=\"jira.user\""));
        assert!(content.contains("JIRA_PASSWORD=\"jira-secret\""));
        assert!(content.contains("MAIL_HOST=\"smtp.exmail.qq.com\""));
        assert!(content.contains("MAIL_PORT=\"465\""));
        assert!(content.contains("MAIL_USERNAME=\"pm@example.com\""));
        assert!(content.contains("MAIL_PASSWORD=\"mail-secret\""));
        assert!(content.contains("MAIL_FROM=\"pm@example.com\""));
        assert!(content.contains("MAIL_USE_SSL=\"true\""));
        assert!(content.contains("MAIL_USE_STARTTLS=\"false\""));
        assert!(!content.contains("https://stale.example.com"));
    }

    #[test]
    fn onboarding_sync_writes_linux_devices_to_home_env_file() {
        let home_dir = temp_dir("home-env-linux");
        let env_path = home_dir.join(".env");

        let state = OnboardingState {
            selected_agent_ids: vec!["codex".to_string()],
            selected_role_id: "it-manager".to_string(),
            selected_base_skill_ids: vec!["linux".to_string()],
            role_use_case_contents: vec![],
            selected_install_skill_ids: vec![],
            selected_install_skill_ids_initialized: false,
            selected_install_candidate_skill_ids: vec![],
            credential_values: HashMap::new(),
            linux_devices: vec![
                OnboardingLinuxDevice {
                    id: "linux-device-1".to_string(),
                    name: "Build Server".to_string(),
                    host: "192.168.9.20".to_string(),
                    username: "ops".to_string(),
                    password: "linux-secret".to_string(),
                },
                OnboardingLinuxDevice {
                    id: "linux-device-2".to_string(),
                    name: "Deploy Host".to_string(),
                    host: "192.168.9.21".to_string(),
                    username: "deploy".to_string(),
                    password: "deploy-secret".to_string(),
                },
            ],
        };

        super::sync_onboarding_credentials_to_env_path(&state, &env_path).expect("sync env");

        let content = fs::read_to_string(&env_path).expect("read env");
        assert!(content.contains("LINUX_DEVICES_JSON="));
        assert!(content.contains("Build Server"));
        assert!(content.contains("192.168.9.20"));
        assert!(content.contains("Deploy Host"));
        assert!(content.contains("192.168.9.21"));
    }

    #[test]
    fn onboarding_sync_removes_deselected_base_skill_credentials_from_home_env_file() {
        let home_dir = temp_dir("home-env-prune");
        let env_path = home_dir.join(".env");
        fs::write(
            &env_path,
            concat!(
                "EXISTING_VAR=keep\n",
                "JIRA_URL=\"https://stale-jira.example.com\"\n",
                "JIRA_USERNAME=\"jira.old\"\n",
                "JIRA_PASSWORD=\"jira-old-secret\"\n",
                "MAIL_HOST=\"smtp.exmail.qq.com\"\n",
                "MAIL_PORT=\"465\"\n",
                "MAIL_USERNAME=\"old@example.com\"\n",
                "MAIL_PASSWORD=\"old-mail-secret\"\n",
                "MAIL_FROM=\"old@example.com\"\n",
                "MAIL_USE_SSL=\"true\"\n",
                "MAIL_USE_STARTTLS=\"false\"\n",
            ),
        )
        .expect("write existing env");

        let state = OnboardingState {
            selected_agent_ids: vec!["codex".to_string()],
            selected_role_id: "project-manager".to_string(),
            selected_base_skill_ids: vec!["jira".to_string()],
            role_use_case_contents: vec![],
            selected_install_skill_ids: vec![],
            selected_install_skill_ids_initialized: false,
            selected_install_candidate_skill_ids: vec![],
            credential_values: HashMap::from([
                (
                    "jiraUrl".to_string(),
                    "https://jira.example.com".to_string(),
                ),
                ("jiraUsername".to_string(), "jira.user".to_string()),
                ("jiraPassword".to_string(), "jira-secret".to_string()),
            ]),
            linux_devices: vec![],
        };

        super::sync_onboarding_credentials_to_env_path(&state, &env_path).expect("sync env");

        let content = fs::read_to_string(&env_path).expect("read env");
        assert!(content.contains("EXISTING_VAR=keep"));
        assert!(content.contains("JIRA_URL=\"https://jira.example.com\""));
        assert!(!content.contains("MAIL_HOST="));
        assert!(!content.contains("MAIL_PORT="));
        assert!(!content.contains("MAIL_USERNAME="));
        assert!(!content.contains("MAIL_PASSWORD="));
        assert!(!content.contains("MAIL_FROM="));
        assert!(!content.contains("MAIL_USE_SSL="));
        assert!(!content.contains("MAIL_USE_STARTTLS="));
    }

    #[test]
    fn onboarding_credentials_sync_command_writes_selected_base_skill_credentials_to_home_env_file()
    {
        let _guard = env_lock().lock().unwrap();
        let actual_home = temp_dir("home-env-command-home");
        let data_dir = actual_home.join(".sop-to-skill");
        let unrelated_home = temp_dir("home-env-command-unrelated-home");
        let original_data_dir = std::env::var(DATA_DIR_ENV_VAR).ok();
        let original_home = std::env::var("HOME").ok();

        fs::create_dir_all(&data_dir).expect("create data dir");
        std::env::set_var(DATA_DIR_ENV_VAR, &data_dir);
        std::env::set_var("HOME", &unrelated_home);

        let state = OnboardingState {
            selected_agent_ids: vec!["codex".to_string()],
            selected_role_id: "project-manager".to_string(),
            selected_base_skill_ids: vec!["jira".to_string(), "mail".to_string()],
            role_use_case_contents: vec![],
            selected_install_skill_ids: vec![],
            selected_install_skill_ids_initialized: false,
            selected_install_candidate_skill_ids: vec![],
            credential_values: HashMap::from([
                (
                    "jiraUrl".to_string(),
                    "https://jira.example.com".to_string(),
                ),
                ("jiraUsername".to_string(), "jira.user".to_string()),
                ("jiraPassword".to_string(), "jira-secret".to_string()),
                ("mailUsername".to_string(), "pm@example.com".to_string()),
                ("mailPassword".to_string(), "mail-secret".to_string()),
            ]),
            linux_devices: vec![],
        };

        let result = super::sync_onboarding_credentials(state);

        restore_env_var("HOME", original_home);
        restore_env_var(DATA_DIR_ENV_VAR, original_data_dir);

        assert!(matches!(
            result,
            crate::commands::skill::SkillResult::Success { success: true }
        ));

        let actual_env_path = actual_home.join(".env");
        let content = fs::read_to_string(&actual_env_path).expect("read actual env");

        assert!(actual_env_path.exists());
        assert!(!unrelated_home.join(".env").exists());
        assert!(content.contains("JIRA_URL=\"https://jira.example.com\""));
        assert!(content.contains("JIRA_USERNAME=\"jira.user\""));
        assert!(content.contains("MAIL_HOST=\"smtp.exmail.qq.com\""));
        assert!(content.contains("MAIL_FROM=\"pm@example.com\""));
    }

    #[tokio::test]
    async fn onboarding_sync_requires_required_atlassian_urls_before_installing() {
        let state = OnboardingState {
            selected_agent_ids: vec![],
            selected_role_id: "".to_string(),
            selected_base_skill_ids: vec!["jira".to_string()],
            role_use_case_contents: vec![],
            selected_install_skill_ids: vec![],
            selected_install_skill_ids_initialized: false,
            selected_install_candidate_skill_ids: vec![],
            credential_values: HashMap::from([
                ("jiraUsername".to_string(), "jira.user".to_string()),
                ("jiraPassword".to_string(), "jira-secret".to_string()),
            ]),
            linux_devices: vec![],
        };

        let result = super::sync_onboarding_installation(OnboardingSyncCommandInput {
            state,
            selected_use_cases: vec![],
            agents: vec![],
            staged_packages: vec![],
        })
        .await;

        assert!(matches!(
            result,
            crate::commands::skill::SkillResult::Error { ref error }
            if error.contains("jiraUrl")
        ));
    }

    #[test]
    fn onboarding_sync_preserves_partial_success_information_when_one_agent_sync_fails() {
        let plan = crate::onboarding::sync::build_selected_agent_install_sync_plans(
            &[
                OnboardingAgentState {
                    id: "codex".to_string(),
                    installed_skill_ids: vec!["jira".to_string()],
                },
                OnboardingAgentState {
                    id: "workbuddy".to_string(),
                    installed_skill_ids: vec!["confluence".to_string()],
                },
            ],
            &[
                "jira".to_string(),
                "confluence".to_string(),
                "project-manager-weekly-report".to_string(),
                "test-project-manager-weekly-report".to_string(),
            ],
            &["codex".to_string(), "workbuddy".to_string()],
            &[
                "jira".to_string(),
                "confluence".to_string(),
                "project-manager-weekly-report".to_string(),
                "test-project-manager-weekly-report".to_string(),
            ],
        );

        let result = apply_onboarding_sync_plan(plan, |agent_preview| {
            if agent_preview.agent_id == "workbuddy" {
                Err("simulated sync failure".to_string())
            } else {
                Ok(())
            }
        });

        assert_eq!(
            result.selected_agent_ids,
            vec!["codex".to_string(), "workbuddy".to_string()]
        );
        assert_eq!(result.agent_results.len(), 2);
        assert_eq!(
            result.agent_results,
            vec![
                OnboardingAgentSyncResult {
                    agent_id: "codex".to_string(),
                    added_skill_ids: vec![
                        "confluence".to_string(),
                        "project-manager-weekly-report".to_string(),
                        "test-project-manager-weekly-report".to_string(),
                    ],
                    removed_skill_ids: vec![],
                    unchanged_skill_ids: vec!["jira".to_string()],
                    success: true,
                    error: None,
                },
                OnboardingAgentSyncResult {
                    agent_id: "workbuddy".to_string(),
                    added_skill_ids: vec![
                        "jira".to_string(),
                        "project-manager-weekly-report".to_string(),
                        "test-project-manager-weekly-report".to_string(),
                    ],
                    removed_skill_ids: vec![],
                    unchanged_skill_ids: vec!["confluence".to_string()],
                    success: false,
                    error: Some("simulated sync failure".to_string()),
                },
            ]
        );
    }
}
