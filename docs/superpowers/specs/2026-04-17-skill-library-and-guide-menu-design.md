# Skill Library And Guide Menu Design

## Goal

Handle feedback `934` and `935` by:
- simplifying the visible Skill library cards
- making locally installed/generated Skills appear inside the Skill library
- adding a `查看引导` entry to the compact masthead menu so users can return to the onboarding guide surface

## Product Decisions

### 934: Skill Library Simplification

The Skill library card grid should stop showing the `已安装 / 未安装` badge on each card.

The library should show two categories of Skills in one combined list:
- normal repository or bundled templates returned from the existing template loader
- locally installed Skills that are not present in the template list anymore, including onboarding-generated local Skills

Installed-only local Skills must appear as normal library entries so users can still discover what exists on disk.

### Installed-Only Skill Behavior

For Skills that exist only because they are already installed locally:
- the library entry should still have a name, version, target list, and optional description
- the detail page must not show the normal install / reinstall action because that flow depends on a template source that may not exist anymore
- instead, the detail page should offer a safe route into the installed-Skill management view

This keeps the library discoverable without exposing a broken reinstall path.

### 935: View Guide Entry

The new `更多操作` menu should gain a `查看引导` action.

This action does not implement the larger first-run-guide system spec. In the current product, the onboarding homepage is already the initial guidance surface, so `查看引导` should:
- close the menu
- navigate to the onboarding shell
- force the onboarding shell back to its home screen

This is the smallest behavior that matches the feedback and current codebase.

## Technical Approach

### Backend

Extend `list_skills` so it:
- loads all template-backed Skills as before
- loads installed metadata from `list_installed`-equivalent filesystem scans
- synthesizes `SkillInfo` entries for installed Skills whose `skill_id` is not already present in the template-backed set

For installed-only synthetic entries:
- prefer reading `SKILL.md` from the installed output directory when available so the library has a real display name and description
- fall back to the `skill_id` when no local package metadata can be read
- mark them as installed
- mark them as not directly installable from the library detail page

### Frontend

`App.tsx` should:
- remove the per-card install status badge from the library card grid
- render the new `查看引导` menu action
- use a `can_install`-style flag from `SkillInfo` so installed-only library entries do not expose the normal install button

`App` should continue to use the existing onboarding home reset flow introduced in the previous batch.

## Files

- `src-tauri/src/commands/skill.rs`
- `src/App.tsx`
- `src/content/copy.ts`
- `src/types.ts`
- `src/App.test.tsx`

## Verification

1. Skill library cards no longer show `已安装 / 未安装`.
2. A locally installed Skill absent from template storage still appears in the library list.
3. Installed-only library details do not expose a broken reinstall action.
4. `更多操作` contains `查看引导`.
5. Clicking `查看引导` returns the app to the onboarding homepage.
