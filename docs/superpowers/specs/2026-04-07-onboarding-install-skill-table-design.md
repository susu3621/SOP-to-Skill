# Onboarding Install Skill Table Design

## Goal

Improve the information density and clarity of the "岗位生成技能" area on the onboarding install page by replacing the current single-column card list with a three-column layout.

## Scope

This change only affects the install page section that renders generated role use-case skills.

In scope:
- Present one use case per row.
- Render three clear columns: `岗位用例`, `生产技能`, `测试技能`.
- Keep the existing checkbox behavior and selection state unchanged.
- Preserve mobile usability with a responsive stacked layout.

Out of scope:
- Changes to onboarding state shape.
- Changes to save/sync logic.
- Changes to the home summary area.
- Changes to generated skill IDs or package staging.

## Current Problem

The current "岗位生成技能" section renders each use case as a small card with the title above two stacked checkboxes. This makes comparison between production and test packages harder than necessary and wastes vertical space.

## Design

### Layout

Use a semantic table inside the "岗位生成技能" summary card:
- Header row: `岗位用例`, `生产技能`, `测试技能`
- One body row per `installCandidateGroup`

Each skill cell contains:
- A checkbox bound to the existing `selectedInstallSkillIds` state
- A short environment label
- The concrete generated skill ID

### Responsive Behavior

On narrow screens, convert each table row into a stacked card-like block:
- Keep the same data order
- Show the column title through `data-label`
- Preserve checkbox interaction and readable skill IDs

### Interaction

No behavior changes:
- `onToggleInstallSkill` remains the only interaction handler
- `selectedInstallSkillIds.includes(skillId)` remains the checked source

## Testing

Add a UI test that opens the install page and verifies:
- The generated skills section exposes the three column headers
- Each use case appears once as its own row
- Production and test skill IDs are both visible in that row

## Risks

- Responsive table styling can become cramped if the skill ID text wraps badly.
- Overly decorative structure would make tests brittle; keep markup simple and semantic.
