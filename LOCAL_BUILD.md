# Local Build Guide

[中文说明](./LOCAL_BUILD_CN.md)

Use local builds for day-to-day testing. Keep GitHub tag builds for formal releases.

## Scope

- `npm run tauri:build` only builds the current platform.
- Build `dmg` on macOS.
- Build `exe` on Windows.
- Use GitHub Actions when you need a tagged release with both platforms.

## macOS

### Requirements

- Full Xcode installed
- `xcode-select` pointing to Xcode
- Xcode license accepted
- Rust stable toolchain
- Node.js and npm

### One-time setup

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept
rustup default stable
```

### Build

```bash
npm ci
npm run tauri:build
```

### Output

The local desktop bundle is generated under:

```text
src-tauri/target/release/bundle/dmg/
```

## Windows

### Requirements

- Git for Windows
- Node.js LTS and npm
- Rust stable MSVC toolchain
- Visual Studio 2022 Build Tools with VC++ tools
- Microsoft Edge WebView2 Runtime

### One-time setup

1. Install Git for Windows.
2. Install Node.js LTS.
3. Install Rust with the MSVC target:

```powershell
rustup default stable-x86_64-pc-windows-msvc
```

4. Install Visual Studio 2022 Build Tools and include the VC++ workload.
5. Make sure WebView2 Runtime is present.

### Build

```powershell
npm ci
npm run tauri:build
```

### Output

The local installer is generated under:

```text
src-tauri\target\release\bundle\nsis\
```

Example output:

```text
SOP-to-Skill_0.1.0_x64-setup.exe
```

## Release Builds

Use GitHub for official release builds:

- push code to `main`
- move or create the `v*` tag you want to release
- let GitHub Actions produce the public release artifacts

This keeps daily local testing separate from public release packaging.
