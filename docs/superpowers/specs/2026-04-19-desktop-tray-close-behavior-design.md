# Desktop Tray Close Behavior Design

## Goal

Handle feedback `957` by making the desktop app behave consistently on macOS, Windows, and Linux:

- clicking the window close button hides the main window to the tray instead of exiting
- clicking the tray icon opens the tray menu only
- the tray menu exposes both `打开` and `退出`
- choosing `退出` exits the app for real

## Product Decisions

### Unified Cross-Platform Behavior

The app should stop having implicit platform differences for this lifecycle flow.

For every desktop platform we ship:

- `关闭` means "hide to tray"
- `最小化` keeps the operating system default minimize behavior
- tray icon interaction should stay menu-driven instead of restoring the window immediately

This matches the current macOS expectation the user described and brings Windows in line with it.

### Tray Menu Contents

The tray menu should contain exactly two actions:

- `打开`
- `退出`

`打开` exists because once the main window is hidden there must still be an explicit way back into the app without changing the tray-click interaction model.

`退出` remains the one explicit shutdown path from the tray.

### Open And Quit Semantics

`打开` should:

- show the existing main window
- unminimize it if needed
- focus it

`退出` should:

- mark the app as intentionally quitting
- allow the process to terminate cleanly instead of being redirected back into hide-to-tray behavior

## Technical Approach

### Close Interception Boundary

The current global `CloseRequested` handler hides any window and always prevents closing. That is too broad for the desired lifecycle.

The new behavior should only intercept the main window when:

- the app is not already in an intentional quit flow

That keeps the close-to-tray behavior targeted and avoids creating future surprises if other windows are added later.

### Lifecycle State

Introduce a small shared Rust state object for desktop lifecycle decisions.

It should track whether the app is currently quitting. The tray `退出` action sets that flag before calling the Tauri exit path. The close-request handler checks the flag and skips hide-to-tray interception once quitting has started.

This makes the quit path explicit instead of depending on subtle runtime ordering between tray events and window close events.

### Tray Integration

`src-tauri/src/tray.rs` should own the tray menu identifiers and tray-driven window actions.

The tray event handler should:

- on `open`: look up the main window, show it, unminimize it, and focus it
- on `quit`: set the shared quitting flag and call `app.exit(0)`

The tray icon should keep `show_menu_on_left_click(true)` so the click behavior remains menu-only.

## Files

- `src-tauri/src/lib.rs`
- `src-tauri/src/tray.rs`

## Verification

1. `cargo test tray` proves the tray menu constants and item ordering match `打开` + `退出`.
2. `cargo test close_request` proves the close interception helper only hides the main window when the app is not quitting.
3. `cargo test` proves the full Rust test suite still passes after the lifecycle change.
