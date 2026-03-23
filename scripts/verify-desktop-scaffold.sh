#!/usr/bin/env bash
set -euo pipefail

test -f index.html
test -f src/main.tsx
test -f src/App.tsx
test -f src-tauri/Cargo.toml
test -f src-tauri/tauri.conf.json
test -f .github/workflows/build-desktop.yml

npm run test
npm run build
