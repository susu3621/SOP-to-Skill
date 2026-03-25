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
- `npm run dev`: 启动桌面前端开发服务器
- `npm run test`: 运行桌面界面测试
- `npm run build`: 构建桌面前端静态资源
- `npm run tauri:dev`: 启动 Tauri 桌面开发模式
- `npm run tauri:build`: 构建 Tauri 桌面产物
- `npm run docs:dev`: 启动文档站开发模式
- `npm run docs:build`: 构建 GitHub Pages 文档

## 维护方式

- `docs/index.md` 仍然是公开文档的正式内容源。
- 桌面配置器代码位于顶层 `src/` 和 `src-tauri/`。
- `Codex` 与 `Claude Code` 当前只保留为可见入口，后续再接入真实向导流程。

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
