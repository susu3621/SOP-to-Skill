import { defineConfig } from 'vitepress'

const repoUrl = 'https://github.com/susu3621/skills-for-no-engineer'

export default defineConfig({
  lang: 'zh-CN',
  title: 'AI 工作方式转型',
  description: '面向普通员工的 AI 工作方式公开文档',
  cleanUrls: true,
  lastUpdated: true,
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '仓库', link: repoUrl }
    ],
    socialLinks: [
      { icon: 'github', link: repoUrl }
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
