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
