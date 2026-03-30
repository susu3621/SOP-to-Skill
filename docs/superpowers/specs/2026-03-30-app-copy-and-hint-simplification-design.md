# App Copy And Hint Simplification Design

**Date:** 2026-03-30

## Goal

Simplify the app's explanatory UI so instructional content is presented as plain text instead of boxed callouts or nested cards, and remove demo/live-send messaging from the visible product interface.

## Scope

This change applies to user-facing explanatory surfaces across the current app UI, with priority on the onboarding flow and the app header.

In scope:

1. explanatory panels that currently rely on bordered or card-like containers
2. nested boxed explanation items such as the onboarding secondary-entry descriptions
3. explicit UI copy about `Demo`, `模拟`, or `真实发送能力`

Out of scope:

1. core selection controls such as buttons, cards used for navigation, checkboxes, radio groups, and install targets
2. result data containers that represent real editable content instead of explanatory hints
3. backend generation behavior or actual send/install capabilities

## User-Facing Changes

### Explanatory Content Presentation

Instructional copy should read as supporting text, not as separate objects that compete with the primary actions.

- keep headings, short descriptions, and ordered entry labels
- remove borders, background fills, and nested card treatment from explanation-only areas
- render explanation items as plain text rows or a simple text list

### Demo And Capability Messaging

The visible app interface should no longer describe itself as a demo or mention that real send capability is not connected yet.

- remove the header tag that currently states the app is a UI demo
- remove or neutralize copy that foregrounds `模拟` or future live-send behavior in the visible interface
- keep the interface focused on configuration and navigation language only

## Architecture

The implementation should stay mostly inside the React UI layer.

- update shared copy in `src/content/copy.ts`
- adjust onboarding presentation in `src/features/onboarding/OnboardingShell.tsx`
- refine supporting styles in `src/styles.css`
- update tests that assert the previous explanation panel behavior or demo copy

## Interaction Rules

- hover/focus-driven detail behavior can remain, but its content should render as text instead of boxed nested cards
- explanatory text may remain visually grouped by spacing, not by framed callouts
- primary navigation cards and editing panels remain interactive and visually distinct

## Testing Strategy

Add or update tests that prove:

1. onboarding detail content still appears when expected
2. explanation items are rendered without nested summary-card containers
3. the visible app header no longer shows demo/live-send messaging
4. existing onboarding navigation and save flows still work after the copy and style changes
