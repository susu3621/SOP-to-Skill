# Onboarding Home Hover Bubble Design

**Goal:** Change the onboarding home-card help from a block displayed below the cards to a hover/focus bubble shown next to the active card, optimized for desktop use only.

**Scope:** This spec only changes the help-display pattern for the three onboarding home cards on the homepage. It does not change the card copy, completion state, save behavior, or deeper module flows.

## Approved Interaction

### Desktop-Only Hover Bubble

The onboarding home screen currently renders a shared detail panel below the three cards. That panel should be replaced with a floating bubble tied to the active card.

New behavior:
- when the pointer hovers a home card, a bubble appears next to that card
- when a home card receives keyboard focus, the same bubble appears
- when hover/focus leaves the card, the bubble disappears
- only one bubble is visible at a time

This feature is designed only for the PC desktop app. No touch-specific fallback is required.

## Bubble Content

The bubble reuses the current detail content for each card:
- title
- description
- ordered item list

The content itself does not change in this spec. Only the presentation changes.

## Layout Rules

- remove the shared detail block that currently sits under the card grid
- render the bubble as an overlay visually attached to the active card
- default placement should be beside the hovered card rather than below the whole grid
- if the card is on the right edge, the bubble may flip to the left to stay inside the panel
- the bubble should feel lightweight and tooltip-like, not like a full secondary section

## Accessibility

- keyboard focus should trigger the same bubble as hover
- losing focus should hide the bubble
- the bubble content should remain readable in the DOM while visible

## Non-Goals

- no mobile or touch behavior
- no copy rewrite
- no onboarding-state changes
- no changes to the deeper module pages

## Testing Requirements

Tests should lock these behaviors:
- hovering a home card shows the bubble content for that card
- the bubble is no longer rendered as a shared block below the grid
- unhovering hides the bubble
- focus behavior still exposes the same content for keyboard navigation

## Files Expected To Change

- `src/features/onboarding/OnboardingShell.tsx`
  - attach the detail bubble to each home card instead of rendering a shared panel below the grid
- `src/features/onboarding/OnboardingShell.test.tsx`
  - update hover/focus assertions for the new bubble behavior
- `src/styles.css`
  - add hover-bubble positioning and styling
