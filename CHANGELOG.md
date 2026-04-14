# Changelog

All notable changes to `SOP to Skill` are recorded here.

## v0.2.0 - 2026-04-14

### Added

- Added role-driven onboarding for `项目经理`、`质量经理`、`IT经理`.
- Added built-in `Gerrit`、`SVN`、`Linux` base skills alongside `Jira`、`Confluence`、`腾讯企业邮箱`.
- Added automatic environment checks plus manual connection tests for services, Linux devices, and SVN repositories.
- Added automatic environment installation guidance for Windows and macOS base skills.
- Added multi-device Linux credential input and multi-repository SVN credential input in onboarding.
- Added desktop log export and visible current-build version display in the desktop header.
- Added storage schema versioning and automatic migration for persisted onboarding/config data.

### Changed

- Moved infrastructure credential collection earlier in onboarding so later steps can reuse saved access.
- Changed credential saving so it no longer auto-runs connection tests after save; users now trigger tests manually when ready.
- Switched built-in use case editing to structured questions for system-provided use cases.
- Expanded README and public docs to reflect the current role and base-skill set.

### Fixed

- Fixed macOS onboarding environment detection so `brew` and `python3` resolve from the login-shell `PATH`.
- Fixed Windows onboarding so background commands no longer flash extra `cmd` windows.
- Fixed Windows Python probing to fall back from `py -3` to `python` when the launcher path is broken.
- Fixed Windows SVN setup and probing so TortoiseSVN CLI installs correctly and localized `svn` output no longer crashes the test script.
- Fixed Gerrit onboarding parsing and error rendering for Gerrit JSON responses on Windows.
- Fixed onboarding responsiveness so environment checks and connection tests no longer block the UI.
- Fixed cross-platform skill-manifest hashing by normalizing text line endings.
- Fixed Windows script execution in onboarding manager by invoking shell scripts through `bash`.
- Fixed Windows-facing tests and path display logic to avoid separator-specific assumptions.

## v0.1.0 - 2026-04-09

### Added

- Added the first public desktop onboarding flow for `WorkBuddy`.
- Added project-manager onboarding with configurable use cases and bilingual UI.
- Added initial `Jira`、`Confluence`、`腾讯企业邮箱` base skills and dual generated skill packages.
- Added GitHub Actions desktop build pipeline and updater release scaffolding.
