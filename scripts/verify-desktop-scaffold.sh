#!/usr/bin/env bash
set -euo pipefail

test -f src-tauri/tauri.macos.conf.json
test -f src-tauri/tauri.windows.conf.json
test -f src-tauri/tauri.release.conf.json
test -f scripts/build-desktop-all.cjs
test -f scripts/build-desktop-local.cjs
test -f scripts/build-desktop-local.test.ts
test -f scripts/lib/build-desktop-local.cjs
! rg -n '"targets"' src-tauri/tauri.conf.json
rg -n '"build:local:mac"' package.json
rg -n '"build:local:win"' package.json
rg -n 'artifacts/desktop/local' LOCAL_BUILD.md
rg -n 'artifacts/desktop/local' LOCAL_BUILD_CN.md
rg -n 'createUpdaterArtifacts' src-tauri/tauri.release.conf.json
rg -n 'latest/download/latest\.json' src-tauri/tauri.release.conf.json
rg -n 'tauri-plugin-updater' src-tauri/Cargo.toml
rg -n 'desktop-macos' .github/workflows/build-desktop.yml
rg -n 'desktop-windows' .github/workflows/build-desktop.yml
rg -n 'actions/checkout@v6' .github/workflows/build-desktop.yml
rg -n 'actions/setup-node@v6' .github/workflows/build-desktop.yml
rg -n 'npm run verify:skills' .github/workflows/build-desktop.yml
rg -n 'actions/checkout@v6' .github/workflows/deploy-pages.yml
rg -n 'actions/setup-node@v6' .github/workflows/deploy-pages.yml
! rg -n 'actions/checkout@v5' .github/workflows
! rg -n 'actions/setup-node@v5' .github/workflows
! rg -n 'actions/checkout@v4' .github/workflows
! rg -n 'actions/setup-node@v4' .github/workflows
rg -n 'tauri-apps/tauri-action@v0\.6\.2' .github/workflows/build-desktop.yml
rg -n 'actions/upload-artifact@v4' .github/workflows/build-desktop.yml
rg -n 'actions/download-artifact@v4' .github/workflows/build-desktop.yml
rg -n 'bundle/dmg/sop-to-skill-.*\.dmg' .github/workflows/build-desktop.yml
rg -n 'target/release/sop-to-skill\.exe' .github/workflows/build-desktop.yml
rg -n '"productName": "SOP-to-Skill"' src-tauri/tauri.conf.json
rg -n 'Prepare macOS updater bundle workflow artifact' .github/workflows/build-desktop.yml
rg -n 'desktop-macos-updater' .github/workflows/build-desktop.yml
rg -n 'Publish macOS updater assets and merge release updater manifest' .github/workflows/build-desktop.yml
rg -n 'SOP-to-Skill\.app\.tar\.gz' .github/workflows/build-desktop.yml
rg -n 'darwin-aarch64' .github/workflows/build-desktop.yml
rg -n 'workflow_dispatch:' .github/workflows/build-desktop.yml
rg -n 'release_build:' .github/workflows/build-desktop.yml
rg -n 'default:\s*false' .github/workflows/build-desktop.yml
rg -n "github\.event\.inputs\.release_build" .github/workflows/build-desktop.yml
! rg -n "if: github\.event_name == 'workflow_dispatch' \|\| startsWith\(github\.ref, 'refs/tags/v'\)" .github/workflows/build-desktop.yml
! rg -n 'uploadWorkflowArtifacts:' .github/workflows/build-desktop.yml
! rg -n 'uploadUpdaterJson:' .github/workflows/build-desktop.yml
! rg -n 'uploadUpdaterSignatures:' .github/workflows/build-desktop.yml
rg -n 'includeUpdaterJson:\s*true' .github/workflows/build-desktop.yml
rg -n 'releaseDraft:\s*false' .github/workflows/build-desktop.yml
rg -n 'HAS_APPLE_SIGNING_SECRETS' .github/workflows/build-desktop.yml
rg -n 'tagName:' .github/workflows/build-desktop.yml
rg -n 'args:\s*--config src-tauri/tauri.release.conf.json' .github/workflows/build-desktop.yml
rg -n "if: \(github\.event_name == 'workflow_dispatch' && github\.event\.inputs\.release_build == 'true'\) \|\| startsWith\(github\.ref, 'refs/tags/v'\)" .github/workflows/build-desktop.yml
rg -n "if: matrix\.os == 'macos-latest' && \(\(github\.event_name == 'workflow_dispatch' && github\.event\.inputs\.release_build == 'true'\) \|\| startsWith\(github\.ref, 'refs/tags/v'\)\) && env\.HAS_APPLE_SIGNING_SECRETS == 'true'" .github/workflows/build-desktop.yml
rg -n 'Build release macOS desktop bundle with Apple signing' .github/workflows/build-desktop.yml
rg -n 'Build release macOS desktop bundle with ad-hoc signing' .github/workflows/build-desktop.yml
rg -n "if: \(\(github\.event_name == 'workflow_dispatch' && github\.event\.inputs\.release_build == 'true'\) \|\| startsWith\(github\.ref, 'refs/tags/v'\)\) && matrix\.os == 'windows-latest'" .github/workflows/build-desktop.yml
rg -n "if: \(github\.event_name == 'push' \|\| \(github\.event_name == 'workflow_dispatch' && github\.event\.inputs\.release_build != 'true'\)\) && !startsWith\(github\.ref, 'refs/tags/v'\) && matrix\.os == 'macos-latest'" .github/workflows/build-desktop.yml
rg -n "if: \(github\.event_name == 'push' \|\| \(github\.event_name == 'workflow_dispatch' && github\.event\.inputs\.release_build != 'true'\)\) && !startsWith\(github\.ref, 'refs/tags/v'\) && matrix\.os != 'macos-latest'" .github/workflows/build-desktop.yml
rg -n "APPLE_SIGNING_IDENTITY: '-'" .github/workflows/build-desktop.yml
rg -n 'APPLE_CERTIFICATE' .github/workflows/build-desktop.yml
rg -n 'APPLE_API_ISSUER' .github/workflows/build-desktop.yml
rg -n 'APPLE_API_KEY_PATH' .github/workflows/build-desktop.yml
rg -n 'TAURI_SIGNING_PRIVATE_KEY' .github/workflows/build-desktop.yml
rg -n 'TAURI_UPDATER_PUBLIC_KEY' .github/workflows/build-desktop.yml

test -f index.html
test -f src/main.tsx
test -f src/App.tsx
test -f src-tauri/Cargo.toml
test -f src-tauri/tauri.conf.json
test -f .github/workflows/build-desktop.yml
rg -n 'windows_subsystem = "windows"' src-tauri/src/main.rs
test -f scripts/deploy-windows-artifact.sh
test -f scripts/install-sop-to-skill.ps1

npm run verify:skills
npm run test
npm run build
