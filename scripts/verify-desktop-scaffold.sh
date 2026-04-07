#!/usr/bin/env bash
set -euo pipefail

test -f src-tauri/tauri.macos.conf.json
test -f src-tauri/tauri.windows.conf.json
test -f src-tauri/tauri.release.conf.json
test -f scripts/build-desktop-all.cjs
! rg -n '"targets"' src-tauri/tauri.conf.json
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
rg -n 'bundle/dmg/\*\.dmg' .github/workflows/build-desktop.yml
rg -n 'bundle/nsis/\*\.exe' .github/workflows/build-desktop.yml
! rg -n 'desktop-macos\.tar\.gz' .github/workflows/build-desktop.yml
rg -n 'workflow_dispatch:' .github/workflows/build-desktop.yml
rg -n 'release_build:' .github/workflows/build-desktop.yml
rg -n 'default:\s*false' .github/workflows/build-desktop.yml
rg -n "github\.event\.inputs\.release_build" .github/workflows/build-desktop.yml
! rg -n "if: github\.event_name == 'workflow_dispatch' \|\| startsWith\(github\.ref, 'refs/tags/v'\)" .github/workflows/build-desktop.yml
rg -n 'uploadWorkflowArtifacts:\s*false' .github/workflows/build-desktop.yml
rg -n 'uploadUpdaterJson:\s*true' .github/workflows/build-desktop.yml
rg -n 'uploadUpdaterSignatures:\s*true' .github/workflows/build-desktop.yml
rg -n 'releaseDraft:\s*false' .github/workflows/build-desktop.yml
rg -n 'tagName:' .github/workflows/build-desktop.yml
rg -n 'args:\s*--config src-tauri/tauri.release.conf.json' .github/workflows/build-desktop.yml
rg -n "if: \(github\.event_name == 'workflow_dispatch' && github\.event\.inputs\.release_build == 'true'\) \|\| startsWith\(github\.ref, 'refs/tags/v'\)" .github/workflows/build-desktop.yml
rg -n "if: matrix\.os == 'macos-latest' && github\.event_name == 'workflow_dispatch' && github\.event\.inputs\.release_build == 'true'" .github/workflows/build-desktop.yml
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

npm run verify:skills
npm run test
npm run build
