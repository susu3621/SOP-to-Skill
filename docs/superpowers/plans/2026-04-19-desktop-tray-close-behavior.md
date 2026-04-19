# Desktop Tray Close Behavior Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the desktop app hide the main window to the tray on close across all desktop platforms, keep tray clicks menu-only, and add explicit `打开` and `退出` tray actions.

**Architecture:** Keep the implementation entirely in the Tauri Rust layer. Add a small shared lifecycle state that distinguishes intentional quit from ordinary close, then wire the tray menu to either reopen the main window or perform a real exit.

**Tech Stack:** Tauri v2, Rust unit tests

---

### Task 1: Lock The Desired Tray And Close Semantics In Tests

**Files:**
- Modify: `src-tauri/src/tray.rs`
- Modify: `src-tauri/src/lib.rs`
- Test: `src-tauri/src/tray.rs`
- Test: `src-tauri/src/lib.rs`

- [ ] **Step 1: Add failing tray menu tests for `打开` and `退出`**

```rust
#[test]
fn tray_menu_entries_keep_open_then_quit_actions() {
    assert_eq!(tray_menu_entries(), &[("open", "打开"), ("quit", "退出")]);
}

#[test]
fn tray_open_item_id_stays_stable() {
    assert_eq!(tray_open_item_id(), "open");
}
```

- [ ] **Step 2: Add failing close-interception helper tests**

```rust
#[test]
fn close_request_is_hidden_for_main_window_when_not_quitting() {
    assert!(should_hide_on_close("main", false));
}

#[test]
fn close_request_is_not_hidden_once_app_is_quitting() {
    assert!(!should_hide_on_close("main", true));
}

#[test]
fn close_request_is_not_hidden_for_non_main_windows() {
    assert!(!should_hide_on_close("settings", false));
}
```

- [ ] **Step 3: Run focused Rust tests and confirm they fail first**

Run: `cargo test tray`
Expected: FAIL because the tray currently only exposes `quit`.

Run: `cargo test close_request`
Expected: FAIL because the close helper does not exist yet.

### Task 2: Implement Explicit Open And Quit Lifecycle Handling

**Files:**
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/src/tray.rs`

- [ ] **Step 1: Add shared lifecycle state and close helper in `lib.rs`**

```rust
#[derive(Default)]
struct AppLifecycleState {
    is_quitting: std::sync::atomic::AtomicBool,
}

fn should_hide_on_close(window_label: &str, is_quitting: bool) -> bool {
    window_label == "main" && !is_quitting
}
```

- [ ] **Step 2: Register the lifecycle state and use it in the window close handler**

```rust
.manage(AppLifecycleState::default())
.on_window_event(|window, event| {
    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
        let state = window.state::<AppLifecycleState>();
        let is_quitting = state.is_quitting.load(std::sync::atomic::Ordering::SeqCst);

        if should_hide_on_close(window.label(), is_quitting) {
            let _ = window.hide();
            api.prevent_close();
        }
    }
})
```

- [ ] **Step 3: Expand the tray menu and wire the open/quit handlers**

```rust
const TRAY_OPEN_ITEM_ID: &str = "open";
const TRAY_QUIT_ITEM_ID: &str = "quit";
const TRAY_MENU_ENTRIES: [(&str, &str); 2] = [
    (TRAY_OPEN_ITEM_ID, "打开"),
    (TRAY_QUIT_ITEM_ID, "退出"),
];
```

```rust
match event.id.as_ref() {
    id if id == tray_open_item_id() => {
        open_main_window(app);
    }
    id if id == tray_quit_item_id() => {
        mark_app_as_quitting(app);
        app.exit(0);
    }
    _ => {}
}
```

- [ ] **Step 4: Make `打开` show, unminimize, and focus the existing main window**

```rust
fn open_main_window<R: Runtime>(app: &AppHandle<R>) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}
```

- [ ] **Step 5: Run the focused Rust tests and make them pass**

Run: `cargo test tray`
Expected: PASS

Run: `cargo test close_request`
Expected: PASS

### Task 3: Full Rust Verification

**Files:**
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/src/tray.rs`

- [ ] **Step 1: Run the full Rust suite**

Run: `cargo test`
Expected: PASS with `0 failed`

- [ ] **Step 2: Inspect the worktree diff**

Run: `git status --short`
Expected: only the intended Rust files plus the new spec and plan documents are modified.
