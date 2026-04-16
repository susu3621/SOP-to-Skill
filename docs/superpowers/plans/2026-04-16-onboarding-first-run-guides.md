# Onboarding First-Run Guides Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add first-run guided bubbles to the onboarding homepage and each onboarding module, persist completion in app config, and only mark a guide as completed after the user reaches the final step.

**Architecture:** Extend `AppConfig` with per-guide completion flags, then add a shared frontend guide registry plus a reusable guide bubble/highlight layer inside onboarding. The onboarding shell owns guide activation by page view, while individual module sections expose stable guide anchors so the same guide runtime can drive homepage, basic, use-case, and install flows.

**Tech Stack:** React, TypeScript, Vitest, Rust, Tauri

---

### Task 1: Lock the new first-run guide behavior with failing tests

**Files:**
- Modify: `src/App.test.tsx`
- Modify: `src/features/onboarding/OnboardingShell.test.tsx`
- Modify: `src-tauri/src/commands/config.rs`

- [ ] **Step 1: Extend the frontend test fixtures with guide-completion config**

Update the existing config mocks so the default test baseline treats all guides as already completed. This keeps the current non-guide tests stable while the new feature is introduced.

```tsx
const completedGuideState = {
  'onboarding-home': { completed: true },
  'onboarding-basic': { completed: true },
  'onboarding-use-cases': { completed: true },
  'onboarding-install': { completed: true },
}

// App.test.tsx and OnboardingShell.test.tsx config mocks
case 'get_config':
  return {
    success: {
      preferred_locale: fixtures.runtime.preferredLocale,
      onboarding_guides: completedGuideState,
    },
  }
```

- [ ] **Step 2: Add a failing homepage guide test in `src/features/onboarding/OnboardingShell.test.tsx`**

Add a dedicated test that overrides `get_config` to return an incomplete homepage guide and then asserts:
- the homepage guide appears automatically
- the first bubble points at `选择公司 IT 工具`
- clicking `关闭` hides the guide
- `update_config` is not called on early close

```tsx
it('auto-opens the homepage first-run guide and does not persist completion on early close', async () => {
  mockControls.configOverride = {
    preferred_locale: 'zh-CN',
    onboarding_guides: {
      'onboarding-home': { completed: false },
      'onboarding-basic': { completed: true },
      'onboarding-use-cases': { completed: true },
      'onboarding-install': { completed: true },
    },
  }

  render(<App />)

  expect(await screen.findByText('第 1 步 / 共 3 步')).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: '先选公司 IT 工具' })).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: '关闭' }))

  expect(screen.queryByText('第 1 步 / 共 3 步')).not.toBeInTheDocument()
  expect(getConfigUpdateCalls()).toHaveLength(0)
})
```

- [ ] **Step 3: Add a failing homepage-completion persistence test**

Add a second guide test that drives the homepage guide through all 3 steps and asserts:
- `update_config` is called with `'onboarding-home': { completed: true }`
- the guide closes after the final step
- revisiting the homepage in the same render does not auto-open it again

```tsx
it('marks the homepage first-run guide complete only after the final step', async () => {
  // incomplete home guide config
  // click 下一步 three times
  // assert update_config payload includes onboardingGuides.onboarding-home.completed === true
})
```

- [ ] **Step 4: Add failing module-guide tests for `basic`, `useCases`, and `install`**

Add one focused test per module that sets only that module guide to incomplete, opens the module, and asserts the first module-specific bubble appears.

```tsx
it('auto-opens the 公司 IT 工具 first-run guide on first entry', async () => {
  // config override: onboarding-basic incomplete
  // click 选择公司 IT 工具
  // expect bubble heading "先选你们公司正在使用的 IT 工具"
})

it('auto-opens the 工作配置 first-run guide on first entry', async () => {
  // config override: onboarding-use-cases incomplete
  // click 配置要交给 AI 的工作
  // expect role-tab guidance bubble
})

it('auto-opens the 安装 first-run guide on first entry', async () => {
  // config override: onboarding-install incomplete
  // click 安装到 AI 工具
  // expect agent selection guidance bubble
})
```

- [ ] **Step 5: Add failing Rust config tests for guide defaults and persistence**

Extend `src-tauri/src/commands/config.rs` tests so they assert:
- config files without `onboarding_guides` still deserialize with all guides incomplete
- saving config with guide completion preserves locale and interval fields

```rust
#[test]
fn load_config_defaults_missing_onboarding_guides_to_incomplete() {
    // write legacy config without onboarding_guides
    // assert loaded.onboarding_guides["onboarding-home"].completed == false
}

#[test]
fn save_config_persists_onboarding_guide_completion_without_clobbering_locale() {
    // set preferred_locale + onboarding_guides, save, reload, assert both survive
}
```

- [ ] **Step 6: Run the focused red tests**

Run:

```bash
npm test -- src/App.test.tsx src/features/onboarding/OnboardingShell.test.tsx
cargo test load_config_ --manifest-path src-tauri/Cargo.toml -- --nocapture
```

Expected:
- Vitest fails because the guide UI and config contract do not exist yet
- Rust config tests fail because `AppConfig` has no `onboarding_guides`

### Task 2: Extend app config to persist first-run guide completion

**Files:**
- Modify: `src-tauri/src/models/skill.rs`
- Modify: `src-tauri/src/commands/config.rs`
- Modify: `src/types.ts`

- [ ] **Step 1: Add shared guide-completion types in Rust**

Extend `AppConfig` with a serializable map for onboarding guides.

```rust
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct OnboardingGuideCompletion {
    #[serde(default)]
    pub completed: bool,
}

fn default_onboarding_guides() -> std::collections::HashMap<String, OnboardingGuideCompletion> {
    HashMap::from([
        ("onboarding-home".to_string(), OnboardingGuideCompletion::default()),
        ("onboarding-basic".to_string(), OnboardingGuideCompletion::default()),
        ("onboarding-use-cases".to_string(), OnboardingGuideCompletion::default()),
        ("onboarding-install".to_string(), OnboardingGuideCompletion::default()),
    ])
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    ...
    #[serde(default = "default_onboarding_guides")]
    pub onboarding_guides: HashMap<String, OnboardingGuideCompletion>,
}
```

- [ ] **Step 2: Thread the new field through config load/save/update**

Keep `load_config()` backward-compatible and let `update_config` optionally update the guide map.

```rust
#[tauri::command]
pub fn update_config(
    preferred_locale: Option<String>,
    update_check_interval_hours: Option<u64>,
    onboarding_guides: Option<HashMap<String, OnboardingGuideCompletion>>,
) -> SkillResult<AppConfig> {
    let mut config = load_config();

    if let Some(locale) = preferred_locale {
        config.preferred_locale = Some(locale);
    }

    if let Some(interval) = update_check_interval_hours {
        config.update_check_interval_hours = interval;
    }

    if let Some(guides) = onboarding_guides {
        config.onboarding_guides = guides;
    }

    ...
}
```

- [ ] **Step 3: Mirror the config types in `src/types.ts`**

Add the guide-completion shape to the existing frontend `AppConfig`.

```ts
export interface OnboardingGuideCompletionState {
  completed: boolean
}

export type OnboardingGuideId =
  | 'onboarding-home'
  | 'onboarding-basic'
  | 'onboarding-use-cases'
  | 'onboarding-install'

export type OnboardingGuideCompletionMap = Record<
  OnboardingGuideId,
  OnboardingGuideCompletionState
>

export interface AppConfig {
  update_check_interval_hours: number
  last_update_check?: string
  preferred_locale?: string
  onboarding_guides?: Partial<OnboardingGuideCompletionMap>
}
```

- [ ] **Step 4: Re-run the config tests to turn Rust green first**

Run:

```bash
cargo test load_config_ --manifest-path src-tauri/Cargo.toml -- --nocapture
```

Expected:
- Rust config tests pass
- frontend tests still fail because the guide runtime is still missing

### Task 3: Build the shared frontend guide registry and bubble runtime

**Files:**
- Create: `src/features/onboarding/firstRunGuides.ts`
- Create: `src/features/onboarding/FirstRunGuideBubble.tsx`
- Modify: `src/features/onboarding/copy.ts`
- Modify: `src/types.ts`

- [ ] **Step 1: Add declarative guide definitions in `firstRunGuides.ts`**

Define a shared registry for the homepage and the 3 onboarding modules.

```ts
export interface FirstRunGuideStep {
  anchor_id: string
  title: string
  body: string
  placement?: 'right' | 'left' | 'bottom'
  before_enter?: 'use-cases-role-tab' | 'use-cases-work-tab'
}

export interface FirstRunGuideDefinition {
  id: OnboardingGuideId
  steps: FirstRunGuideStep[]
}

export const firstRunGuideIds = [
  'onboarding-home',
  'onboarding-basic',
  'onboarding-use-cases',
  'onboarding-install',
] as const
```

- [ ] **Step 2: Add guide copy entries to `src/features/onboarding/copy.ts`**

Add:
- shared button labels: `guideClose`, `guideNext`, `guidePrevious`
- step counter copy
- titles and bodies for homepage/basic/use-cases/install guide steps

```ts
guideNext: { 'zh-CN': '下一步', 'en-US': 'Next' },
guidePrevious: { 'zh-CN': '上一步', 'en-US': 'Back' },
guideClose: { 'zh-CN': '关闭', 'en-US': 'Close' },
guideStepCounter: {
  'zh-CN': ({ current, total }) => `第 ${current} 步 / 共 ${total} 步`,
  'en-US': ({ current, total }) => `Step ${current} of ${total}`,
},
```

If the current copy helpers only support string values, keep the counter as a small formatter helper in the component and store only the fixed button strings in `copy.ts`.

- [ ] **Step 3: Create a reusable bubble component in `FirstRunGuideBubble.tsx`**

The component should render:
- step counter
- title
- body
- `上一步`
- `下一步`
- `关闭`

```tsx
export function FirstRunGuideBubble({
  locale,
  currentStep,
  totalSteps,
  title,
  body,
  canGoBack,
  onBack,
  onNext,
  onClose,
}: Props) {
  return (
    <section className="first-run-guide-bubble" aria-live="polite">
      <p className="first-run-guide-bubble__eyebrow">{`第 ${currentStep} 步 / 共 ${totalSteps} 步`}</p>
      <h3>{title}</h3>
      <p>{body}</p>
      <div className="button-row">
        {canGoBack ? <button type="button" onClick={onBack}>上一步</button> : null}
        <button className="button" type="button" onClick={onNext}>下一步</button>
        <button className="button--ghost" type="button" onClick={onClose}>关闭</button>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Add focused frontend runtime types in `src/types.ts`**

Add the local runtime state needed by onboarding only.

```ts
export interface ActiveFirstRunGuideState {
  guideId: OnboardingGuideId
  stepIndex: number
}
```

- [ ] **Step 5: Run the focused frontend tests again**

Run:

```bash
npm test -- src/features/onboarding/OnboardingShell.test.tsx -t "first-run guide"
```

Expected:
- the new guide tests still fail because onboarding has not mounted the guide runtime yet

### Task 4: Integrate the guide runtime into onboarding and expose stable anchors

**Files:**
- Modify: `src/features/onboarding/OnboardingShell.tsx`
- Modify: `src/features/onboarding/steps/CredentialsStep.tsx`
- Modify: `src/features/onboarding/steps/AgentSelectionStep.tsx`
- Modify: `src/features/onboarding/steps/InstallSelectionStep.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Add stable guide-anchor wrappers in onboarding UI**

Attach semantic anchors to the containers that the guides need.

```tsx
<div data-guide-anchor="onboarding-home-basic-card">...</div>
<section data-guide-anchor="onboarding-basic-base-skills">...</section>
<section data-guide-anchor="onboarding-basic-credentials">...</section>
<div data-guide-anchor="onboarding-install-agent-selection">...</div>
<section data-guide-anchor="onboarding-install-review">...</section>
<div data-guide-anchor="onboarding-install-sync-actions">...</div>
```

- [ ] **Step 2: Add local guide runtime state to `OnboardingShell.tsx`**

Track:
- loaded config guide completion map
- current active guide
- locally dismissed guide for the current page visit

```tsx
const [guideConfig, setGuideConfig] = useState<OnboardingGuideCompletionMap>(defaultGuideState)
const [activeGuide, setActiveGuide] = useState<ActiveFirstRunGuideState | null>(null)
const [dismissedGuideId, setDismissedGuideId] = useState<OnboardingGuideId | null>(null)
```

- [ ] **Step 3: Load config-backed guide completion and auto-open the correct guide**

On onboarding load and whenever the current page view changes:
- determine the page’s guide id
- if it is incomplete and not locally dismissed for that visit, start at step 0

```tsx
useEffect(() => {
  const guideId = getGuideIdForView(view)
  if (!guideId) return
  if (dismissedGuideId === guideId) return
  if (guideConfig[guideId]?.completed) return
  setActiveGuide({ guideId, stepIndex: 0 })
}, [guideConfig, dismissedGuideId, view])
```

- [ ] **Step 4: Add guide step transitions and view-specific preparation**

Implement:
- `handleGuideClose`
- `handleGuideBack`
- `handleGuideNext`

The final `handleGuideNext` must persist completion through `update_config`.

For the use-cases guide, step transitions may switch tabs only for presentation.

```tsx
async function handleGuideNext() {
  if (!activeGuide) return
  const definition = firstRunGuideRegistry[activeGuide.guideId]
  const isLastStep = activeGuide.stepIndex === definition.steps.length - 1

  if (!isLastStep) {
    const nextIndex = activeGuide.stepIndex + 1
    applyGuideStepBeforeEnter(definition.steps[nextIndex])
    setActiveGuide({ ...activeGuide, stepIndex: nextIndex })
    return
  }

  const nextGuides = {
    ...guideConfig,
    [activeGuide.guideId]: { completed: true },
  }

  const result = await invoke<SkillResult<AppConfig>>('update_config', {
    onboardingGuides: nextGuides,
  })

  if (result.success?.onboarding_guides) {
    setGuideConfig(resolveGuideConfig(result.success.onboarding_guides))
  }

  setActiveGuide(null)
  setDismissedGuideId(null)
}
```

- [ ] **Step 5: Render the active guide bubble beside the active anchor and suppress hover help**

Wire the active guide into the existing homepage and module layouts.

```tsx
const activeGuideStep = activeGuide
  ? firstRunGuideRegistry[activeGuide.guideId].steps[activeGuide.stepIndex]
  : null

const guideVisibleForAnchor = activeGuideStep?.anchor_id === 'onboarding-home-basic-card'

{guideVisibleForAnchor ? (
  <FirstRunGuideBubble ... />
) : hoveredHomeEntry === 'basic' ? (
  <DetailPanel ... />
) : null}
```

For non-homepage module sections, render the guide bubble from the anchored section wrapper using the same pattern.

- [ ] **Step 6: Add the new guide overlay/highlight styles**

Add styles for:
- highlighted anchor state
- dimmed background while a guide is active
- guide bubble placement
- button row alignment for guide controls

```css
.guide-anchor[data-guide-active='true'] {
  position: relative;
  z-index: 2;
  box-shadow: 0 0 0 3px rgba(199, 106, 42, 0.25);
}

.first-run-guide-bubble {
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  width: min(320px, 90vw);
}
```

- [ ] **Step 7: Run the guide-focused Vitest suite**

Run:

```bash
npm test -- src/features/onboarding/OnboardingShell.test.tsx -t "guide"
```

Expected:
- the new guide tests pass
- older onboarding tests may still fail until `App.test.tsx` and baseline mocks are updated consistently

### Task 5: Reconcile the app-shell mocks and run full verification

**Files:**
- Modify: `src/App.test.tsx`
- Modify: `src/features/onboarding/OnboardingShell.test.tsx`
- Modify: `src/styles.css`
- Modify: `src-tauri/src/commands/config.rs`

- [ ] **Step 1: Update `App.test.tsx` config mocks to preserve both locale and guide state**

Keep locale-switching assertions working while supporting guide persistence payloads.

```tsx
case 'update_config':
  if (payload?.preferredLocale) {
    fixtures.runtime.preferredLocale = payload.preferredLocale
  }
  if (payload?.onboardingGuides) {
    fixtures.runtime.onboardingGuides = payload.onboardingGuides
  }
  return {
    success: {
      preferred_locale: fixtures.runtime.preferredLocale,
      onboarding_guides: fixtures.runtime.onboardingGuides,
    },
  }
```

- [ ] **Step 2: Re-run the targeted frontend suites**

Run:

```bash
npm test -- src/App.test.tsx src/features/onboarding/OnboardingShell.test.tsx
```

Expected:
- all app and onboarding tests pass

- [ ] **Step 3: Re-run the Rust config test coverage**

Run:

```bash
cargo test config --manifest-path src-tauri/Cargo.toml -- --nocapture
```

Expected:
- config tests pass with the new onboarding-guides field

- [ ] **Step 4: Run one broad integration safety command**

Run:

```bash
npm test -- src/App.test.tsx src/features/onboarding/OnboardingShell.test.tsx src/content/workbuddy.test.ts
```

Expected:
- the onboarding-focused frontend regression set stays green

- [ ] **Step 5: Commit the implementation**

Run:

```bash
git add src/types.ts src/features/onboarding/copy.ts src/features/onboarding/firstRunGuides.ts src/features/onboarding/FirstRunGuideBubble.tsx src/features/onboarding/OnboardingShell.tsx src/features/onboarding/steps/CredentialsStep.tsx src/features/onboarding/steps/AgentSelectionStep.tsx src/features/onboarding/steps/InstallSelectionStep.tsx src/styles.css src/App.test.tsx src/features/onboarding/OnboardingShell.test.tsx src-tauri/src/models/skill.rs src-tauri/src/commands/config.rs
git commit -m "feat: add onboarding first-run guides"
```
