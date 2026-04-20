# VitePress Home, Downloads, And Product Docs Design

Date: 2026-04-20
Target surface: `docs/` VitePress site
Related context: expand the current single-page site into a real entry homepage with linked downloads and product documentation

## Goal

Turn the current documentation-style single page into a small but clear website with three top-level destinations:

- `首页` explains what the product is and what problem it solves
- `下载` provides platform-specific download and install entry points
- `产品文档` provides the actual usage documentation

The result should behave like a product site plus docs entry, not a long one-page brochure.

## Problem Summary

The current `docs/index.md` page tries to do too many things at once:

1. It acts as a landing page, but it is still structured like one long content page.
2. It does not give downloads their own destination, even though platform differences matter.
3. It does not provide a dedicated documentation entry path for users who already understand the product and want usage details.

Because of that, the page does not establish a stable information hierarchy:

- first-time visitors get too much continuous content
- repeat visitors do not get a fast path to docs
- download-related information has no clear home

## Selected Direction

Direction `A / 门户型首页` was selected.

This means the site should be split into explicit entry surfaces instead of extending the current single page indefinitely:

- homepage for message and routing
- download page for distribution
- product docs page for detailed usage

The primary homepage CTA is `查看使用文档`.

## Product Decisions

### Site Framework

All three pages should live inside the existing `VitePress` site.

The React/Tauri app remains the product itself, not the public site shell for this work. The goal here is to improve the GitHub Pages site and docs structure, not to repurpose the desktop app UI as a marketing or documentation surface.

### Top-Level Navigation

The top navigation should be:

- `首页`
- `下载`
- `产品文档`
- `仓库`

The first three are internal site destinations. `仓库` remains the external GitHub repository link.

### Page Responsibilities

`首页` is responsible for:

- stating what the product is
- explaining what problem it solves
- showing the basic working path at a high level
- routing users to either downloads or documentation

`下载` is responsible for:

- listing supported platforms
- exposing download/install entry points for each platform
- showing lightweight version or packaging notes where needed
- keeping platform differences out of the homepage

`产品文档` is responsible for:

- onboarding a user into actual product usage
- quick start guidance
- core workflow explanations
- FAQ and follow-up reading

## Proposed Routes

To keep the structure explicit and maintainable, use these routes:

- `docs/index.md` -> `/`
- `docs/download.md` -> `/download`
- `docs/product-docs/index.md` -> `/product-docs/`

This route naming is intentionally literal. It keeps the homepage short, keeps downloads as a single stable page, and gives product documentation a directory that can later grow into multiple pages without changing the entry URL.

## Homepage Content Plan

The homepage should stop behaving like a full content dump. It should become a guided entry page with a limited number of sections.

### 1. Hero

The first screen should establish:

- one clear product statement
- one short supporting paragraph
- primary CTA: `查看使用文档`
- secondary CTA: `下载`

The hero should not attempt to summarize every detail. It should orient the visitor and move them to the right destination.

### 2. Problem Section

This section answers:

- what makes enterprise AI adoption difficult for ordinary employees
- why disconnected tools, SOPs, and role workflows are a real bottleneck
- why this product exists

The content should reuse the strongest existing ideas from the current page, but it should be rewritten as a shorter explanatory block instead of another dense one-page narrative.

### 3. How It Works Section

This section should describe the product flow in a compact, understandable sequence:

1. connect enterprise tools, rules, and work context
2. structure them into executable Skills
3. install and use them inside supported AI tools

This is not the place for operational detail. It is a conceptual bridge between the value statement and the documentation.

### 4. Entry Section

The homepage should have a clear entry block that routes users into the next step:

- `查看使用文档`
- `下载`

If useful, a short sentence can clarify who each route is for:

- documentation for users who want to understand and use the product
- download page for users who are ready to install a platform build

### 5. Supporting Proof Section

The homepage may keep one restrained supporting section that shows credibility without turning back into a long page. Examples:

- supported target tools
- covered role/use-case direction
- installation/sync capability summary

This section must stay short and secondary.

## Downloads Page Content Plan

The downloads page should be a simple operational page, not a narrative page.

It should include:

- a short intro explaining that builds are distributed by platform
- separate platform blocks for at least `macOS` and `Windows`
- one clear link or status per platform
- lightweight notes where needed, such as packaging status or install caveats

If exact download URLs are not yet stable, the initial implementation should use either repository-release links or explicit platform-status copy, but the page structure should still be real and navigable.

The downloads page should not absorb full installation instructions. Those belong in `产品文档`.

## Product Docs Entry Plan

`/product-docs/` should be the documentation entry page, not a deep technical appendix.

It should provide:

- a short explanation of what the product docs cover
- a quick start section
- links to the main usage topics
- an FAQ or troubleshooting entry point if content exists

The page can start modestly, but it must already function as the documentation home, not just a thin transition page.

## Content Migration Rules

The existing `docs/index.md` content should be treated as source material, not preserved one-to-one.

Rules:

- keep the strongest product narrative from the current page
- cut sections that are too detailed for a homepage
- move operational detail toward `产品文档`
- move platform/distribution detail toward `下载`
- do not duplicate the same explanation across all three pages

Each page should have one job.

## Visual And UX Direction

The three pages should feel like one site system.

Requirements:

- consistent top navigation across homepage, downloads, and docs
- shared visual language and page rhythm
- stronger hierarchy than the current single long page
- explicit CTA treatment on the homepage

The homepage can remain visually expressive, but the downloads and docs entry pages should be cleaner and more task-oriented.

## Implementation Boundaries

In scope:

- restructure `docs/index.md` into a homepage
- add a new downloads page
- add a new product docs entry page
- update `docs/.vitepress/config.mts` navigation
- add or adjust styling needed to support the three-page structure

Out of scope:

- changing the React/Tauri application routes or UI for this feature
- building a large docs IA beyond the initial docs home
- implementing platform installers themselves
- adding a CMS or new documentation framework

## Likely Files

- `docs/index.md`
- `docs/download.md`
- `docs/product-docs/index.md`
- `docs/.vitepress/config.mts`
- `docs/.vitepress/theme/custom.css`

Additional docs files may be added if the product docs entry page needs one or two supporting pages, but the initial implementation should stay tight.

## Verification Plan

The work is complete only if all of the following are true:

1. The site has three clear top-level destinations: home, downloads, and product docs.
2. The homepage reads as an entry page instead of a single continuous long-form document.
3. The homepage primary CTA leads to the product documentation entry page.
4. The downloads page exists and includes platform-specific sections.
5. The product docs entry page exists and provides real next steps into usage guidance.
6. The VitePress navigation is updated and works across the pages.
7. The docs build succeeds.

Primary command:

```bash
npm run docs:build
```

Manual checks:

- open the local docs preview
- confirm the homepage CTA goes to `/product-docs/`
- confirm the downloads page is reachable from the nav and from the homepage
- confirm no page feels like an orphan or duplicate of another page

## Risks

- If the homepage keeps too much of the old long-form content, it will still feel like a single-page document instead of a portal.
- If the downloads page lacks stable artifact links, it may feel incomplete. The structure should still be built cleanly so links can be upgraded later without redesign.
- If the product docs entry page is too thin, the homepage CTA will feel premature. The first implementation should include enough structure to make the docs destination feel intentional.

## Decision

Proceed with a VitePress-based three-page site structure:

- homepage for value and routing
- downloads page for platform distribution
- product docs entry for detailed usage guidance

The homepage should lead users primarily into documentation, with downloads as the secondary operational path.
