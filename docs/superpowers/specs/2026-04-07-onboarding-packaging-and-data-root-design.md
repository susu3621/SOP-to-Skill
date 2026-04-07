# Onboarding Packaging And Data Root Design

## Goal

Unify the remaining onboarding install-page wording and packaging/data-path naming around `sop-to-skill`, while keeping the user-facing application title as `SOP to Skill`.

This change covers four user-visible outcomes:
- Install-page generated-skill columns use `生产用` and `测试用`
- Home-screen bottom "安装技能" summary switches from a flat list to the same three-column grouping
- Generated desktop artifacts are renamed to `sop-to-skill`
- The app-owned data root moves from `SkillConfigurator` to `sop-to-skill`

## Current State

The project is only partially renamed:
- UI title and bundle product name are already `SOP to Skill`
- The install-page table still says `生产技能 / 测试技能`
- The home summary still renders install skills as one flat list
- Cargo/Tauri build outputs still use `skill-configurator`
- App-owned config/cache/install data still lives under `SkillConfigurator`
- Tauri app identifier is still `com.skillsfornoengineer.configurator`

On Windows this currently results in:
- `C:\Users\sujun\AppData\Roaming\SkillConfigurator`
- `C:\Users\sujun\AppData\Local\com.skillsfornoengineer.configurator`
- `C:\Users\sujun\AppData\Local\Skill Configurator`

This design intentionally fixes the first and fourth paths, but leaves the Tauri app identifier unchanged for now.

## Decision

Use `SOP to Skill` as the user-facing display name and `sop-to-skill` as the internal package/data slug.

Specifically:
- UI copy stays `SOP to Skill`
- Generated artifact filenames become `sop-to-skill`
- App-owned data directory becomes `sop-to-skill`
- Tauri `identifier` remains unchanged in this round

## Why Not Change The Tauri Identifier

Two alternatives were considered:

### Option 1: Minimal rename only

Rename visible copy and output files, but leave app data under `SkillConfigurator`.

This is lower risk, but it leaves the naming split unresolved and does not satisfy the data-directory requirement.

### Option 2: Recommended

Rename visible install-page wording, artifact filenames, and app-owned data root to `sop-to-skill`, but keep the Tauri `identifier` unchanged.

This gives consistent filenames and app-managed data paths while avoiding a broader app-identity migration.

### Option 3: Full identity reset

Also change the Tauri `identifier`.

This would affect OS-level app identity and Tauri-managed local paths, which is a larger migration and unnecessary for the requested outcomes.

## UI Design

### Install Page

Keep the current three-column structure in the generated-skill table, but rename:
- `生产技能` -> `生产用`
- `测试技能` -> `测试用`

The per-cell environment label uses the same wording.

### Home Summary

Replace the current flat `安装技能` value list with a structured summary section that mirrors the install page:
- one row per use case
- columns: `岗位用例 / 生产用 / 测试用`

Base skills remain listed separately in the existing `基础技能` summary group. The new three-column install summary only covers generated role/use-case skills.

If a generated skill is not selected, the corresponding cell shows `未安装`.

## Packaging Design

### Windows

Rename the generated portable executable and deployed filename to:
- `sop-to-skill.exe`

### macOS

Rename exported DMG filenames to:
- `sop-to-skill-<version>-<arch>.dmg`

The change should happen in the build/output pipeline rather than only in deployment scripts, so GitHub artifacts and manual local builds match.

## Data Root Design

### New App-Owned Root

Move app-managed data from:
- `dirs::data_dir()/SkillConfigurator`

to:
- `dirs::data_dir()/sop-to-skill`

This affects:
- `config.json`
- `installed/`
- `cache/`
- fallback `skills/` storage outside the repo workspace

### Migration Behavior

On startup or first write, the app should:
1. Prefer the new root if it already exists
2. Otherwise, if the old root exists, create the new root and migrate app-owned files into it
3. Leave the old directory alone after a successful copy/move unless cleanup is trivial and safe

The migration must be idempotent:
- running twice should not corrupt data
- existing files in the new root win over old files

This migration only applies to the app-owned `SkillConfigurator` directory. It does not attempt to rewrite Tauri-managed directories under `LocalAppData`.

## File/Module Impact

Expected implementation areas:
- `src/features/onboarding/OnboardingShell.tsx`
- `src/features/onboarding/OnboardingShell.test.tsx`
- `src/features/onboarding/steps/InstallSelectionStep.tsx`
- `src/styles.css`
- `src-tauri/Cargo.toml`
- `.github/workflows/build-desktop.yml`
- `scripts/deploy-windows-artifact.sh`
- `scripts/install-skill-configurator.ps1` or a renamed equivalent
- `scripts/verify-desktop-scaffold.sh`
- `src-tauri/src/template/loader.rs`
- `src-tauri/src/commands/config.rs`
- any tests that assert old filenames or old root paths

## Testing

Required checks:
- install-page table labels render as `生产用 / 测试用`
- home summary renders generated install skills in three columns
- old data root migrates into `sop-to-skill`
- repeated migration is safe
- `npm run verify:desktop` remains green
- Windows deployment still launches the renamed portable exe in Session 1

## Risks

- Renaming the cargo package can affect binary naming and any workflow scripts that hardcode `skill-configurator.exe`
- Home-summary grouping can become brittle if it shares too much rendering logic with the install page
- Data migration is easy to get subtly wrong if overwrite rules are unclear; new-root precedence must be explicit

## Explicit Non-Goals

- Changing the Tauri app identifier
- Rewriting all historical temporary-directory prefixes
- Cleaning up old LocalAppData directories owned by the existing identifier
