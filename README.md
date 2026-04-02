# skills-for-no-engineer

面向普通用户的 AI skill 配置与公开文档项目。

这个仓库当前包含两条产线：

- 面向外部阅读的 GitHub Pages 单页文档
- 面向普通用户的桌面配置器骨架，首版聚焦 `WorkBuddy`

## 当前内容

- 公开文档入口: [docs/index.md](docs/index.md)
- 原始页面归档: [references/ai-workstyle-transformation-for-workers.html](references/ai-workstyle-transformation-for-workers.html)
- 桌面配置器前端入口: [index.html](index.html)
- Tauri 桌面工程: [src-tauri/tauri.conf.json](src-tauri/tauri.conf.json)

## 桌面配置器目标

桌面程序通过一组问答步骤，帮助普通用户完成 skill 配置。当前首版只搭建：

- 桌面 UI 外壳
- WorkBuddy 向导骨架
- 模拟结果页
- macOS / Windows 打包框架

本轮不实现真实配置写入、环境探测和自动安装。

## 常用命令

- 本地前置:
  - Node.js 20+
  - 当前可用的 Rust stable toolchain
  - macOS 或 Windows 桌面构建环境
  - 如果要运行 `npm run build:desktop:all`，还需要已安装并完成登录的 GitHub CLI `gh`
- `npm run dev`: 启动桌面前端开发服务器
- `npm run test`: 运行桌面界面测试
- `npm run build`: 构建桌面前端静态资源
- `npm run tauri:dev`: 启动 Tauri 桌面开发模式
- `npm run tauri:build`: 直接在本机运行 Tauri 构建，只生成当前平台的桌面 bundle；在 macOS 上会产出 `src-tauri/target/release/bundle/macos/` 下的 `.app`
- `npm run build:desktop:all`: 触发远程 GitHub Actions 的双平台桌面构建，等待 macOS / Windows 两个平台完成后，把产物下载到 `artifacts/desktop/<run-id>/`
- `npm run docs:dev`: 启动文档站开发模式
- `npm run docs:build`: 构建 GitHub Pages 文档

## 双平台桌面构建

`npm run tauri:build` 和 `npm run build:desktop:all` 解决的是不同问题：

- `npm run tauri:build` 适合在当前机器上做本地验证，只依赖本机的 Tauri / Rust 环境，不会去触发 GitHub Actions，也不会收集另一平台的产物。
- `npm run build:desktop:all` 适合做跨平台回归和 smoke test。它会调用 `gh workflow run` 触发 `.github/workflows/build-desktop.yml`，因此需要 `gh auth status` 通过，并且当前分支已经推送到远端，`origin/<branch>` 也必须和当前本地 `HEAD` 一致。CI 会继续上传 macOS 的 `.dmg` 安装包和 Windows 的 NSIS `.exe` 安装包作为 artifact 供自动化下载；当 workflow 以 `workflow_dispatch` 或 `v*` tag 运行时，还会创建正式 GitHub Release 并附带 updater 所需的 `latest.json` 与签名产物。

`npm run build:desktop:all` 的输出目录约定如下：

- `artifacts/desktop/<run-id>/manifest.json`: 记录这次远程构建对应的 workflow、分支、 commit SHA 和下载时间
- `artifacts/desktop/<run-id>/macos/`: 存放 macOS `.dmg` 安装包
- `artifacts/desktop/<run-id>/windows/`: 存放 Windows `.exe` 安装包

普通 `push` 触发的 macOS GitHub Actions 构建会使用 ad-hoc signing（`APPLE_SIGNING_IDENTITY='-'`）完成 smoke build，这样即使没有 Apple secrets 也不会直接把 workflow 判失败。只有 `workflow_dispatch` 或 `v*` tag 触发的 release 构建，workflow 才会要求完整的 Apple 签名、公证和 updater 签名配置，并发布正式 GitHub Release。

如果要让 `workflow_dispatch` 产出的 macOS 安装包能作为对外分发的签名/公证版本，仓库需要在 Actions secrets 中提供以下 Apple 配置：

- `APPLE_CERTIFICATE`
- `APPLE_CERTIFICATE_PASSWORD`
- `APPLE_SIGNING_IDENTITY`
- `APPLE_API_ISSUER`
- `APPLE_API_KEY`
- `APPLE_API_KEY_CONTENT`

如果要让 GitHub Releases 同时生成可被应用内 updater 使用的更新包，还需要提供以下配置：

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
- `TAURI_UPDATER_PUBLIC_KEY`

## 维护方式

- `docs/index.md` 仍然是公开文档的正式内容源。
- 桌面配置器代码位于顶层 `src/` 和 `src-tauri/`。
- `Codex` 与 `Claude Code` 当前只保留为可见入口，后续再接入真实向导流程。

## Skill 版本管理

仓库里的内置 skill 使用 `skills/manifest.json` 作为版本来源。

- 每个 skill 都有独立 `semver`
- `contentHash` 记录当前目录包内容的稳定哈希
- 修改某个 skill 目录包时，需要同步更新该 skill 的 `version` 和 `contentHash`
- `npm run verify:skills` 会校验 manifest 结构、目录内容哈希，以及在提供基线 ref 时检查“内容变了但版本没 bump”的情况

桌面程序安装 skill 后，会把 manifest 里的版本写入本地已安装元数据，因此 UI 可以识别用户机器上的已安装版本。

## 应用在线升级

在线升级只在 release 构建中启用，配置位于 `src-tauri/tauri.release.conf.json`。

- 普通分支 `push` 仍然只做 smoke build，不生成 updater 产物
- `workflow_dispatch` 或 `v*` tag 触发的 release 构建会注入 updater 公钥，并让 `tauri-action` 上传签名产物和 `latest.json`
- 桌面应用运行时通过 Tauri updater 检查 GitHub Releases 上的 `latest.json`

## Skill 安装

本项目提供了三种通过代码安装 skill 的方式：

### 方式一：Shell 脚本（推荐用于 CLI）

```bash
# 安装 skill 到 Claude Code
./scripts/install-skill.sh <skill-id> claude-code

# 安装 skill 到 Codex
./scripts/install-skill.sh <skill-id> codex

# 示例：安装 jira skill
./scripts/install-skill.sh jira claude-code
```

### 方式二：通过 Rust 代码

```rust
// 文件位置: src-tauri/src/commands/skill.rs
use crate::commands::skill::install_skill;
use std::collections::HashMap;

let result = install_skill(
    "jira".to_string(),           // skill_id
    "claude-code".to_string(),    // app_id
    HashMap::new(),               // variables (可选的模板变量)
).await;
```

### 方式三：通过前端 Hook

```typescript
// 文件位置: src/hooks/useSkills.ts
import { useSkills } from './hooks/useSkills';

const { installSkill } = useSkills();

// 安装 skill
await installSkill('jira', 'claude-code', {});
```

### 安装后的目录结构

安装完成后，skill 会被复制到以下位置：

| 目标应用 | 安装路径 |
|---------|---------|
| Claude Code | `~/.claude/skills/<skill-id>/` |
| Codex | `~/.codex/skills/<skill-id>/` |

### 查看可用 Skill

```bash
# 列出 skills 目录下的所有 skill
ls skills/
```
