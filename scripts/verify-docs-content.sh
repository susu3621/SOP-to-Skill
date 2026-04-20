#!/usr/bin/env bash
set -euo pipefail

test -f docs/index.md
test -f docs/download.md
test -f docs/product-docs/index.md

grep -q "查看使用文档" docs/index.md
grep -q 'href="./product-docs/"' docs/index.md
grep -q 'href="./download"' docs/index.md
grep -q "解决什么问题" docs/index.md
grep -q "怎么开始" docs/index.md

grep -q "<h1>下载</h1>" docs/download.md
grep -q "macOS" docs/download.md
grep -q "Windows" docs/download.md

grep -q "<h1>产品文档</h1>" docs/product-docs/index.md
grep -q "快速开始" docs/product-docs/index.md
grep -q "使用流程" docs/product-docs/index.md
grep -q "FAQ" docs/product-docs/index.md
grep -q -- "--site-gutter:" docs/.vitepress/theme/custom.css
grep -q ".VPDoc:not(.has-sidebar) .container," docs/.vitepress/theme/custom.css
grep -q ".VPDoc .content-container" docs/.vitepress/theme/custom.css
grep -q "justify-content: flex-start !important;" docs/.vitepress/theme/custom.css
grep -q "max-width: var(--vp-layout-max-width) !important;" docs/.vitepress/theme/custom.css
grep -q ".VPDoc:not(.has-sidebar) .content," docs/.vitepress/theme/custom.css
grep -q "max-width: none !important;" docs/.vitepress/theme/custom.css
grep -q "grid-template-columns: minmax(0, 1.1fr) minmax(22rem, 0.9fr);" docs/.vitepress/theme/custom.css
! grep -q "max-width: 40rem;" docs/.vitepress/theme/custom.css

rm -rf docs/.vitepress/.temp docs/.vitepress/dist
npm run docs:build >/dev/null
grep -q "查看使用文档" docs/.vitepress/dist/index.html
grep -q "/product-docs/" docs/.vitepress/dist/index.html
grep -q "/download" docs/.vitepress/dist/index.html
grep -q "产品文档" docs/.vitepress/dist/product-docs/index.html
grep -q "macOS" docs/.vitepress/dist/download.html
