# GitHub Web Docs Design

## Goal

将仓库当前的单个 HTML 宣传页，重构为一套适合开源仓库维护和 GitHub 展示的公开文档形态：

- 在 GitHub 仓库内，使用 `README.md` 作为项目入口页。
- 在 GitHub Pages 上，发布一个面向普通员工阅读的单页网页。
- 在仓库内只保留一个正式内容源，避免 HTML、README、文档三份内容长期分叉。

## Current Context

- 当前仓库内容极少，只有 `README.md`、`LICENSE` 和 `ai-workstyle-transformation-for-workers.html`。
- `README.md` 目前只有标题，不具备项目说明能力。
- 原始 HTML 已经具备完整叙事内容、视觉风格、Mermaid 图和页面结构，适合作为迁移素材。
- 现阶段内容还在定型，不适合过早拆成多页。

## Decision Summary

采用“`README + 单页文档站首页 + GitHub Pages 自动发布`”的最小可维护方案。

核心决定如下：

1. `README.md` 负责仓库入口说明，不承载完整正文。
2. `docs/index.md` 作为唯一正式内容源，承载完整公开文档。
3. GitHub Pages 使用静态站点生成方案，将 `docs/index.md` 直接发布为网页。
4. 原始 `ai-workstyle-transformation-for-workers.html` 保留为参考素材，移动到 `references/`，不再作为正式发布入口。
5. 当前阶段不拆分为多页，等内容扩展后再按主题拆分。

## Information Architecture

### GitHub 仓库入口

`README.md` 负责三件事：

- 一句话说明这个项目是什么。
- 说明适合谁阅读。
- 提供在线阅读入口和仓库内文档入口。

### GitHub Pages 入口

`docs/index.md` 是对外网页正文，保留单页长文结构。建议章节顺序如下：

1. Hero / 项目开场
2. 这些麻烦，你大概每天都在碰
3. AI 帮你的，不只是写几句话
4. 没有 AI 的一天，和有 AI 协作的一天
5. 这对你自己的好处
6. 这不是程序员专属
7. 先从最烦的环节开始
8. 最后一句话

### 原始素材

`references/ai-workstyle-transformation-for-workers.html` 只保留为：

- 原始文案来源
- 原始视觉参考
- 迁移对照资料

不再承担任何正式发布职责。

## Content Model

正式内容只在 `docs/index.md` 中维护。

迁移时遵循以下原则：

- 不保留 HTML 中的 `PAGE_DATA` 脚本结构。
- 将内容改写为可以直接编辑的 Markdown 正文。
- 保留页面锚点，方便 GitHub Pages 页内导航。
- 保留 1 个 Mermaid 图，继续表达“旧工作方式 vs AI 协作方式”的结构变化。
- 保留面向普通员工的叙事语气，不转成技术文档口吻。

## Presentation Strategy

### README

风格应简洁，重点是入口、说明、链接，不做完整复刻。

### Pages 首页

风格应保持以下特征：

- 单页长文
- 弱品牌
- 非技术手册感
- 更像公开倡议页，而不是 API 文档

### 样式

可以在静态站主题层增加少量定制样式，用于：

- Hero 气质
- 卡片分组
- 锚点导航
- Mermaid 区块包装

但不再继续维护一份大型手写 HTML 页面。

## Technical Direction

推荐使用 `VitePress` 作为站点生成器，原因如下：

- 它本身是内容导向的静态站点生成工具。
- 官方支持 Markdown 到静态 HTML 的生成流程。
- 支持自定义主题入口，适合在默认文档站基础上做轻量视觉调整。
- 与 GitHub Pages 的 GitHub Actions 发布方式契合。

GitHub Pages 发布采用 GitHub 官方建议的自定义 GitHub Actions 工作流方式，而不是提交构建产物到分支。

## Repository Layout

目标目录结构如下：

```text
README.md
docs/
  index.md
  .vitepress/
    config.mts
    theme/
      index.ts
      custom.css
.github/
  workflows/
    deploy-pages.yml
references/
  ai-workstyle-transformation-for-workers.html
docs/plans/
  2026-03-23-github-web-docs-design.md
  2026-03-23-github-web-docs.md
```

## Delivery Scope

本轮实现仅覆盖以下内容：

- 建立 GitHub 仓库入口页
- 建立单页 Markdown 正文
- 配置单页文档站样式
- 配置 GitHub Pages 自动发布
- 保留原始 HTML 作为参考

本轮不做以下内容：

- 多页信息架构拆分
- 国际化
- CMS 化内容管理
- 评论系统、搜索系统、自定义域名

## Risks And Mitigations

### 风险 1：内容双源维护

缓解方式：明确 `docs/index.md` 为唯一正式内容源，HTML 仅保留参考用途。

### 风险 2：默认文档站样式过强，破坏公开页面气质

缓解方式：通过自定义主题入口和少量 CSS 压低“技术手册感”。

### 风险 3：过早拆页导致维护复杂度上升

缓解方式：先用单页承载全部正文，等内容明显扩展后再拆分。

## External References

- GitHub Pages 官方文档说明可通过 GitHub Actions 自定义工作流发布站点。
- VitePress 官方文档说明其是面向内容的静态站点生成器，并支持自定义主题入口。
- Mermaid 官方文档说明 Mermaid 可通过脚本在网页中渲染基于文本定义的图表。

## Approval

本设计已在会话中确认，结论为：

- `README` 保留并强化。
- 其他正文当前不拆分。
- 先合并成一个主文档页，后续需要时再拆页。
