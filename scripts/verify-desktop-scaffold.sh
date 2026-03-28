#!/usr/bin/env bash
set -euo pipefail

test -f src-tauri/tauri.macos.conf.json
test -f src-tauri/tauri.windows.conf.json
test -f scripts/build-desktop-all.cjs
! rg -n '"targets"' src-tauri/tauri.conf.json
rg -n 'desktop-macos' .github/workflows/build-desktop.yml
rg -n 'desktop-windows' .github/workflows/build-desktop.yml
rg -n 'tauri-apps/tauri-action@v0\.6\.2' .github/workflows/build-desktop.yml
rg -n 'actions/upload-artifact@v4' .github/workflows/build-desktop.yml
rg -n 'desktop-macos\.tar\.gz' .github/workflows/build-desktop.yml
! rg -n 'uploadWorkflowArtifacts:' .github/workflows/build-desktop.yml

test -f index.html
test -f src/main.tsx
test -f src/App.tsx
test -f src-tauri/Cargo.toml
test -f src-tauri/tauri.conf.json
test -f .github/workflows/build-desktop.yml

npm run test
npm run build
