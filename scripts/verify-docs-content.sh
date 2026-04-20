#!/usr/bin/env bash
set -euo pipefail

test -f docs/index.md

grep -q "hero-blueprint" docs/index.md
grep -q "support-interface" docs/index.md
grep -q "challenge-flow" docs/index.md
grep -q "growth-steps" docs/index.md
grep -q "solution-stack" docs/index.md
grep -q "proof-strip" docs/index.md
grep -q "blueprint-scene" docs/index.md
grep -q "Skill 连接两端" docs/index.md
grep -q "企业 AI，先做 Skill。" docs/index.md
grep -q "aside: false" docs/index.md
grep -q "outline: false" docs/index.md
grep -q "lastUpdated: false" docs/index.md
! grep -Fq '```mermaid' docs/index.md
grep -q "scheduleMermaidBootstrap" docs/.vitepress/theme/index.ts
grep -q "setTimeout(() => tick(attempt + 1), 50)" docs/.vitepress/theme/index.ts

rm -rf docs/.vitepress/.temp docs/.vitepress/dist
npm run docs:build >/dev/null
grep -q "企业 AI，先做 Skill。" docs/.vitepress/dist/index.html
