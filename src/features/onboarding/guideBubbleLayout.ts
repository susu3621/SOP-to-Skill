export type GuideBubblePlacement = 'right' | 'left' | 'bottom'

interface RectLike {
  left: number
  top: number
  width: number
  height: number
  right: number
  bottom: number
}

interface SizeLike {
  width: number
  height: number
}

interface ViewportLike {
  width: number
  height: number
}

interface ComputeGuideBubbleLayoutInput {
  preferredPlacement: GuideBubblePlacement
  anchorRect: RectLike
  bubbleSize: SizeLike
  viewport: ViewportLike
  gap?: number
  margin?: number
}

export interface GuideBubbleLayout {
  placement: GuideBubblePlacement
  left: number
  top: number
  maxWidth: number
}

function clamp(value: number, min: number, max: number) {
  if (max <= min) {
    return min
  }

  return Math.min(Math.max(value, min), max)
}

function getCandidatePlacements(
  preferredPlacement: GuideBubblePlacement
): GuideBubblePlacement[] {
  switch (preferredPlacement) {
    case 'left':
      return ['left', 'right', 'bottom']
    case 'bottom':
      return ['bottom', 'right', 'left']
    case 'right':
    default:
      return ['right', 'left', 'bottom']
  }
}

function fitsWithinViewport(
  left: number,
  top: number,
  width: number,
  height: number,
  viewport: ViewportLike,
  margin: number
) {
  return (
    left >= margin &&
    top >= margin &&
    left + width <= viewport.width - margin &&
    top + height <= viewport.height - margin
  )
}

function roundLayoutValue(value: number) {
  return Math.round(value)
}

export function computeGuideBubbleLayout({
  preferredPlacement,
  anchorRect,
  bubbleSize,
  viewport,
  gap = 14,
  margin = 16,
}: ComputeGuideBubbleLayoutInput): GuideBubbleLayout {
  const maxWidth = Math.max(1, viewport.width - margin * 2)
  const bubbleWidth = Math.min(Math.max(1, bubbleSize.width), maxWidth)
  const bubbleHeight = Math.max(1, bubbleSize.height)

  const centeredTop = clamp(
    anchorRect.top + anchorRect.height / 2 - bubbleHeight / 2,
    margin,
    viewport.height - bubbleHeight - margin
  )

  const alignedBottomLeft = clamp(
    anchorRect.left,
    margin,
    viewport.width - bubbleWidth - margin
  )

  const layoutForPlacement = (placement: GuideBubblePlacement) => {
    switch (placement) {
      case 'left':
        return {
          left: anchorRect.left - gap - bubbleWidth,
          top: centeredTop,
        }
      case 'bottom':
        return {
          left: alignedBottomLeft,
          top: anchorRect.bottom + gap,
        }
      case 'right':
      default:
        return {
          left: anchorRect.right + gap,
          top: centeredTop,
        }
    }
  }

  for (const placement of getCandidatePlacements(preferredPlacement)) {
    const candidate = layoutForPlacement(placement)

    if (
      fitsWithinViewport(
        candidate.left,
        candidate.top,
        bubbleWidth,
        bubbleHeight,
        viewport,
        margin
      )
    ) {
      return {
        placement,
        left: roundLayoutValue(candidate.left),
        top: roundLayoutValue(candidate.top),
        maxWidth,
      }
    }
  }

  const fallback = layoutForPlacement(preferredPlacement)

  return {
    placement: preferredPlacement,
    left: roundLayoutValue(
      clamp(fallback.left, margin, viewport.width - bubbleWidth - margin)
    ),
    top: roundLayoutValue(
      clamp(fallback.top, margin, viewport.height - bubbleHeight - margin)
    ),
    maxWidth,
  }
}
