import { computeGuideBubbleLayout } from './guideBubbleLayout'

describe('computeGuideBubbleLayout', () => {
  it('flips a right-placed bubble to the left when the right side would overflow', () => {
    const layout = computeGuideBubbleLayout({
      preferredPlacement: 'right',
      anchorRect: {
        left: 980,
        top: 160,
        width: 240,
        height: 180,
        right: 1220,
        bottom: 340,
      },
      bubbleSize: {
        width: 320,
        height: 220,
      },
      viewport: {
        width: 1280,
        height: 820,
      },
    })

    expect(layout.placement).toBe('left')
    expect(layout.left).toBe(646)
    expect(layout.left + 320).toBeLessThanOrEqual(1264)
    expect(layout.top).toBeGreaterThanOrEqual(16)
  })

  it('falls back to a bottom placement when neither left nor right fits', () => {
    const layout = computeGuideBubbleLayout({
      preferredPlacement: 'right',
      anchorRect: {
        left: 40,
        top: 80,
        width: 1200,
        height: 180,
        right: 1240,
        bottom: 260,
      },
      bubbleSize: {
        width: 320,
        height: 220,
      },
      viewport: {
        width: 1280,
        height: 820,
      },
    })

    expect(layout.placement).toBe('bottom')
    expect(layout.left).toBeGreaterThanOrEqual(16)
    expect(layout.left + 320).toBeLessThanOrEqual(1264)
    expect(layout.top).toBe(274)
  })

  it('keeps the bubble inside the viewport even when every preferred placement would overflow', () => {
    const layout = computeGuideBubbleLayout({
      preferredPlacement: 'bottom',
      anchorRect: {
        left: 1120,
        top: 660,
        width: 120,
        height: 120,
        right: 1240,
        bottom: 780,
      },
      bubbleSize: {
        width: 320,
        height: 220,
      },
      viewport: {
        width: 1280,
        height: 820,
      },
    })

    expect(layout.left).toBeGreaterThanOrEqual(16)
    expect(layout.left + 320).toBeLessThanOrEqual(1264)
    expect(layout.top).toBeGreaterThanOrEqual(16)
    expect(layout.top + 220).toBeLessThanOrEqual(804)
  })

  it('shrinks the allowed width on narrow viewports so the bubble still fits on screen', () => {
    const layout = computeGuideBubbleLayout({
      preferredPlacement: 'right',
      anchorRect: {
        left: 200,
        top: 120,
        width: 60,
        height: 60,
        right: 260,
        bottom: 180,
      },
      bubbleSize: {
        width: 320,
        height: 220,
      },
      viewport: {
        width: 280,
        height: 500,
      },
    })

    expect(layout.maxWidth).toBe(248)
    expect(layout.left).toBe(16)
    expect(layout.top).toBeGreaterThanOrEqual(16)
  })
})
