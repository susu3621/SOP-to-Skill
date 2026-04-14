# Onboarding Windows Python Fallback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Windows onboarding continue probing Python with `python` when `py -3` exists but fails, and reuse the same fallback when running Linux connection tests and Paramiko installs.

**Architecture:** Keep the existing Windows candidate order, but change the Python probing path so a non-zero `py -3` does not immediately mark Python missing. Centralize the selected interpreter for probing, connection testing, and pip-based install commands, then keep the onboarding state consistent by refreshing the process environment after successful Windows install steps.

**Tech Stack:** Rust, Tauri onboarding commands, Rust unit tests

---

### Task 1: Capture the regression with focused Windows tests

**Files:**
- Modify: `src-tauri/src/commands/onboarding.rs`
- Test: `src-tauri/src/commands/onboarding.rs`

- [ ] **Step 1: Add failing regression tests for Python candidate fallback**

```rust
#[test]
fn onboarding_python_probe_falls_back_to_python_when_py_launcher_fails() {
    // simulate `py -3` returning non-zero and `python` succeeding
}

#[test]
fn onboarding_windows_paramiko_install_uses_python_when_py_launcher_fails() {
    // assert the install command resolves to `python -m pip ...`
}
```

- [ ] **Step 2: Run the targeted Windows onboarding tests and confirm they fail before implementation**

Run: `cargo test onboarding_windows_ --manifest-path src-tauri/Cargo.toml -- --nocapture`
Expected: FAIL because the probe still stops on the first failing candidate.

### Task 2: Implement fallback-aware Python resolution

**Files:**
- Modify: `src-tauri/src/commands/onboarding.rs`
- Test: `src-tauri/src/commands/onboarding.rs`

- [ ] **Step 1: Update Python probing to continue across failing Windows candidates**

```rust
fn probe_requirement(...) -> OnboardingEnvironmentRequirementProbe {
    // on Windows, continue from `py -3` to `python` when the first candidate fails
}
```

- [ ] **Step 2: Reuse the resolved interpreter for connection tests and Paramiko installs**

```rust
fn resolve_connection_test_command(...) -> CommandSpec {
    // share the Python fallback logic
}

fn resolve_install_step_command(...) -> CommandSpec {
    // use the same working interpreter for pip installs
}
```

- [ ] **Step 3: Refresh the Windows process environment after each install step**

```rust
fn refresh_windows_process_environment() -> Result<(), String> {
    // merge user + machine PATH updates so the next step sees newly installed tools
}
```

### Task 3: Verify the broader onboarding surface

**Files:**
- Modify: `src-tauri/src/commands/onboarding.rs`
- Test: `src-tauri/src/commands/onboarding.rs`

- [ ] **Step 1: Re-run the targeted Windows test slice**

Run: `cargo test onboarding_windows_ --manifest-path src-tauri/Cargo.toml -- --nocapture`
Expected: PASS

- [ ] **Step 2: Re-run the broader onboarding Rust suite**

Run: `cargo test onboarding_ --manifest-path src-tauri/Cargo.toml -- --nocapture`
Expected: PASS

- [ ] **Step 3: Capture the user-facing impact**

```text
Windows onboarding no longer reports Python missing just because `py -3`
fails. If `python` is installed and usable, probing, connection tests, and
Paramiko installs all fall back to it consistently.
```
