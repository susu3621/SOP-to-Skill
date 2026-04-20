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

rm -rf docs/.vitepress/.temp docs/.vitepress/dist
npm run docs:build >/dev/null
grep -q "查看使用文档" docs/.vitepress/dist/index.html
grep -q "/product-docs/" docs/.vitepress/dist/index.html
grep -q "/download" docs/.vitepress/dist/index.html
grep -q "产品文档" docs/.vitepress/dist/product-docs/index.html
grep -q "macOS" docs/.vitepress/dist/download.html
