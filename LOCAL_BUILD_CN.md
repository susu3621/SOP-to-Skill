# 本地构建指南

[English](./LOCAL_BUILD.md)

日常测试请使用本地构建。正式版本发布继续使用 GitHub tag 构建。

## 适用范围

- `npm run tauri:build` 只会构建当前平台。
- `dmg` 需要在 macOS 上构建。
- `exe` 需要在 Windows 上构建。
- 如果要产出带版本 tag 的正式双平台 release，继续走 GitHub Actions。

## macOS

### 环境要求

- 已安装完整 Xcode
- `xcode-select` 已切到 Xcode
- 已接受 Xcode license
- Rust stable toolchain
- Node.js 和 npm

### 一次性准备

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept
rustup default stable
```

### 构建命令

```bash
npm ci
npm run tauri:build
```

### 产物位置

本地 `dmg` 安装包会生成在：

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

### 一次性准备

1. 安装 Git for Windows。
2. 安装 Node.js LTS。
3. 安装 Rust，并切到 MSVC toolchain：

```powershell
rustup default stable-x86_64-pc-windows-msvc
```

4. 安装 Visual Studio 2022 Build Tools，并勾选 VC++ workload。
5. 确认 WebView2 Runtime 已安装。

### 构建命令

```powershell
npm ci
npm run tauri:build
```

### 产物位置

本地 `exe` 安装包会生成在：

```text
src-tauri\target\release\bundle\nsis\
```

例如：

```text
SOP-to-Skill_0.1.0_x64-setup.exe
```

## 正式 Release

正式版本继续通过 GitHub 完成：

- 先把代码推到 `main`
- 再创建或移动要发布的 `v*` tag
- 由 GitHub Actions 生成公开 release 产物

这样可以把日常本地测试和正式发布拆开管理。
