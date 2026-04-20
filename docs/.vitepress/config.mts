import { defineConfig } from 'vitepress'

const [repoOwner = 'susu3621', repoSlug = 'SOP-to-Skill'] = (
  process.env.GITHUB_REPOSITORY ?? 'susu3621/SOP-to-Skill'
).split('/')
const repoUrl = `https://github.com/${repoOwner}/${repoSlug}`
const docsBase = process.env.NODE_ENV === 'production' ? `/${repoSlug}/` : '/'

export default defineConfig({
  lang: 'zh-CN',
  title: 'AI 工作方式转型',
  description: '面向普通员工的 AI 工作方式公开文档',
  base: docsBase,
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
