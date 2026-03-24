# Confluence Read-Only Skill for Claude Code

This repository provides a read-only Confluence skill set. It is intended for space listing, keyword search, created-date search, updated-date search, page inspection, downloading pages to Markdown, converting Markdown to Confluence Wiki Markup, and rendering Mermaid diagrams locally.

## Features

- Search Confluence from a standard CLI by keyword or date
- List Confluence spaces from a standard CLI for later department mapping
- Search Confluence with read-only MCP tools and raw CQL
- Download Confluence pages to Markdown with attachments
- Verify direct login outside MCP
- Convert Markdown to Confluence Wiki Markup
- Render Mermaid diagrams to PNG, SVG, or PDF

## Installation

Install Python dependencies:

```bash
cd /path/to/confluence-skill
python3 -m pip install -r scripts/requirements.txt
```

Optional Mermaid CLI:

```bash
npm install -g @mermaid-js/mermaid-cli
```

## Credential Sources

Script-based access supports:

- `CONFLUENCE_*` environment variables
- `.env`
- `.env.confluence`
- `.env.jira`
- `.env.atlassian`
- parent-directory discovery of the same files
- `--env-file /path/to/.env` for an explicit override

If you use a project-local `.env`, you do not need to `export` the variables manually.

Direct environment variables are still supported:

```bash
export CONFLUENCE_URL="https://your-instance.atlassian.net"
export CONFLUENCE_USERNAME="your.email@example.com"
export CONFLUENCE_PASSWORD="your-password-or-api-token"
```

`CONFLUENCE_PASSWORD` may contain an API token. The shared auth helper also accepts `CONFLUENCE_API_TOKEN`.

## Quick Start

### 1. Verify direct login

```bash
python3 scripts/test_confluence_login.py
```

### 2. Search by keyword

```bash
python3 scripts/search_confluence.py --keyword "authentication"
python3 scripts/search_confluence.py --env-file .env --keyword "authentication"
```

### 3. List spaces

```bash
python3 scripts/list_confluence_spaces.py
python3 scripts/list_confluence_spaces.py --type global --status current --json
python3 scripts/list_confluence_spaces.py --env-file /path/to/.env
```

### 4. Search by created date

```bash
python3 scripts/search_confluence.py --created-after 2026-03-01 --created-before 2026-03-10
```

### 5. Search by updated date

```bash
python3 scripts/search_confluence.py --updated-after 2026-03-01 --updated-before 2026-03-10
```

### 6. Download a page

```bash
python3 scripts/download_confluence.py 123456789
```

### 7. Download a page tree

```bash
python3 scripts/download_confluence.py --download-children 123456789
```

### 8. Convert Markdown to Wiki Markup

```bash
python3 scripts/convert_markdown_to_wiki.py examples/sample-confluence-page.md /tmp/sample.wiki
```

### 9. Render Mermaid

```bash
python3 scripts/render_mermaid.py -c 'graph TD; A-->B' /tmp/diagram.png
```

## Read-Only MCP Usage

Typical read-only operations:

```javascript
mcp__atlassian-evinova__confluence_search({
  query: 'space = "DEV" AND text ~ "api"',
  limit: 10
})

mcp__atlassian-evinova__confluence_search({
  query: 'type = page AND created >= "2026-03-01" AND created <= "2026-03-10"',
  limit: 10
})

mcp__atlassian-evinova__confluence_search({
  query: 'type = page AND lastmodified >= "2026-03-01" AND lastmodified <= "2026-03-10"',
  limit: 10
})

mcp__atlassian-evinova__confluence_get_page({
  page_id: "123456789"
})
```

Use these MCP tools for inspection only:

- `confluence_search`
- `confluence_get_page`
- `confluence_get_page_children`
- `confluence_get_labels`
- `confluence_get_comments`

## Repository Layout

```text
scripts/
  confluence_auth.py
  convert_markdown_to_wiki.py
  download_confluence.py
  list_confluence_spaces.py
  render_mermaid.py
  search_confluence.py
  requirements.txt
  test_confluence_login.py

examples/
  page_ids.example.txt
  sample-confluence-page.md

references/
  conversion_guide.md
  troubleshooting_guide.md
  wiki_markup_guide.md
```

## Notes

- Self-hosted Confluence instances may not use a `/wiki` context path. The downloader and login probe now handle both self-hosted and Atlassian Cloud URL layouts.
- `scripts/list_confluence_spaces.py` supports plain-text output for review, `--json` output for later department-to-space mapping, automatic `.env` discovery, and `--env-file` to force a specific credential file.
- `scripts/search_confluence.py` uses the same shared `.env` discovery chain and also supports `--env-file`.
- `scripts/download_confluence.py` supports direct environment variables and optional `--env-file`.
- `scripts/render_mermaid.py` is local-only; it does not upload diagrams anywhere.
