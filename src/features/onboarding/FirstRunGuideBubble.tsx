import type { Locale } from '../../types'
import { getOnboardingCopy, onboardingCopy } from './copy'

interface FirstRunGuideBubbleProps {
  locale: Locale
  currentStep: number
  totalSteps: number
  title: string
  body: string
  canGoBack: boolean
  placement?: 'right' | 'left' | 'bottom'
  onBack: () => void
  onNext: () => void
  onClose: () => void
}

function formatGuideStepLabel(locale: Locale, currentStep: number, totalSteps: number) {
  const template = getOnboardingCopy(locale, onboardingCopy.guideStepLabel)
  return template
    .replace('{current}', String(currentStep))
    .replace('{total}', String(totalSteps))
}

export function FirstRunGuideBubble({
  locale,
  currentStep,
  totalSteps,
  title,
  body,
  canGoBack,
  placement = 'right',
  onBack,
  onNext,
  onClose,
}: FirstRunGuideBubbleProps) {
  return (
    <section
      aria-live="polite"
      className="first-run-guide-bubble"
      data-placement={placement}
      role="dialog"
      aria-label={title}
    >
      <p className="first-run-guide-bubble__eyebrow">
        {formatGuideStepLabel(locale, currentStep, totalSteps)}
      </p>
      <h3 className="first-run-guide-bubble__title">{title}</h3>
      <p className="panel__body">{body}</p>
      <div className="button-row">
        {canGoBack ? (
          <button className="button--ghost" type="button" onClick={onBack}>
            {getOnboardingCopy(locale, onboardingCopy.guidePrevious)}
          </button>
        ) : null}
        <button className="button" type="button" onClick={onNext}>
          {getOnboardingCopy(locale, onboardingCopy.guideNext)}
        </button>
        <button className="button--ghost" type="button" onClick={onClose}>
          {getOnboardingCopy(locale, onboardingCopy.guideClose)}
        </button>
      </div>
    </section>
  )
}
