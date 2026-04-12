# Local Build Guide

[中文说明](./LOCAL_BUILD_CN.md)

Use local builds for day-to-day testing. Keep GitHub tag builds for formal releases.

## Scope

- `npm run build:local:mac` runs only on macOS and produces a local `dmg`.
- `npm run build:local:win` runs only on Windows and produces a local `exe`.
- The local scripts check the key prerequisites first, then call `npm run tauri:build`.
- Use GitHub Actions when you need a tagged release with both platforms.

## macOS

### Requirements

- Xcode Command Line Tools
- Rust stable toolchain
- Node.js and npm

### One-time setup

```bash
xcode-select --install
rustup default stable
npm ci
```

### Build

```bash
npm run build:local:mac
```

### Output

The script copies the local DMG into:

```text
artifacts/desktop/local/macos/
```

The original Tauri bundle output remains under:

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
- NSIS with `makensis` available on `PATH`

### One-time setup

1. Install Git for Windows.
2. Install Node.js LTS.
3. Install Rust with the MSVC target:

```powershell
rustup default stable-x86_64-pc-windows-msvc
```

4. Install Visual Studio 2022 Build Tools and include the VC++ workload.
5. Install NSIS and make sure `makensis` is present on `PATH`.
6. Make sure WebView2 Runtime is present.
7. Run:

```powershell
npm ci
```

### Build

```powershell
npm run build:local:win
```

### Output

The script copies the local installer into:

```text
artifacts\desktop\local\windows\
```

The original Tauri bundle output remains under:

```text
src-tauri\target\release\bundle\nsis\
```

## Release Builds

Use GitHub for official release builds:

- push code to `main`
- move or create the `v*` tag you want to release
- let GitHub Actions produce the public release artifacts

This keeps daily local testing separate from public release packaging.
