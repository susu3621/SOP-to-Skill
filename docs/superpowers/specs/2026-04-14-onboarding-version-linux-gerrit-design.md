# Onboarding Version Label, Linux Device Tests, and Gerrit Readability Design

## Overview

This change set fixes three onboarding pain points without widening scope beyond the existing onboarding architecture:

1. the desktop shell should always show the current build identifier next to the update button;
2. Linux devices should expose a manual connection test action just like other infrastructure targets;
3. Gerrit connection tests should handle standard Gerrit REST responses and surface readable failure text on Windows.

The design keeps the current separation between the React shell, the onboarding state hook, Rust Tauri commands, and the service-specific Python test scripts.

## Goals

1. Show a stable current-version label in the app header.
2. Display the exact `v*` tag for tagged builds and a short commit id for local development builds.
3. Add a manual `测试连接` action for each Linux device entry.
4. Make Gerrit REST probing tolerant of the `)]}'` anti-XSSI prefix.
5. Prevent mojibake in Windows-rendered connection-test failures by forcing UTF-8 for Python script output.

## Non-Goals

1. Change the update-checking backend or release publishing flow.
2. Add automatic per-device Linux connection tests.
3. Redesign the onboarding connection-test UI for all services.

## Proposed Design

### Build identity

`src-tauri/build.rs` computes a display version string at build time. If `HEAD` is exactly on a `v*` tag, the display value is that tag. Otherwise it is the short git commit id. The value is exposed to the frontend through a new Tauri command so the React shell can render `当前版本 v0.2.0` or `当前版本 dd40e57` beside the update button.

### Linux device connection tests

Linux devices keep their existing editor model, but each device row gets its own manual connection-test action and inline result. The onboarding hook manages Linux-device connection state separately from the existing per-service map so generic service tests and device-specific tests do not overwrite each other.

Each Linux test reuses the existing `linux` Python test script and passes the selected device's credentials as explicit override values.

### Gerrit parsing and readable errors

The Gerrit Python test script strips the anti-XSSI prefix before JSON parsing. On the Rust side, Python-based connection tests run with `PYTHONUTF8=1` and `PYTHONIOENCODING=UTF-8` so Chinese summaries and details stay readable when the desktop app captures stdout on Windows.

## Testing Strategy

1. Add a React test for the current-version label.
2. Add a React onboarding test for manual Linux device connection testing.
3. Add a Gerrit Python test for anti-XSSI responses.
4. Re-run the focused React tests and the onboarding Rust suite after the implementation.
