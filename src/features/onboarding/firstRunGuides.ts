import type {
  FirstRunGuideDefinition,
  Locale,
  OnboardingGuideCompletionMap,
  OnboardingGuideId,
} from '../../types'
import { getOnboardingCopy, onboardingCopy } from './copy'

export const firstRunGuideIds: readonly OnboardingGuideId[] = [
  'onboarding-home',
  'onboarding-basic',
  'onboarding-use-cases',
  'onboarding-install',
]

export function createDefaultOnboardingGuideCompletionMap(): OnboardingGuideCompletionMap {
  return {
    'onboarding-home': { completed: false },
    'onboarding-basic': { completed: false },
    'onboarding-use-cases': { completed: false },
    'onboarding-install': { completed: false },
  }
}

export function resolveOnboardingGuideCompletionMap(
  guides?: Partial<OnboardingGuideCompletionMap> | Record<string, { completed: boolean }>
): OnboardingGuideCompletionMap {
  const defaults = createDefaultOnboardingGuideCompletionMap()

  if (!guides) {
    return defaults
  }

  return {
    'onboarding-home': guides['onboarding-home'] ?? defaults['onboarding-home'],
    'onboarding-basic': guides['onboarding-basic'] ?? defaults['onboarding-basic'],
    'onboarding-use-cases':
      guides['onboarding-use-cases'] ?? defaults['onboarding-use-cases'],
    'onboarding-install': guides['onboarding-install'] ?? defaults['onboarding-install'],
  }
}

export function getFirstRunGuideDefinitions(
  locale: Locale
): Record<OnboardingGuideId, FirstRunGuideDefinition> {
  return {
    'onboarding-home': {
      id: 'onboarding-home',
      steps: [
        {
          anchor_id: 'onboarding-home-basic-card',
          title: getOnboardingCopy(locale, onboardingCopy.guideHomeStep1Title),
          body: getOnboardingCopy(locale, onboardingCopy.guideHomeStep1Body),
          placement: 'right',
        },
        {
          anchor_id: 'onboarding-home-use-cases-card',
          title: getOnboardingCopy(locale, onboardingCopy.guideHomeStep2Title),
          body: getOnboardingCopy(locale, onboardingCopy.guideHomeStep2Body),
          placement: 'right',
        },
        {
          anchor_id: 'onboarding-home-install-card',
          title: getOnboardingCopy(locale, onboardingCopy.guideHomeStep3Title),
          body: getOnboardingCopy(locale, onboardingCopy.guideHomeStep3Body),
          placement: 'left',
        },
      ],
    },
    'onboarding-basic': {
      id: 'onboarding-basic',
      steps: [
        {
          anchor_id: 'onboarding-basic-base-skills',
          title: getOnboardingCopy(locale, onboardingCopy.guideBasicStep1Title),
          body: getOnboardingCopy(locale, onboardingCopy.guideBasicStep1Body),
          placement: 'right',
        },
        {
          anchor_id: 'onboarding-basic-credentials',
          title: getOnboardingCopy(locale, onboardingCopy.guideBasicStep2Title),
          body: getOnboardingCopy(locale, onboardingCopy.guideBasicStep2Body),
          placement: 'right',
        },
        {
          anchor_id: 'onboarding-basic-save',
          title: getOnboardingCopy(locale, onboardingCopy.guideBasicStep3Title),
          body: getOnboardingCopy(locale, onboardingCopy.guideBasicStep3Body),
          placement: 'bottom',
        },
      ],
    },
    'onboarding-use-cases': {
      id: 'onboarding-use-cases',
      steps: [
        {
          anchor_id: 'onboarding-use-cases-role-panel',
          title: getOnboardingCopy(locale, onboardingCopy.guideUseCasesStep1Title),
          body: getOnboardingCopy(locale, onboardingCopy.guideUseCasesStep1Body),
          placement: 'right',
          before_enter: 'use-cases-role-tab',
        },
        {
          anchor_id: 'onboarding-use-cases-work-list',
          title: getOnboardingCopy(locale, onboardingCopy.guideUseCasesStep2Title),
          body: getOnboardingCopy(locale, onboardingCopy.guideUseCasesStep2Body),
          placement: 'right',
          before_enter: 'use-cases-work-tab',
        },
        {
          anchor_id: 'onboarding-use-cases-work-editor',
          title: getOnboardingCopy(locale, onboardingCopy.guideUseCasesStep3Title),
          body: getOnboardingCopy(locale, onboardingCopy.guideUseCasesStep3Body),
          placement: 'left',
          before_enter: 'use-cases-work-tab',
        },
        {
          anchor_id: 'onboarding-use-cases-add-use-case',
          title: getOnboardingCopy(locale, onboardingCopy.guideUseCasesStep4Title),
          body: getOnboardingCopy(locale, onboardingCopy.guideUseCasesStep4Body),
          placement: 'left',
          before_enter: 'use-cases-work-tab',
        },
      ],
    },
    'onboarding-install': {
      id: 'onboarding-install',
      steps: [
        {
          anchor_id: 'onboarding-install-agent-selection',
          title: getOnboardingCopy(locale, onboardingCopy.guideInstallStep1Title),
          body: getOnboardingCopy(locale, onboardingCopy.guideInstallStep1Body),
          placement: 'right',
        },
        {
          anchor_id: 'onboarding-install-review',
          title: getOnboardingCopy(locale, onboardingCopy.guideInstallStep2Title),
          body: getOnboardingCopy(locale, onboardingCopy.guideInstallStep2Body),
          placement: 'left',
        },
        {
          anchor_id: 'onboarding-install-sync',
          title: getOnboardingCopy(locale, onboardingCopy.guideInstallStep3Title),
          body: getOnboardingCopy(locale, onboardingCopy.guideInstallStep3Body),
          placement: 'bottom',
        },
      ],
    },
  }
}
