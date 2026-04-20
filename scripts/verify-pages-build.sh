#!/usr/bin/env bash
set -euo pipefail

test -f package.json
test -f docs/.vitepress/config.mts
test -f docs/.vitepress/theme/index.ts
test -f docs/.vitepress/theme/custom.css
test -f docs/download.md
test -f docs/product-docs/index.md

rm -rf docs/.vitepress/.temp docs/.vitepress/dist
npm run docs:build

test -f docs/.vitepress/dist/index.html
test -f docs/.vitepress/dist/download.html
test -f docs/.vitepress/dist/product-docs/index.html
grep -q 'SOP to Skill' docs/.vitepress/dist/index.html
grep -q 'SOP to Skill' docs/.vitepress/dist/download.html
grep -q 'SOP to Skill' docs/.vitepress/dist/product-docs/index.html
grep -q 'https://github.com/susu3621/SOP-to-Skill' docs/.vitepress/dist/index.html
grep -q '/SOP-to-Skill/assets/' docs/.vitepress/dist/index.html
! grep -q '/skills-for-no-engineer/assets/' docs/.vitepress/dist/index.html
grep -q '产品文档' docs/.vitepress/dist/index.html
grep -q 'macOS' docs/.vitepress/dist/download.html
