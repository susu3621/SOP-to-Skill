# SOP to Skill 🚀
> 把公司的 SOP、模板和系统配置，整理成可安装到 AI 工具里的 Skill

<div align="center">
  <img src="src-tauri/icons/icon.png" alt="SOP to Skill Logo" width="120" height="120">

  <h3>给非工程团队的 AI Skill 配置台</h3>
  <p>通过引导式配置，把岗位工作、公司 IT 工具和 SOP 绑定起来，再同步到 Codex、Claude Code 或 WorkBuddy。</p>

  <p>
    <img src="https://img.shields.io/badge/Desktop-Tauri%20v2-orange?style=flat-square" alt="Tauri v2">
    <img src="https://img.shields.io/badge/Backend-Rust-red?style=flat-square" alt="Rust">
    <img src="https://img.shields.io/badge/Frontend-React-61DAFB?style=flat-square" alt="React">
    <img src="https://img.shields.io/badge/Language-中文%20%2F%20English-brightgreen?style=flat-square" alt="Bilingual">
    <img src="https://img.shields.io/badge/License-MIT-lightgrey?style=flat-square" alt="MIT License">
  </p>

  <p>
    <a href="#-项目介绍">项目介绍</a> •
    <a href="#-核心功能">核心功能</a> •
    <a href="#-界面导览">界面导览</a> •
    <a href="#-技术架构">技术架构</a> •
    <a href="#-快速开始">快速开始</a> •
    <a href="#-项目结构">项目结构</a>
  </p>

  <p>
    <strong>简体中文</strong> |
    <a href="./README_EN.md">English</a>
  </p>
</div>

---

## 📌 项目介绍

`SOP to Skill` 是一个桌面应用，用来把企业内部已经存在的 SOP、模板、链接、系统账号和岗位工作流，整理成 AI 可以直接调用的 Skill。

它的目标不是让业务同学去手写 prompt 或维护复杂配置，而是通过引导式 onboarding，把下面几件事串起来：

- 选择公司已经在使用的 IT 工具，例如 `Jira`、`Confluence`、`腾讯企业邮箱`
- 按岗位选择要交给 AI 的工作用例
- 补充该工作的 SOP、信息来源和执行规则
- 生成生产用 / 测试用 Skill，并同步到 `Codex`、`Claude Code`、`WorkBuddy`

如果你想把“公司现有流程”变成“AI 可执行能力”，这就是这个仓库的核心定位。

## ✨ 核心功能

### 1. 引导式配置流程

- 用三步 onboarding 代替手工写 prompt、改 JSON 或直接改模板文件
- 先配置公司 IT 工具和账号信息，再配置岗位工作，最后安装到 AI 工具
- 减少非工程人员的上手门槛

### 2. 岗位与用例驱动

- 先按岗位选择工作范围
- 每个用例都可以单独维护描述、信息来源、执行规则
- 支持在现有用例之外新增自定义用例

### 3. 公司基础设施绑定

- 当前内置基础工具包括 `Jira`、`Confluence`、`腾讯企业邮箱`
- 基础设施凭证会跟随 onboarding 保存并同步，供后续步骤直接使用
- 取消勾选工具时，会一起清理对应的受管配置

### 4. 双包生成与安装预览

- 对每个岗位用例同时生成生产用 Skill 和测试用 Skill
- 安装前可以预览新增、移除和保持不变的 Skill 集合
- 支持把同一组 Skill 同步到多个 AI 工具

### 5. 双语桌面端

- 应用界面支持中文和英文
- README 也同步提供中英文版本
- 适合内部交付、试点和演示

## 🖼 界面导览

![应用首页（中文）](./docs/images/app-home-zh.png)

主页会把配置过程拆成三个模块：

- `选择公司 IT 工具`
- `配置要交给 AI 的工作`
- `安装到 AI 工具`

这让业务侧用户可以按真实工作顺序完成配置，而不是先理解技术细节。

## 🏗 技术架构

- 前端：`React` + `TypeScript` + `Vite`
- 桌面容器：`Tauri v2`
- 后端命令层：`Rust`
- Skill 内容：仓库内 `skills/` 目录下的模板、脚本和说明文件
- Onboarding 数据与安装同步：前端状态 + Tauri 命令 + 本地文件系统落盘

整体思路是：

1. 用前端界面收集岗位、用例、基础设施和安装目标
2. 用 Rust 命令负责状态持久化、生成包、安装预览和同步
3. 用仓库内的 Skill 模板把配置结果产出成可安装目录

## 🚀 快速开始

### 本地运行桌面应用

需要本机已经安装可用的 Rust stable toolchain 和 Tauri 构建环境。

```bash
npm ci
npm run tauri:dev
```

### 常用命令

```bash
npm test
npm run build
npm run tauri:build
```

### 本地构建说明

不同平台的本地依赖和构建步骤请看：

- [本地构建指南（中文）](./LOCAL_BUILD_CN.md)
- [Local Build Guide (English)](./LOCAL_BUILD.md)

## 🗂 项目结构

```text
.
├── docs/                     文档与 README 截图
├── skills/                   内置 Skill 模板与脚本
├── scripts/                  构建、安装、校验脚本
├── src/                      React 前端与 onboarding 界面
├── src-tauri/                Tauri / Rust 后端命令与桌面配置
├── LOCAL_BUILD.md            英文本地构建指南
├── LOCAL_BUILD_CN.md         中文本地构建指南
├── README.md                 中文主 README
└── README_EN.md              英文 README
```

## 📚 相关文档

- [English README](./README_EN.md)
- [中文本地构建指南](./LOCAL_BUILD_CN.md)
- [English Local Build Guide](./LOCAL_BUILD.md)
- [docs 首页内容](./docs/index.md)

## 📄 License

本项目使用 [MIT License](./LICENSE)。
