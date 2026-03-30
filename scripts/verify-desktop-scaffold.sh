#!/usr/bin/env bash
set -euo pipefail

test -f src-tauri/tauri.macos.conf.json
test -f src-tauri/tauri.windows.conf.json
test -f scripts/build-desktop-all.cjs
! rg -n '"targets"' src-tauri/tauri.conf.json
rg -n 'desktop-macos' .github/workflows/build-desktop.yml
rg -n 'desktop-windows' .github/workflows/build-desktop.yml
rg -n 'actions/checkout@v6' .github/workflows/build-desktop.yml
rg -n 'actions/setup-node@v6' .github/workflows/build-desktop.yml
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
rg -n 'uploadWorkflowArtifacts:\s*false' .github/workflows/build-desktop.yml
rg -n 'releaseDraft:\s*true' .github/workflows/build-desktop.yml
rg -n 'tagName:' .github/workflows/build-desktop.yml
rg -n "if: matrix\.os == 'macos-latest' && github\.event_name == 'workflow_dispatch'" .github/workflows/build-desktop.yml
rg -n "APPLE_SIGNING_IDENTITY: '-'" .github/workflows/build-desktop.yml
rg -n 'APPLE_CERTIFICATE' .github/workflows/build-desktop.yml
rg -n 'APPLE_API_ISSUER' .github/workflows/build-desktop.yml
rg -n 'APPLE_API_KEY_PATH' .github/workflows/build-desktop.yml

test -f index.html
test -f src/main.tsx
test -f src/App.tsx
test -f src-tauri/Cargo.toml
test -f src-tauri/tauri.conf.json
test -f .github/workflows/build-desktop.yml

npm run test
npm run build
