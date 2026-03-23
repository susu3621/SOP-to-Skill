#!/usr/bin/env bash
set -euo pipefail

test -f package.json
test -f docs/.vitepress/config.mts
test -f docs/.vitepress/theme/index.ts
test -f docs/.vitepress/theme/custom.css

npm run docs:build

test -f docs/.vitepress/dist/index.html
