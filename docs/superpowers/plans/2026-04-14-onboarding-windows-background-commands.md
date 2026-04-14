# Onboarding Windows Background Commands Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hide Windows console windows for background onboarding commands so opening the app and running installs/tests do not flash `cmd` windows.

**Architecture:** Add one shared Rust command configurator for desktop background processes and apply it to onboarding command execution paths. Keep user-visible launchers such as `explorer` unchanged so intentional GUI actions still appear normally.

**Tech Stack:** Rust, Tauri, `std::process::Command`

---

### Task 1: Add a shared Windows no-console command helper

**Files:**
- Modify: `src-tauri/src/commands/mod.rs`

- [ ] **Step 1: Add a testable helper for platform-specific background command flags**

Create a small helper that returns `CREATE_NO_WINDOW` on Windows and `0` elsewhere, then expose a `configure_background_command()` wrapper that applies it to `std::process::Command`.

- [ ] **Step 2: Add unit tests for the helper**

Verify the helper returns `0` on non-Windows builds and the Windows create-no-window flag on Windows builds.

### Task 2: Route onboarding background commands through the shared helper

**Files:**
- Modify: `src-tauri/src/commands/onboarding.rs`
- Test: `src-tauri/src/commands/mod.rs`

- [ ] **Step 1: Apply the shared helper in the onboarding command configurator**

Make `configure_onboarding_command()` call the shared helper before PATH and Python UTF-8 environment setup so spawned install/test processes inherit the no-window behavior.

- [ ] **Step 2: Apply the shared helper to direct probe/output command creation**

Update the direct `Command::new(...).output()` onboarding probe path so startup environment checks also use the same hidden-window configuration.

- [ ] **Step 3: Run focused verification**

Run:

```bash
cargo test background_command --manifest-path src-tauri/Cargo.toml -- --nocapture
```

Expected: helper tests pass.

- [ ] **Step 4: Run onboarding regression coverage**

Run:

```bash
cargo test onboarding_ --manifest-path src-tauri/Cargo.toml -- --nocapture
```

Expected: onboarding command tests remain green.
