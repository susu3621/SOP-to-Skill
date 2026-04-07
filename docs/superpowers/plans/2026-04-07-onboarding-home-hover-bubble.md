# Onboarding Home Hover Bubble Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the onboarding home page’s shared detail block with a desktop-only hover/focus bubble attached to the active card.

**Architecture:** Keep the existing home-card hover state and detail content model, but move rendering from a single block below the grid into per-card floating overlays. Reuse the current detail content component where possible, then restyle it as a bubble and update tests to lock hover and focus behavior.

**Tech Stack:** React, TypeScript, Vitest, Vite

---

## File Structure

- `src/features/onboarding/OnboardingShell.tsx`
  Owns the home-card grid, hover state, and current shared detail-panel rendering.
- `src/features/onboarding/OnboardingShell.test.tsx`
  Locks the onboarding home hover/focus behavior and should catch regressions in the new bubble interaction.
- `src/styles.css`
  Owns the home-card layout and the current detail-panel styles that need to become a floating bubble.

### Task 1: Lock the new hover-bubble behavior with failing tests

**Files:**
- Modify: `src/features/onboarding/OnboardingShell.test.tsx`
- Test: `src/features/onboarding/OnboardingShell.test.tsx`

- [ ] **Step 1: Replace the shared-detail assertions with bubble-specific expectations**

In `shows saved status badges and hides module detail until the user hovers a card`, change the test so it no longer expects a page-level detail block below the grid. Instead assert the bubble appears inside the hovered card wrapper.

Target shape:

```tsx
const useCaseCard = screen.getByRole('button', { name: '配置要交给 AI 的工作' })
const useCaseShell = useCaseCard.closest('.onboarding-entry-card-shell') as HTMLElement

expect(useCaseShell).not.toBeNull()
expect(within(useCaseShell).queryByRole('heading', { name: '配置要交给 AI 的工作' })).not.toBeInTheDocument()

await user.hover(useCaseCard)

const bubble = within(useCaseShell).getByRole('heading', { name: '配置要交给 AI 的工作' })
expect(bubble).toBeInTheDocument()
expect(within(useCaseShell).getByText('选择岗位')).toBeInTheDocument()
expect(within(useCaseShell).getByText('选择工作')).toBeInTheDocument()

await user.unhover(useCaseCard)

expect(within(useCaseShell).queryByRole('heading', { name: '配置要交给 AI 的工作' })).not.toBeInTheDocument()
```

- [ ] **Step 2: Add a focus test for keyboard users**

Add a new test:

```tsx
it('shows the same hover bubble when a home card receives keyboard focus', async () => {
  render(<App />)

  const installCard = await screen.findByRole('button', { name: '安装到 AI 工具' })
  const installShell = installCard.closest('.onboarding-entry-card-shell') as HTMLElement

  installCard.focus()

  expect(within(installShell).getByRole('heading', { name: '安装到 AI 工具' })).toBeInTheDocument()
  expect(within(installShell).getByText('选择 AI 工具')).toBeInTheDocument()

  installCard.blur()

  expect(within(installShell).queryByRole('heading', { name: '安装到 AI 工具' })).not.toBeInTheDocument()
})
```

- [ ] **Step 3: Run the focused onboarding test file and verify it fails**

Run:

```bash
npm test -- src/features/onboarding/OnboardingShell.test.tsx
```

Expected:
- FAIL because `.onboarding-entry-card-shell` does not exist yet
- FAIL because the shared detail panel is still rendered below the grid

### Task 2: Render the detail content as a per-card hover bubble

**Files:**
- Modify: `src/features/onboarding/OnboardingShell.tsx`
- Modify: `src/styles.css`
- Modify: `src/features/onboarding/OnboardingShell.test.tsx`
- Test: `src/features/onboarding/OnboardingShell.test.tsx`

- [ ] **Step 1: Let `DetailPanel` accept a bubble variant**

In `src/features/onboarding/OnboardingShell.tsx`, extend the detail component so it can be styled as a bubble and flipped left for the rightmost card.

Target API:

```tsx
interface DetailPanelProps {
  eyebrow: string
  title: string
  description: string
  items: string[]
  className?: string
  placement?: 'left' | 'right'
}
```

Render with placement data:

```tsx
<section
  aria-live="polite"
  className={`onboarding-detail-panel${className ? ` ${className}` : ''}`}
  data-placement={placement ?? 'right'}
>
```

- [ ] **Step 2: Wrap each home card in a positioned shell**

Inside the home-page branch, replace the bare card list with wrappers:

```tsx
<div className="onboarding-entry-grid">
  <div className="onboarding-entry-card-shell">
    <EntryCard ... />
    {hoveredHomeEntry === 'basic' && (
      <DetailPanel
        className="onboarding-detail-panel--bubble"
        description={onboardingHomeEntries.basic.description}
        eyebrow="模块说明"
        items={onboardingHomeEntries.basic.items}
        placement="right"
        title={onboardingHomeEntries.basic.title}
      />
    )}
  </div>
  ...
  <div className="onboarding-entry-card-shell">
    <EntryCard ... />
    {hoveredHomeEntry === 'install' && (
      <DetailPanel
        className="onboarding-detail-panel--bubble"
        description={onboardingHomeEntries.install.description}
        eyebrow="模块说明"
        items={onboardingHomeEntries.install.items}
        placement="left"
        title={onboardingHomeEntries.install.title}
      />
    )}
  </div>
</div>
```

Then remove the old shared:

```tsx
{detail && <DetailPanel ... />}
```

Also delete the now-unused `detail` local variable in the home branch.

- [ ] **Step 3: Add bubble positioning styles in `src/styles.css`**

Add a shell wrapper and bubble modifier near the onboarding card styles:

```css
.onboarding-entry-card-shell {
  position: relative;
}

.onboarding-detail-panel--bubble {
  position: absolute;
  top: 18px;
  left: calc(100% + 14px);
  z-index: 10;
  width: min(320px, 32vw);
  padding: 16px 18px;
  border: 1px solid rgba(22, 48, 41, 0.12);
  border-radius: 18px;
  background: rgba(255, 250, 245, 0.96);
  box-shadow: 0 18px 36px rgba(74, 49, 30, 0.14);
}

.onboarding-detail-panel--bubble[data-placement='left'] {
  right: calc(100% + 14px);
  left: auto;
}

.onboarding-detail-panel--bubble::before {
  content: '';
  position: absolute;
  top: 22px;
  left: -8px;
  width: 16px;
  height: 16px;
  transform: rotate(45deg);
  border-left: 1px solid rgba(22, 48, 41, 0.12);
  border-bottom: 1px solid rgba(22, 48, 41, 0.12);
  background: rgba(255, 250, 245, 0.96);
}

.onboarding-detail-panel--bubble[data-placement='left']::before {
  right: -8px;
  left: auto;
  border-top: 1px solid rgba(22, 48, 41, 0.12);
  border-right: 1px solid rgba(22, 48, 41, 0.12);
  border-left: none;
  border-bottom: none;
}
```

Keep the existing base `.onboarding-detail-panel` text spacing rules so the content itself does not need duplication.

- [ ] **Step 4: Keep desktop-only scope explicit**

Inside the existing `@media (max-width: 900px)` block, hide the bubble modifier so the desktop-only feature does not create cramped overlays:

```css
.onboarding-detail-panel--bubble {
  display: none;
}
```

Do not add any touch fallback behavior.

- [ ] **Step 5: Run the onboarding tests again**

Run:

```bash
npm test -- src/features/onboarding/OnboardingShell.test.tsx
```

Expected:
- PASS

- [ ] **Step 6: Commit the hover-bubble implementation**

```bash
git add src/features/onboarding/OnboardingShell.tsx src/features/onboarding/OnboardingShell.test.tsx src/styles.css
git commit -m "feat: show onboarding home help as hover bubble"
```

### Task 3: Final verification and branch sync

**Files:**
- Verify only

- [ ] **Step 1: Run the focused verification set**

Run:

```bash
npm test -- src/features/onboarding/OnboardingShell.test.tsx
npm test -- src/App.test.tsx
npm run build
```

Expected:
- `src/features/onboarding/OnboardingShell.test.tsx`: PASS
- `src/App.test.tsx`: PASS
- `npm run build`: exit code `0`

- [ ] **Step 2: Check final branch state**

Run:

```bash
git status --short
git log --oneline --decorate -6
```

Expected:
- no uncommitted changes
- the new hover-bubble commit on top of `3bf4f42`

- [ ] **Step 3: Push the branch**

Run:

```bash
git push origin feature/windows-auto-deploy
```

Expected:
- remote branch fast-forwards successfully
