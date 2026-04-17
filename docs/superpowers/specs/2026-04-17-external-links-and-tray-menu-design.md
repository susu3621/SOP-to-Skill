# External Links And Tray Menu Design

## Goal

Handle feedback `940` and `941` by:
- fixing the WorkBuddy official-site link inside the onboarding install flow
- ensuring clicking that link opens the system browser from the desktop app
- reducing the macOS tray menu to a single `退出` item

## Product Decisions

### 940: WorkBuddy Official Link

The WorkBuddy link shown in the `安装到 AI 工具` flow should point to:

- `https://www.codebuddy.cn/work/`

The current plain anchor behavior is not sufficient inside the Tauri desktop shell because users report that clicking the link does nothing.

The product behavior should therefore be:

- keep the visible `官网` link in the agent card
- prevent the default in-webview navigation path
- explicitly open the configured URL in the system browser

This keeps the UI unchanged while making the interaction reliable in the packaged app.

### 941: Minimal Tray Menu

The tray icon should still exist in the macOS menu bar and should still open a menu when clicked.

For now, that menu should only contain:

- `退出`

Existing tray shortcuts such as opening the app, checking updates, or jumping to installed/settings views should be removed from the tray menu for this iteration.

The existing hide-on-close behavior should remain unchanged because the feedback only narrows the tray menu, not the app lifecycle.

## Technical Approach

### Frontend

`AgentSelectionStep.tsx` should stop relying on raw anchor navigation alone.

Instead, it should:

- render the same visible link text and href
- intercept the click
- call a small shared open-external-url helper provided by a new Tauri command

This keeps accessibility and hover/copy affordances while fixing the desktop click behavior.

### Backend

Add a small command that opens a URL through the already-enabled `tauri-plugin-shell` integration.

That command should:

- accept a URL string
- reject empty strings
- delegate to `app.shell().open(...)`

For the tray menu:

- reduce `build_tray` to a single `quit` menu item
- reduce the tray event handler to a single `quit` branch

## Files

- `src/features/onboarding/steps/AgentSelectionStep.tsx`
- `src/features/onboarding/OnboardingShell.test.tsx`
- `src/content/workbuddy.ts`
- `src-tauri/src/commands/config.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/src/tray.rs`

## Verification

1. The WorkBuddy agent card link points to `https://www.codebuddy.cn/work/`.
2. Clicking the WorkBuddy official-site link calls the external-open bridge instead of silently doing nothing.
3. The tray menu builder returns only a `退出` item.
4. The tray menu event handler still exits the app when `quit` is selected.
