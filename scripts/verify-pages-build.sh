#!/usr/bin/env bash
set -euo pipefail

test -f package.json
test -f docs/.vitepress/config.mts
test -f docs/.vitepress/theme/index.ts
test -f docs/.vitepress/theme/custom.css

rm -rf docs/.vitepress/.temp docs/.vitepress/dist
npm run docs:build

test -f docs/.vitepress/dist/index.html
grep -q 'https://github.com/susu3621/SOP-to-Skill' docs/.vitepress/dist/index.html
grep -q '/SOP-to-Skill/assets/' docs/.vitepress/dist/index.html
! grep -q '/skills-for-no-engineer/assets/' docs/.vitepress/dist/index.html
