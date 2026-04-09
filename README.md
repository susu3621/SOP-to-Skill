# skills-for-no-engineer

[中文说明](./README_CN.md)

Turn existing SOPs into AI-runnable skills with a setup flow simple enough for non-engineers.

## Highlights

- Turns company SOPs, templates, links, and examples into runnable AI skills.
- Uses guided setup instead of manual prompt writing or config editing.
- Keeps role defaults, use case defaults, and IT tool bindings in configuration.
- Supports a full English and Chinese desktop interface.

## Screenshot

![App home in English](./docs/images/app-home-en.png)

## Install

### Local Desktop App

Requires a working Rust stable toolchain and local Tauri build environment.

For local prerequisites and platform-specific build steps, see [Local Build Guide](./LOCAL_BUILD.md).

```bash
npm ci
npm run tauri:dev
```

To build a local desktop bundle for the current platform:

```bash
npm run tauri:build
```
