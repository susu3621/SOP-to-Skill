# GitHub Web Docs Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 把仓库中的单个 HTML 素材页重构成“README 入口 + 单页 GitHub Pages 网页”的开源项目文档形态，并保持 `docs/index.md` 为唯一正式内容源。

**Architecture:** 使用 `VitePress` 作为静态站点生成器，将 `docs/index.md` 生成为 GitHub Pages 首页；`README.md` 仅做仓库入口说明；原始 HTML 挪到 `references/` 做参考；使用 GitHub Actions 官方推荐的 Pages 工作流进行发布。

**Tech Stack:** Markdown, VitePress, Vue theme entry, GitHub Actions, Mermaid v8.8.0, Node.js

---

### Task 1: Bootstrap The Docs Site

**Files:**
- Create: `package.json`
- Create: `docs/.vitepress/config.mts`
- Create: `docs/.vitepress/theme/index.ts`
- Create: `docs/.vitepress/theme/custom.css`
- Create: `scripts/verify-pages-build.sh`
- Test: `scripts/verify-pages-build.sh`

**Step 1: Write the failing test**

Create `scripts/verify-pages-build.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

test -f package.json
test -f docs/.vitepress/config.mts
test -f docs/.vitepress/theme/index.ts
test -f docs/.vitepress/theme/custom.css

npm run docs:build

test -f docs/.vitepress/dist/index.html
```

**Step 2: Run test to verify it fails**

Run: `bash scripts/verify-pages-build.sh`

Expected: FAIL because `package.json` and VitePress config files do not exist yet.

**Step 3: Write minimal implementation**

Create `package.json` with pinned scripts and dependencies:

```json
{
  "name": "skills-for-no-engineer",
  "private": true,
  "type": "module",
  "scripts": {
    "docs:dev": "vitepress dev docs",
    "docs:build": "vitepress build docs",
    "docs:preview": "vitepress preview docs"
  },
  "devDependencies": {
    "vitepress": "^1.6.0"
  }
}
```

Create `docs/.vitepress/config.mts`:

```ts
import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'zh-CN',
  title: 'AI 工作方式转型',
  description: '面向普通员工的 AI 工作方式公开文档',
  cleanUrls: true,
  lastUpdated: true,
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '仓库', link: 'https://github.com/<owner>/<repo>' }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/<owner>/<repo>' }
    ],
    outline: [2, 3],
    search: {
      provider: 'local'
    }
  },
  head: [
    [
      'script',
      {
        defer: '',
        src: 'https://cdn.jsdelivr.net/npm/mermaid@8.8.0/dist/mermaid.min.js'
      }
    ]
  ]
})
```

Create `docs/.vitepress/theme/index.ts`:

```ts
import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import './custom.css'

declare global {
  interface Window {
    mermaid?: {
      initialize: (config: Record<string, unknown>) => void
      init: (config?: unknown, nodes?: string | Element | Element[] | NodeListOf<Element>) => void
    }
  }
}

let mermaidBootstrapped = false

const theme: Theme = {
  extends: DefaultTheme,
  enhanceApp() {
    if (typeof window === 'undefined' || !window.mermaid) {
      return
    }

    if (!mermaidBootstrapped) {
      window.mermaid.initialize({
        startOnLoad: false,
        theme: 'neutral',
        securityLevel: 'strict'
      })
      mermaidBootstrapped = true
    }

    queueMicrotask(() => {
      if (window.mermaid) {
        window.mermaid.init(undefined, document.querySelectorAll('pre.mermaid'))
      }
    })
  }
}

export default theme
```

Create `docs/.vitepress/theme/custom.css` with the first minimal pass:

```css
:root {
  --vp-c-brand-1: #c96a27;
  --vp-c-brand-2: #9f531f;
  --vp-c-brand-3: #7d4218;
  --vp-home-hero-name-color: transparent;
  --vp-home-hero-name-background: linear-gradient(120deg, #c96a27, #1c7d67);
}

.VPDoc {
  background:
    radial-gradient(circle at top left, rgba(201, 106, 39, 0.16), transparent 24%),
    linear-gradient(180deg, #f7f1e7 0%, #f1e4d0 100%);
}

.vp-doc pre.mermaid {
  border-radius: 20px;
  background: rgba(255, 251, 245, 0.92);
}
```

**Step 4: Run test to verify it passes**

Run: `bash scripts/verify-pages-build.sh`

Expected: PASS and `docs/.vitepress/dist/index.html` exists.

**Step 5: Commit**

```bash
git add package.json docs/.vitepress/config.mts docs/.vitepress/theme/index.ts docs/.vitepress/theme/custom.css scripts/verify-pages-build.sh
git commit -m "feat: bootstrap docs site"
```

### Task 2: Migrate The HTML Story Into A Single Markdown Page

**Files:**
- Create: `docs/index.md`
- Create: `scripts/verify-docs-content.sh`
- Modify: `docs/.vitepress/theme/custom.css`
- Test: `scripts/verify-docs-content.sh`

**Step 1: Write the failing test**

Create `scripts/verify-docs-content.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

test -f docs/index.md

grep -q "这些麻烦，你大概每天都在碰" docs/index.md
grep -q "没有 AI 的一天，和有 AI 协作的一天" docs/index.md
grep -q "这不是程序员专属" docs/index.md
grep -q "```mermaid" docs/index.md

npm run docs:build >/dev/null
grep -q "AI 时代先受益的" docs/.vitepress/dist/index.html
```

**Step 2: Run test to verify it fails**

Run: `bash scripts/verify-docs-content.sh`

Expected: FAIL because `docs/index.md` does not exist yet.

**Step 3: Write minimal implementation**

Create `docs/index.md` as a single-page long-form document with explicit anchors:

```md
---
layout: doc
title: 给普通员工的 AI 工作方式邀请
---

# AI 时代先受益的，是每天被重复工作困住的人。 {#top}

> 这不是一页写给高管的 AI 口号，也不是一张产品参数表。
> 它只回答一件事：如果你在传统公司工作，AI 会怎样先让你的工作轻一点、快一点、清楚一点。

[你的烦恼](#pain-points) | [一天对比](#day-contrast) | [你会得到什么](#benefits) | [谁都能用](#roles) | [最后一句话](#closing)

## 这些麻烦，你大概每天都在碰 {#pain-points}

- 会前 10 分钟疯狂找资料
- 同一件事写三遍
- 时间花在追人，不花在做事
- 明明做了很多，周报还是难写
- 事情一多，脑子先被切碎
- 越忙越难体现价值

## AI 帮你的，不只是写几句话 {#workstyle-shift}

```mermaid
flowchart LR
  A[旧方式: 先自己找全资料] --> B[手动拼上下文]
  B --> C[从空白页开始组织表达]
  C --> D[做完后再重复解释]

  E[AI 协作: 先说清任务] --> F[AI 汇总上下文]
  F --> G[AI 生成结构化初稿]
  G --> H[你负责判断与修正]
```

## 没有 AI 的一天，和有 AI 协作的一天 {#day-contrast}

### 没有 AI 的一天

- 09:10 刚到工位先补上下文
- 11:20 回应别人前先切四个窗口
- 15:00 开始写材料时从空白页发呆
- 18:40 下班前还在补一份能发出去的总结

### 有 AI 协作的一天

- 09:10 先让 AI 汇总上下文
- 11:20 先出结构化回复，再补你的判断
- 15:00 从第一稿开始，而不是从空白开始
- 18:40 让收尾工作不再拖垮你

## 这对你自己的好处，比公司宣传里写得更具体 {#benefits}

1. 节省时间
2. 降低精神消耗
3. 提升表达质量
4. 增加职业价值

## 这不是程序员专属，而是绝大多数岗位都能开始用 {#roles}

- 销售
- 运营
- HR
- 项目经理
- 交付 / 实施
- 财务
- 行政
- 客服 / 支持

## 你不需要先变成专家，先从最烦的环节开始就够了 {#proof-points}

- 先从写作最痛的地方开始
- 再从找资料最慢的地方开始
- 最后把协作最耗神的地方交出去

## 未来拉开差距的，往往不是最忙的人 {#closing}

AI 时代真正先拉开差距的，往往不是最忙的人，而是最先学会与 AI 协作的人。
```

Then extend `docs/.vitepress/theme/custom.css` so the doc reads like a public page instead of a technical manual:

```css
.VPNavBar,
.VPLocalNav,
.VPDocAside {
  backdrop-filter: blur(16px);
}

.vp-doc h1 {
  font-size: clamp(2.8rem, 6vw, 5.4rem);
  line-height: 1.04;
  max-width: 9ch;
}

.vp-doc h2 {
  margin-top: 3rem;
  padding: 1.25rem 0 0;
  border-top: 1px solid rgba(24, 37, 45, 0.12);
}
```

**Step 4: Run test to verify it passes**

Run: `bash scripts/verify-docs-content.sh`

Expected: PASS and generated HTML contains the main title text.

**Step 5: Commit**

```bash
git add docs/index.md docs/.vitepress/theme/custom.css scripts/verify-docs-content.sh
git commit -m "feat: add single-page public docs"
```

### Task 3: Add Repository Entry Copy And Archive The Original HTML

**Files:**
- Modify: `README.md`
- Create: `references/ai-workstyle-transformation-for-workers.html`
- Test: `README.md`

**Step 1: Write the failing test**

Define the expected README checks:

```bash
grep -q "GitHub Pages" README.md
grep -q "docs/index.md" README.md
test -f references/ai-workstyle-transformation-for-workers.html
test ! -f ai-workstyle-transformation-for-workers.html
```

**Step 2: Run test to verify it fails**

Run: `grep -q "GitHub Pages" README.md`

Expected: FAIL because the current README only contains the repository name.

**Step 3: Write minimal implementation**

Rewrite `README.md` to include:

```md
# skills-for-no-engineer

面向普通员工的 AI 工作方式公开文档项目。

## 在线阅读

- GitHub Pages: `https://<owner>.github.io/<repo>/`

## 仓库内容

- `docs/index.md`: 唯一正式内容源
- `references/ai-workstyle-transformation-for-workers.html`: 原始 HTML 参考稿

## 本项目解决什么问题

它把一份原本独立存在的公开 HTML 页面，整理成适合 GitHub 开源仓库维护、协作和发布的文档形态。
```

Move the source asset:

```bash
mkdir -p references
mv ai-workstyle-transformation-for-workers.html references/ai-workstyle-transformation-for-workers.html
```

**Step 4: Run test to verify it passes**

Run:

```bash
grep -q "GitHub Pages" README.md
grep -q "docs/index.md" README.md
test -f references/ai-workstyle-transformation-for-workers.html
test ! -f ai-workstyle-transformation-for-workers.html
```

Expected: PASS.

**Step 5: Commit**

```bash
git add README.md references/ai-workstyle-transformation-for-workers.html
git commit -m "docs: add repository entrypoints"
```

### Task 4: Add GitHub Pages Deployment Workflow

**Files:**
- Create: `.github/workflows/deploy-pages.yml`
- Modify: `docs/.vitepress/config.mts`
- Test: `.github/workflows/deploy-pages.yml`

**Step 1: Write the failing test**

Define the workflow checks:

```bash
test -f .github/workflows/deploy-pages.yml
grep -q "actions/configure-pages" .github/workflows/deploy-pages.yml
grep -q "actions/upload-pages-artifact" .github/workflows/deploy-pages.yml
grep -q "actions/deploy-pages" .github/workflows/deploy-pages.yml
```

**Step 2: Run test to verify it fails**

Run: `test -f .github/workflows/deploy-pages.yml`

Expected: FAIL because the workflow file does not exist yet.

**Step 3: Write minimal implementation**

Create `.github/workflows/deploy-pages.yml`:

```yaml
name: Deploy GitHub Pages

on:
  push:
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - uses: actions/configure-pages@v5
      - run: npm ci
      - run: npm run docs:build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: docs/.vitepress/dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

If the repository is not a user site, set the VitePress base path:

```ts
const repo = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'skills-for-no-engineer'

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? `/${repo}/` : '/',
})
```

**Step 4: Run test to verify it passes**

Run:

```bash
test -f .github/workflows/deploy-pages.yml
grep -q "actions/configure-pages" .github/workflows/deploy-pages.yml
grep -q "actions/upload-pages-artifact" .github/workflows/deploy-pages.yml
grep -q "actions/deploy-pages" .github/workflows/deploy-pages.yml
```

Expected: PASS.

**Step 5: Commit**

```bash
git add .github/workflows/deploy-pages.yml docs/.vitepress/config.mts
git commit -m "ci: deploy docs to github pages"
```

### Task 5: Final Verification And Repository Hygiene

**Files:**
- Modify: `README.md`
- Modify: `docs/index.md`
- Modify: `docs/.vitepress/config.mts`
- Test: `scripts/verify-pages-build.sh`
- Test: `scripts/verify-docs-content.sh`

**Step 1: Write the failing test**

Add a final smoke checklist:

```bash
bash scripts/verify-pages-build.sh
bash scripts/verify-docs-content.sh
grep -q "GitHub Pages" README.md
grep -q "AI 时代先受益的" docs/.vitepress/dist/index.html
```

**Step 2: Run test to verify it fails**

Run the full checklist before the final polish.

Expected: At least one check fails until all prior tasks are complete and any remaining base-path or copy issues are fixed.

**Step 3: Write minimal implementation**

Apply the final polish only where verification exposes a gap:

- fix broken links in `README.md`
- fix missing anchors in `docs/index.md`
- fix incorrect `base` handling in `docs/.vitepress/config.mts`
- adjust CSS only if readability issues appear in the built output

**Step 4: Run test to verify it passes**

Run:

```bash
bash scripts/verify-pages-build.sh
bash scripts/verify-docs-content.sh
grep -q "GitHub Pages" README.md
grep -q "AI 时代先受益的" docs/.vitepress/dist/index.html
```

Expected: PASS.

**Step 5: Commit**

```bash
git add README.md docs/index.md docs/.vitepress/config.mts docs/.vitepress/theme/custom.css scripts/verify-pages-build.sh scripts/verify-docs-content.sh .github/workflows/deploy-pages.yml
git commit -m "docs: finalize github web docs publishing flow"
```
