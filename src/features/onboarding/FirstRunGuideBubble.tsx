import type { CSSProperties } from 'react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Locale } from '../../types'
import { getOnboardingCopy, onboardingCopy } from './copy'
import {
  computeGuideBubbleLayout,
  type GuideBubbleLayout,
  type GuideBubblePlacement,
} from './guideBubbleLayout'

interface FirstRunGuideBubbleProps {
  locale: Locale
  currentStep: number
  totalSteps: number
  title: string
  body: string
  canGoBack: boolean
  placement?: GuideBubblePlacement
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
  const bubbleRef = useRef<HTMLElement | null>(null)
  const [layout, setLayout] = useState<GuideBubbleLayout | null>(null)
  const [layoutVersion, setLayoutVersion] = useState(0)

  useEffect(() => {
    function handleResize() {
      setLayoutVersion((currentVersion) => currentVersion + 1)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  useLayoutEffect(() => {
    const bubble = bubbleRef.current
    const anchor = bubble?.parentElement

    if (!bubble || !anchor || typeof window === 'undefined') {
      return
    }

    const bubbleRect = bubble.getBoundingClientRect()
    const nextLayout = computeGuideBubbleLayout({
      preferredPlacement: placement,
      anchorRect: anchor.getBoundingClientRect(),
      bubbleSize: {
        width: bubbleRect.width,
        height: bubbleRect.height,
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    })

    setLayout((currentLayout) => {
      if (
        currentLayout &&
        currentLayout.placement === nextLayout.placement &&
        currentLayout.left === nextLayout.left &&
        currentLayout.top === nextLayout.top &&
        currentLayout.maxWidth === nextLayout.maxWidth
      ) {
        return currentLayout
      }

      return nextLayout
    })
  }, [body, canGoBack, currentStep, layoutVersion, placement, title, totalSteps])

  const bubbleStyle: CSSProperties = layout
    ? {
        left: `${layout.left}px`,
        top: `${layout.top}px`,
        maxWidth: `${layout.maxWidth}px`,
        visibility: 'visible',
      }
    : {
        visibility: 'hidden',
      }

  return (
    <section
      aria-live="polite"
      className="first-run-guide-bubble"
      data-placement={layout?.placement ?? placement}
      ref={bubbleRef}
      role="dialog"
      aria-label={title}
      style={bubbleStyle}
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
