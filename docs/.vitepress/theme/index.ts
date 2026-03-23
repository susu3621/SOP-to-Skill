import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import './custom.css'

declare global {
  interface Window {
    mermaid?: {
      initialize: (config: Record<string, unknown>) => void
      init: (
        config?: unknown,
        nodes?: string | Element | Element[] | NodeListOf<Element>
      ) => void
    }
  }
}

let mermaidBootstrapped = false

const theme: Theme = {
  extends: DefaultTheme,
  enhanceApp() {
    if (typeof window === 'undefined' || !window.mermaid) {
      return
    }

    if (!mermaidBootstrapped) {
      window.mermaid.initialize({
        startOnLoad: false,
        theme: 'neutral',
        securityLevel: 'strict'
      })
      mermaidBootstrapped = true
    }

    queueMicrotask(() => {
      if (window.mermaid) {
        window.mermaid.init(undefined, document.querySelectorAll('pre.mermaid'))
      }
    })
  }
}

export default theme
