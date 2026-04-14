# Onboarding macOS Login Shell Environment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make onboarding environment checks, connection tests, and auto-install commands on macOS resolve `brew`, `python3`, and related tools from the user's login-shell `PATH` instead of the GUI app process `PATH`.

**Architecture:** Keep the existing onboarding command flow, but add one macOS-specific search-path resolver that reads the login shell `PATH`, merges it ahead of the process `PATH`, and applies that result to subprocesses launched by onboarding. Cover the regression with focused unit tests around PATH merging and command execution using the resolved search path.

**Tech Stack:** Rust, Tauri onboarding commands, Rust unit tests

---

### Task 1: Add the failing regression coverage

**Files:**
- Modify: `src-tauri/src/commands/onboarding.rs`
- Test: `src-tauri/src/commands/onboarding.rs`

- [ ] **Step 1: Write the failing tests**

```rust
#[test]
fn onboarding_unix_path_merge_prefers_login_shell_order() {
    let merged = merge_unix_search_path_values([
        "/usr/local/bin:/usr/bin",
        "/opt/homebrew/bin:/usr/local/bin",
    ]);

    assert_eq!(merged, "/usr/local/bin:/usr/bin:/opt/homebrew/bin");
}

#[test]
fn onboarding_process_search_path_prefers_login_shell_entries() {
    let resolved = resolve_process_search_path_from_values(
        OnboardingEnvironmentPlatform::MacOS,
        Some("/usr/bin:/bin".to_string()),
        Some("/opt/homebrew/bin:/opt/anaconda3/envs/python312/bin".to_string()),
    );

    assert_eq!(
        resolved,
        Some("/opt/homebrew/bin:/opt/anaconda3/envs/python312/bin:/usr/bin:/bin".to_string())
    );
}
```

- [ ] **Step 2: Run targeted Rust tests to verify they fail**

Run: `cargo test onboarding_unix_path_merge_prefers_login_shell_order onboarding_process_search_path_prefers_login_shell_entries --manifest-path src-tauri/Cargo.toml -- --nocapture`
Expected: FAIL because the new helper functions do not exist yet.

### Task 2: Implement macOS login-shell PATH resolution

**Files:**
- Modify: `src-tauri/src/commands/onboarding.rs`
- Test: `src-tauri/src/commands/onboarding.rs`

- [ ] **Step 1: Add the minimal helper layer**

```rust
fn merge_unix_search_path_values<'a, I>(values: I) -> String
where
    I: IntoIterator<Item = &'a str>,
{
    // split on ':', drop empties, keep first occurrence order
}

fn resolve_process_search_path_from_values(
    platform: OnboardingEnvironmentPlatform,
    current_path: Option<String>,
    login_shell_path: Option<String>,
) -> Option<String> {
    // on macOS prefer login-shell PATH, then append current PATH extras
}

fn configure_onboarding_command(command: &mut Command) {
    // if a resolved PATH exists, inject it into the subprocess env
}
```

- [ ] **Step 2: Apply the helper to the onboarding subprocess entry points**

```rust
fn probe_command_output(program: &str, args: &[&str]) -> Result<Output, std::io::Error> {
    let mut command = Command::new(program);
    configure_onboarding_command(&mut command);
    command.args(args);
    command.output()
}

fn execute_connection_test_script(script_path: &Path, env_path: &Path) -> Result<Output, String> {
    for (program, base_args) in python_command_candidates() {
        let mut command = Command::new(program);
        configure_onboarding_command(&mut command);
        // keep existing args and current_dir handling
    }
}

fn run_install_step(...) -> Result<(), String> {
    let mut command = Command::new(&step.program);
    configure_onboarding_command(&mut command);
    // keep existing stdout/stderr piping and progress reporting
}
```

- [ ] **Step 3: Run targeted Rust tests to verify they pass**

Run: `cargo test onboarding_unix_path_merge_prefers_login_shell_order onboarding_process_search_path_prefers_login_shell_entries --manifest-path src-tauri/Cargo.toml -- --nocapture`
Expected: PASS

### Task 3: Verify the existing onboarding regression surface

**Files:**
- Modify: `src-tauri/src/commands/onboarding.rs`
- Test: `src-tauri/src/commands/onboarding.rs`

- [ ] **Step 1: Run the broader onboarding Rust test slice**

Run: `cargo test onboarding_environment onboarding_connection_test --manifest-path src-tauri/Cargo.toml -- --nocapture`
Expected: PASS with the existing onboarding environment and connection tests still green.

- [ ] **Step 2: Capture the user-facing impact**

```text
macOS onboarding environment checks now use the login-shell PATH when probing
for brew/python3/git/svn/ssh and when running python-based connection tests or
install commands, so GUI startup no longer disagrees with `bash -l`.
```
