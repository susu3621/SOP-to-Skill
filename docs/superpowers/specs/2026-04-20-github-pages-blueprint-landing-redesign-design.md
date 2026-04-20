# GitHub Pages Blueprint Landing Redesign

Date: 2026-04-20
Related feedback: `#950`
Target page: `docs/index.md`

## Goal

Replace the current soft document-style GitHub Pages landing page with a stronger brand-style narrative page that:

- gives the first screen a clear visual anchor
- replaces the weak Mermaid diagram with a layered hero visual
- separates the story into a small number of clear sections instead of dense card grids
- keeps the existing product message centered on `Skill` as the bridge between enterprise AI transformation and employee capability growth

## Problem Summary

The current page fails in two visible ways:

1. The hero is text-dominant and visually weak. It reads like a documentation cover rather than a strategic landing page.
2. Information density collapses the hierarchy. Too many card-like blocks compete at similar weight, so the page feels crowded even when the copy is correct.

The Mermaid diagram amplifies both problems because it looks obviously auto-generated and does not carry enough visual authority to anchor the narrative.

## Selected Direction

Direction `B / System Blueprint` was selected.

This means the page should feel like an enterprise AI transformation blueprint:

- the hero is a full-bleed dark technical plane
- the main visual is a layered blueprint-style image, not inline Mermaid
- the page tells one strategic story from top to bottom
- the body uses a restrained section rhythm instead of repeating similar card treatments

## Visual Thesis

An editorial enterprise blueprint: dark, precise, high-contrast, and strategic rather than soft, friendly, or brochure-like.

## Content Plan

1. Hero
   One dominant statement plus a blueprint visual showing `enterprise -> skill -> employee -> outcome/growth`.
2. Support
   Explain why `Skill` is the operational interface between enterprise assets and employee work.
3. Detail
   Split the body into challenge, growth, and solution sections with stronger separation and less simultaneous density.
4. Final CTA
   Close by tying the current product capabilities back to the transformation path and giving the page a more decisive ending.

## Interaction Thesis

The page should use a small number of deliberate motions:

- layered hero reveal: text and visual do not enter at the same time
- subtle blueprint activation on scroll: nodes, glow, or line emphasis
- section reveal rhythm: each major section enters with consistent vertical pacing

Motion should support hierarchy, not decorate it.

## Page Structure

### 1. Hero

The hero becomes a full-bleed composition with two zones:

- left: brand label, headline, one short supporting paragraph, and 2-3 short supporting signals
- right: the blueprint visual

Rules:

- no boxed cream hero panel
- no pill-heavy navigation cluster inside the main reading area
- no Mermaid rendered directly in content
- the first viewport must read as a poster-like strategic page, not a document

### 2. Support Section

This section explains the central claim:

`Skill` is the reusable interface between enterprise knowledge and employee execution.

Presentation:

- one concise heading
- one short explanatory block
- one supporting visual or structured layout fragment that extends the hero system

This section exists to bridge the hero to the operational story.

### 3. Challenge Section

The employee challenge content should be rewritten into a clearer vertical information flow.

Instead of six equally weighted cards in one grid, the section should use:

- a stronger section heading
- a short intro
- a smaller number of denser rows or staggered content blocks

This keeps the challenge story readable without flattening everything into one scan band.

### 4. Growth Section

The four “能力强化” points remain, but their layout changes from card-grid repetition to a more intentional sequence.

Preferred presentation:

- one heading
- one short lead line
- four numbered or stepped items with stronger progression and spacing

This section should feel like capability accumulation, not a feature matrix.

### 5. Solution Section

The project solution section should explain productization, not repeat the challenge framing.

It should answer:

- how enterprise assets become structured inputs
- how role workflows become executable skills
- how the resulting skills are installed into real AI tools
- how real usage feeds back into better skills

The current product-capability section stays, but becomes a cleaner proof block beneath the solution narrative.

### 6. Closing

The ending should stay short and decisive.

It should reinforce:

- enterprise capability becomes reproducible through skills
- employee capability becomes stronger through use
- this product makes that path testable now

## Hero Visual Asset Plan

The Mermaid diagram will be removed from the final landing page and replaced by a generated raster asset created with `imagegen`.

Asset requirements:

- use case: `infographic-diagram`
- intended placement: hero visual on the right side of the first screen
- style: premium enterprise blueprint, layered radial structure, dark technical board
- visual entities:
  - enterprise
  - skill
  - employee
  - work outcome
  - capability growth
- composition:
  - `Skill` centered as the dominant node
  - enterprise and employee as top-side peer nodes
  - outcome and growth as lower nodes
  - visible relationship lines and layered rings
- text inside the image should be minimal and legible
- avoid cartoon aesthetics, glassmorphism dashboard clichés, generic SaaS illustrations, or embedded UI windows

Delivery rule:

- store the selected raster asset in the workspace
- reference it directly from `docs/index.md`
- do not leave the final page dependent on Mermaid rendering for the hero diagram

## Styling Plan

The visual refresh should move away from soft beige document treatment and use a more intentional system:

- base palette: deep navy / blue-black with one cool cyan accent
- optional warm accent only where it supports emphasis, not as a competing system
- typography: retain the current stack unless a better existing web-safe pairing is already available, but increase scale contrast
- spacing: fewer repeated panels, more large section spacing
- surfaces: use broad planes and dividers, not many floating cards

## Implementation Boundaries

In scope:

- rewrite `docs/index.md` structure and markup
- replace Mermaid hero diagram with a generated image
- significantly restyle `docs/.vitepress/theme/custom.css`
- add restrained motion if it can be done safely inside the current VitePress setup

Out of scope:

- changing the overall docs framework
- redesigning unrelated docs pages
- introducing a large frontend dependency just for animation
- building a general-purpose component system for one landing page

## Verification Plan

The redesign is complete only if all of the following are true:

1. `docs/index.md` reflects the new hero-first, blueprint-led structure.
2. The Mermaid diagram is no longer the main visual anchor.
3. The generated hero image is committed into the workspace and used by the page.
4. The first screen has one dominant visual idea and stronger hierarchy than the current implementation.
5. The body sections are easier to scan because challenge, growth, and solution are separated more clearly.
6. The local docs build succeeds.

Commands:

```bash
bash scripts/verify-docs-content.sh
bash scripts/verify-pages-build.sh
```

Additional manual check:

- review the locally served page on desktop
- confirm that the hero reads as a landing page, not a documentation cover
- confirm that no section falls back into same-weight card repetition

## Risks

- The generated image may look too illustrative or too UI-like. If that happens, regenerate with stricter infographic/blueprint constraints.
- The hero may become visually strong but text may lose contrast. The final implementation must keep a stable dark text area.
- If too many section treatments are introduced, the page may regain clutter. The implementation should prefer removal over embellishment.

## Decision

Proceed with the `System Blueprint` redesign, using a generated hero image and a stronger section hierarchy to replace the current document-like presentation.
