import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'zh-CN',
  title: 'AI 工作方式转型',
  description: '面向普通员工的 AI 工作方式公开文档',
  cleanUrls: true,
  lastUpdated: true,
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '仓库', link: 'https://github.com/<owner>/<repo>' }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/<owner>/<repo>' }
    ],
    outline: [2, 3],
    search: {
      provider: 'local'
    }
  },
  head: [
    [
      'script',
      {
        defer: '',
        src: 'https://cdn.jsdelivr.net/npm/mermaid@8.8.0/dist/mermaid.min.js'
      }
    ]
  ]
})
