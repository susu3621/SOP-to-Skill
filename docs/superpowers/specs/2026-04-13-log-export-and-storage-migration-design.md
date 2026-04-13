# 日志导出与持久化迁移设计

## 背景

当前桌面程序右上角没有“导出日志”入口，用户提交 bug 时只能手动查找运行信息。同时，`config.json` 和 `onboarding-state.json` 没有持久化版本字段，后续程序升级时缺少稳定的迁移入口。

现状还有一个关键缺口：后端日志目前只输出到控制台，没有正式落盘的日志文件，因此“导出日志”必须先补齐日志落盘能力。

## 目标

1. 在程序右上角增加“导出日志”按钮。
2. 程序运行日志落盘到当前应用数据目录下的单个日志文件。
3. 用户点击“导出日志”后，可以把当前日志文件导出到自己选择的位置。
4. 为 `config.json` 和 `onboarding-state.json` 增加持久化版本字段。
5. 程序启动或首次读取存储时，自动对旧版存储执行迁移并回写。

## 非目标

1. 不做日志目录打包导出。
2. 不做日志压缩、日志上传或 bug 报告表单。
3. 不改动现有业务字段语义。
4. 不引入单独的全局 `storage-meta.json`。

## 设计

### 1. 顶部导出日志按钮

- 位置：`App` 顶部右上角，和“检查更新 / 语言切换”同一操作区。
- 行为：
  - 点击后调用新的 Tauri command：`export_current_log`
  - 成功后显示成功提示
  - 失败后显示错误提示
- 默认文件名：
  - `sop-to-skill-log-YYYY-MM-DD-HHMMSS.log`

### 2. 运行日志正式落盘

- 日志文件路径：`<data-root>/logs/app.log`
- 输出策略：
  - 继续保留控制台输出
  - 同时写入文件
- 初始化位置：`src-tauri/src/lib.rs`
- 目录准备：
  - 扩展 `ensure_directories()`，增加 `logs/`

### 3. 日志导出

- 导出命令在后端完成，避免前端额外处理文件权限。
- 命令流程：
  1. 确认 `app.log` 已存在
  2. 打开保存对话框
  3. 用户取消则返回明确错误或取消结果
  4. 将当前 `app.log` 复制到用户选择路径
- 返回值：
  - 导出的目标路径，供前端提示

### 4. 持久化版本与迁移

新增两个元数据字段：

- `storage_version`
- `last_migrated_app_version`

覆盖对象：

- `AppConfig`
- `OnboardingState`

常量：

- `CURRENT_STORAGE_VERSION = 1`
- `CURRENT_APP_VERSION = env!("CARGO_PKG_VERSION")`

### 5. 迁移规则

- 旧文件没有 `storage_version` 时，视为 `0`
- 读取时统一执行：
  - 解析 JSON
  - 从旧版本迁移到当前版本
  - 如果发生迁移，自动回写文件
- `v0 -> v1` 的迁移仅补齐：
  - `storage_version = 1`
  - `last_migrated_app_version = CURRENT_APP_VERSION`
- 如果文件已是当前版本，但 `last_migrated_app_version` 不是当前程序版本，也自动更新该字段并回写

这样可以满足两层需求：

1. 旧数据结构有稳定的 schema 迁移入口。
2. 程序升级后，持久化记录会标记最新一次由哪个程序版本处理过。

## 影响文件

前端：

- `src/App.tsx`
- `src/App.test.tsx`
- `src/content/copy.ts`
- `src/styles.css`
- `src/types.ts`

后端：

- `src-tauri/Cargo.toml`
- `src-tauri/src/lib.rs`
- `src-tauri/src/commands/config.rs`
- `src-tauri/src/commands/onboarding.rs`
- `src-tauri/src/commands/mod.rs`
- `src-tauri/src/models/skill.rs`
- `src-tauri/src/models/onboarding.rs`
- `src-tauri/src/template/loader.rs`

## 测试策略

前端测试：

- 顶部出现“导出日志”按钮
- 点击按钮会调用 `export_current_log`
- 成功时显示导出成功提示
- 失败时显示导出失败提示

Rust 测试：

- 旧版 `config.json` 读取后自动补齐 `storage_version`
- 旧版 `onboarding-state.json` 读取后自动补齐 `storage_version`
- 旧版文件迁移后会自动回写
- 当前版本文件在程序版本变化时会更新 `last_migrated_app_version`
- 日志导出在缺少日志文件时返回错误

## 风险

1. 日志初始化改造如果处理不好，可能造成重复初始化 `tracing subscriber`。
2. 导出日志使用保存对话框，需要兼容 macOS 和 Windows 桌面环境。
3. 自动回写迁移文件必须保持无损，不能误删已有字段。

## 决策

1. 只导出单个当前日志文件，不打包目录。
2. 迁移逻辑仍分布在 `config` 和 `onboarding` 两个读写入口，但统一遵循同一版本策略。
3. 日志导出逻辑放在后端命令，不放在前端文件系统层。
