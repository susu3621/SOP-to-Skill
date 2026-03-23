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
let mermaidRetryTimer: ReturnType<typeof setTimeout> | null = null

function scheduleMermaidBootstrap() {
  if (mermaidRetryTimer) {
    return
  }

  const tick = (attempt: number) => {
    if (window.mermaid) {
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

      mermaidRetryTimer = null
      return
    }

    if (attempt >= 100) {
      mermaidRetryTimer = null
      return
    }

    mermaidRetryTimer = setTimeout(() => tick(attempt + 1), 50)
  }

  tick(0)
}

const theme: Theme = {
  extends: DefaultTheme,
  enhanceApp() {
    if (typeof window === 'undefined') {
      return
    }

    scheduleMermaidBootstrap()
  }
}

export default theme
