# 本地构建指南

[English](./LOCAL_BUILD.md)

日常测试请使用本地构建。正式版本发布继续使用 GitHub tag 构建。

## 适用范围

- `npm run build:local:mac` 只在 macOS 上运行，产出本地 `dmg`。
- `npm run build:local:win` 只在 Windows 上运行，产出本地 `exe`。
- 本地脚本会先检查关键依赖，再调用 `npm run tauri:build`。
- 如果要产出带版本 tag 的正式双平台 release，继续走 GitHub Actions。

## macOS

### 环境要求

- 已安装 Xcode Command Line Tools
- Rust stable toolchain
- Node.js 和 npm

### 一次性准备

```bash
xcode-select --install
rustup default stable
npm ci
```

### 构建命令

```bash
npm run build:local:mac
```

### 产物位置

脚本最终会把本地 `dmg` 安装包复制到：

```text
artifacts/desktop/local/macos/
```

Tauri 原始输出仍然保留在：

```text
src-tauri/target/release/bundle/dmg/
```

## Windows

### 环境要求

- Git for Windows
- Node.js LTS 和 npm
- Rust stable MSVC toolchain
- Visual Studio 2022 Build Tools，并带 VC++ 工具链
- Microsoft Edge WebView2 Runtime
- NSIS，并且 `makensis` 在 `PATH` 中

### 一次性准备

1. 安装 Git for Windows。
2. 安装 Node.js LTS。
3. 安装 Rust，并切到 MSVC toolchain：

```powershell
rustup default stable-x86_64-pc-windows-msvc
```

4. 安装 Visual Studio 2022 Build Tools，并勾选 VC++ workload。
5. 安装 NSIS，并确认 `makensis` 可执行。
6. 确认 WebView2 Runtime 已安装。
7. 执行：

```powershell
npm ci
```

### 构建命令

```powershell
npm run build:local:win
```

### 产物位置

脚本最终会把本地 `exe` 安装包复制到：

```text
artifacts\desktop\local\windows\
```

Tauri 原始输出仍然保留在：

```text
src-tauri\target\release\bundle\nsis\
```

## 正式 Release

正式版本继续通过 GitHub 完成：

- 先把代码推到 `main`
- 再创建或移动要发布的 `v*` tag
- 由 GitHub Actions 生成公开 release 产物

这样可以把日常本地测试和正式发布拆开管理。
