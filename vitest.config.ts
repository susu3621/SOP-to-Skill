import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    css: true,
    exclude: [
      '.tmp/**',
      '.worktrees/**',
      'node_modules/**',
      'dist/**',
      'docs/.vitepress/**',
      'src-tauri/target/**',
      'skills/**/tests/**/*.test.mjs'
    ]
  }
})
