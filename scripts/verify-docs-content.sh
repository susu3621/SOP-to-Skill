#!/usr/bin/env bash
set -euo pipefail

test -f docs/index.md

grep -q "AI 时代先受益的，是每天被重复工作困住的人。" docs/index.md
grep -q "这些麻烦，你大概每天都在碰" docs/index.md
grep -q "AI 帮你的，不只是写几句话" docs/index.md
grep -q "没有 AI 的一天，和有 AI 协作的一天" docs/index.md
grep -q "这对你自己的好处，比公司宣传里写得更具体" docs/index.md
grep -q "这不是程序员专属，而是绝大多数岗位都能开始用" docs/index.md
grep -q "你不需要先变成专家，先从最烦的环节开始就够了" docs/index.md
grep -q "未来拉开差距的，往往不是最忙的人" docs/index.md
grep -Fq '```mermaid' docs/index.md

npm run docs:build >/dev/null
grep -q "AI 时代先受益的，是每天被重复工作困住的人。" docs/.vitepress/dist/index.html
