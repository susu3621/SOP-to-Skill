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

    document.querySelectorAll('div.language-mermaid').forEach((block) => {
      if (block.querySelector('.mermaid')) {
        return
      }

      const code = block.querySelector('code')
      if (!code) {
        return
      }

      const diagram = document.createElement('div')
      diagram.className = 'mermaid'
      diagram.textContent = code.textContent ?? ''
      block.replaceChildren(diagram)
    })

    queueMicrotask(() => {
      if (window.mermaid) {
        window.mermaid.init(undefined, document.querySelectorAll('.mermaid'))
      }
    })
  }
}

export default theme
