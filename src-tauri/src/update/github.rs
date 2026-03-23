use crate::models::{SkillError, SkillTemplate, TemplateSource, UpdateStatus};
use octocrab::Octocrab;
use semver::Version;
use serde::{Deserialize, Serialize};

/// GitHub release info
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReleaseInfo {
    pub tag_name: String,
    pub name: Option<String>,
    pub published_at: Option<String>,
    pub html_url: String,
}

/// Check for updates from GitHub
pub async fn check_github_updates(
    owner: &str,
    repo: &str,
    current_version: &str,
) -> Result<UpdateStatus, SkillError> {
    let octocrab = Octocrab::builder()
        .build()
        .map_err(|e| SkillError::GitHubError(format!("Failed to create GitHub client: {}", e)))?;

    let releases = octocrab
        .repos(owner, repo)
        .releases()
        .list()
        .send()
        .await
        .map_err(|e| SkillError::GitHubError(format!("Failed to fetch releases: {}", e)))?;

    if let Some(latest_release) = releases.items.first() {
        let latest_tag = latest_release
            .tag_name
            .strip_prefix('v')
            .unwrap_or(&latest_release.tag_name);

        let current = Version::parse(current_version).map_err(|e| {
            SkillError::GitHubError(format!("Invalid current version: {}", e))
        })?;

        let latest = Version::parse(latest_tag)
            .map_err(|e| SkillError::GitHubError(format!("Invalid latest version: {}", e)))?;

        if latest > current {
            return Ok(UpdateStatus::UpdateAvailable {
                latest_version: latest_tag.to_string(),
            });
        }
    }

    Ok(UpdateStatus::UpToDate)
}

/// Get the latest release info
pub async fn get_latest_release(
    owner: &str,
    repo: &str,
) -> Result<Option<ReleaseInfo>, SkillError> {
    let octocrab = Octocrab::builder()
        .build()
        .map_err(|e| SkillError::GitHubError(format!("Failed to create GitHub client: {}", e)))?;

    let releases = octocrab
        .repos(owner, repo)
        .releases()
        .list()
        .send()
        .await
        .map_err(|e| SkillError::GitHubError(format!("Failed to fetch releases: {}", e)))?;

    Ok(releases.items.first().map(|r| ReleaseInfo {
        tag_name: r.tag_name.clone(),
        name: r.name.clone(),
        published_at: r.published_at.map(|d| d.to_rfc3339()),
        html_url: r.html_url.to_string(),
    }))
}

/// Parse GitHub URL to extract owner and repo
pub fn parse_github_url(url: &str) -> Option<(String, String)> {
    // Handle various GitHub URL formats
    let url = url.trim_end_matches('/');

    // https://github.com/owner/repo
    if let Some(stripped) = url.strip_prefix("https://github.com/") {
        let parts: Vec<&str> = stripped.split('/').collect();
        if parts.len() >= 2 {
            return Some((parts[0].to_string(), parts[1].to_string()));
        }
    }

    // git@github.com:owner/repo.git
    if let Some(stripped) = url.strip_prefix("git@github.com:") {
        let stripped = stripped.trim_end_matches(".git");
        let parts: Vec<&str> = stripped.split('/').collect();
        if parts.len() >= 2 {
            return Some((parts[0].to_string(), parts[1].to_string()));
        }
    }

    None
}

/// Update check result for frontend
#[derive(Debug, Serialize)]
pub struct UpdateCheckResult {
    pub skill_id: String,
    pub current_version: String,
    pub update_status: String,
    pub latest_version: Option<String>,
    pub release_url: Option<String>,
}

/// Check all skills for updates
pub async fn check_all_updates(
    templates: Vec<SkillTemplate>,
) -> Result<Vec<UpdateCheckResult>, SkillError> {
    let mut results = Vec::new();

    for template in templates {
        let status = if let Some(ref source) = template.source {
            match source {
                TemplateSource::Github { url, .. } => {
                    if let Some((owner, repo)) = parse_github_url(url) {
                        match check_github_updates(&owner, &repo, &template.version).await {
                            Ok(s) => s,
                            Err(_) => UpdateStatus::Unknown,
                        }
                    } else {
                        UpdateStatus::Unknown
                    }
                }
                TemplateSource::Local { .. } => UpdateStatus::Unknown,
            }
        } else {
            UpdateStatus::Unknown
        };

        let (status_str, latest, release_url) = match &status {
            UpdateStatus::UpToDate => ("up-to-date".to_string(), None, None),
            UpdateStatus::UpdateAvailable { latest_version } => {
                if let Some(ref source) = template.source {
                    if let TemplateSource::Github { url, .. } = source {
                        if let Some((owner, repo)) = parse_github_url(url) {
                            (
                                "update-available".to_string(),
                                Some(latest_version.clone()),
                                Some(format!("https://github.com/{}/{}", owner, repo)),
                            )
                        } else {
                            (
                                "update-available".to_string(),
                                Some(latest_version.clone()),
                                None,
                            )
                        }
                    } else {
                        (
                            "update-available".to_string(),
                            Some(latest_version.clone()),
                            None,
                        )
                    }
                } else {
                    (
                        "update-available".to_string(),
                        Some(latest_version.clone()),
                        None,
                    )
                }
            }
            UpdateStatus::Unknown => ("unknown".to_string(), None, None),
        };

        results.push(UpdateCheckResult {
            skill_id: template.id.clone(),
            current_version: template.version.clone(),
            update_status: status_str,
            latest_version: latest,
            release_url,
        });
    }

    Ok(results)
}

/// Tauri command to check for skill updates
#[tauri::command]
pub async fn check_skill_updates() -> crate::commands::skill::SkillResult<Vec<UpdateCheckResult>> {
    use crate::template::load_all_templates;

    let templates = match load_all_templates() {
        Ok(t) => t,
        Err(e) => return crate::commands::skill::SkillResult::Error { error: e.to_string() },
    };

    match check_all_updates(templates).await {
        Ok(results) => crate::commands::skill::SkillResult::Success(results),
        Err(e) => crate::commands::skill::SkillResult::Error { error: e.to_string() },
    }
}

/// Tauri command to check for app updates
#[tauri::command]
pub async fn check_app_updates() -> crate::commands::skill::SkillResult<Option<ReleaseInfo>> {
    match get_latest_release("skills-for-no-engineer", "configurator").await {
        Ok(info) => crate::commands::skill::SkillResult::Success(info),
        Err(e) => crate::commands::skill::SkillResult::Error { error: e.to_string() },
    }
}
