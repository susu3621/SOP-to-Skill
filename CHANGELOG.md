# Changelog

All notable changes to `SOP to Skill` are recorded here.

## v0.2.0 - 2026-04-13

### Added

- Added role-driven onboarding for `项目经理`、`质量经理`、`IT经理`.
- Added built-in `Gerrit`、`SVN`、`Linux` base skills alongside `Jira`、`Confluence`、`腾讯企业邮箱`.
- Added automatic infrastructure connection tests and environment checks after selecting base skills.
- Added automatic environment installation guidance for Windows and macOS base skills.
- Added multi-device Linux credential input in onboarding.
- Added desktop log export for bug reporting.
- Added storage schema versioning and automatic migration for persisted onboarding/config data.

### Changed

- Moved infrastructure credential collection earlier in onboarding so later steps can reuse saved access.
- Switched built-in use case editing to structured questions for system-provided use cases.
- Expanded README and public docs to reflect the current role and base-skill set.

### Fixed

- Fixed cross-platform skill-manifest hashing by normalizing text line endings.
- Fixed Windows script execution in onboarding manager by invoking shell scripts through `bash`.
- Fixed Windows-facing tests and path display logic to avoid separator-specific assumptions.

## v0.1.0 - 2026-04-09

### Added

- Added the first public desktop onboarding flow for `WorkBuddy`.
- Added project-manager onboarding with configurable use cases and bilingual UI.
- Added initial `Jira`、`Confluence`、`腾讯企业邮箱` base skills and dual generated skill packages.
- Added GitHub Actions desktop build pipeline and updater release scaffolding.
