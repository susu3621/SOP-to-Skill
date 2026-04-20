import { defineConfig } from 'vitepress'

const [repoOwner = 'susu3621', repoSlug = 'SOP-to-Skill'] = (
  process.env.GITHUB_REPOSITORY ?? 'susu3621/SOP-to-Skill'
).split('/')
const repoUrl = `https://github.com/${repoOwner}/${repoSlug}`
const docsBase = process.env.NODE_ENV === 'production' ? `/${repoSlug}/` : '/'

export default defineConfig({
  lang: 'zh-CN',
  title: 'AI 工作方式转型',
  description: '把公司的 SOP、模板和系统配置整理成可安装到 AI 工具里的 Skill',
  base: docsBase,
  cleanUrls: true,
  lastUpdated: true,
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '下载', link: '/download' },
      { text: '产品文档', link: '/product-docs/' },
      { text: '仓库', link: repoUrl }
    ],
    socialLinks: [
      { icon: 'github', link: repoUrl }
    ],
    outline: [2, 3],
    search: {
      provider: 'local'
    }
  }
})
