---
name: confluence
description: Use when listing Confluence spaces, reading Confluence content, searching Confluence, downloading pages to Markdown, converting Markdown to Confluence Wiki Markup, or rendering Mermaid diagrams for documentation.
---
# Confluence Read-Only Skill

Use this skill for read-only Confluence workflows. It supports space listing, keyword search, created-date search, updated-date search, page retrieval, page download, format conversion, and Mermaid rendering.

## Quick Decision Matrix

| Task                                 | Tool                                    | Notes                                                             |
| ------------------------------------ | --------------------------------------- | ----------------------------------------------------------------- |
| List Confluence spaces               | `scripts/list_confluence_spaces.py`   | Use before building department-to-space mappings                  |
| Search Confluence by keyword or date | `scripts/search_confluence.py`        | Standard CLI for keyword, created-date, and updated-date searches |
| Search Confluence with raw CQL       | MCP read tools                          | Use `confluence_search` for direct CQL queries                  |
| Inspect page hierarchy               | MCP read tools                          | Use `confluence_get_page_children`                              |
| Inspect labels/comments              | MCP read tools                          | Use `confluence_get_labels`, `confluence_get_comments`        |
| Verify direct login                  | `scripts/test_confluence_login.py`    | Uses env vars only                                                |
| Download pages to Markdown           | `scripts/download_confluence.py`      | Handles attachments and child pages                               |
| Search pages from CLI                | `scripts/search_confluence.py`        | Calls the read-only search API                                    |
| Convert Markdown to Wiki Markup      | `scripts/convert_markdown_to_wiki.py` | Local conversion only                                             |
| Render Mermaid diagrams              | `scripts/render_mermaid.py`           | Produces PNG/SVG/PDF locally                                      |

## Prerequisites

- Optional: Atlassian MCP server for search and read-only page inspection
- Required for script-based access:
  - Confluence credentials discoverable via `scripts/confluence_auth.py`
  - Supported sources: `CONFLUENCE_*` environment variables, `.env`, `.env.confluence`, `.env.jira`, `.env.atlassian`, parent directories, or `--env-file`
- Python dependencies from `scripts/requirements.txt`
- Optional for Mermaid rendering: `@mermaid-js/mermaid-cli`

## Core Workflows

### List Confluence Spaces

Use the dedicated space-listing script when you need the canonical set of space keys and names:

```bash
python3 $REPO_ROOT/.agents/skills/confluence/scripts/list_confluence_spaces.py
python3 $REPO_ROOT/.agents/skills/confluence/scripts/list_confluence_spaces.py --limit 100
python3 $REPO_ROOT/.agents/skills/confluence/scripts/list_confluence_spaces.py --type global --status current --json
python3 $REPO_ROOT/.agents/skills/confluence/scripts/list_confluence_spaces.py --env-file /path/to/.env
```

Use `--json` when you want machine-readable output for later department mapping.
By default the script auto-discovers credentials from `.env` variants through `scripts/confluence_auth.py`, so project-local usage does not require manual `export`.
Use `--env-file` when the current shell may contain stale `CONFLUENCE_*` variables and you want to force a project-local credential file.

### Search Confluence

Use the standard search script for common search modes:

```bash
python3 $REPO_ROOT/.agents/skills/confluence/scripts/search_confluence.py --keyword "authentication"
python3 $REPO_ROOT/.agents/skills/confluence/scripts/search_confluence.py --created-after 2026-03-01 --created-before 2026-03-10
python3 $REPO_ROOT/.agents/skills/confluence/scripts/search_confluence.py --updated-after 2026-03-01 --updated-before 2026-03-10
python3 $REPO_ROOT/.agents/skills/confluence/scripts/search_confluence.py --keyword "auth" --updated-after 2026-03-01 --space DEV
python3 $REPO_ROOT/.agents/skills/confluence/scripts/search_confluence.py --env-file /path/to/.env --keyword "auth"
```

Use read-only MCP tools when you want direct CQL control:

```javascript
mcp__atlassian-evinova__confluence_search({
  query: 'space = "DEV" AND text ~ "authentication"',
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
```

### Download Pages to Markdown

```bash
python3 $REPO_ROOT/.agents/skills/confluence/scripts/download_confluence.py 123456789
python3 $REPO_ROOT/.agents/skills/confluence/scripts/download_confluence.py --download-children 123456789
python3 $REPO_ROOT/.agents/skills/confluence/scripts/download_confluence.py --output-dir ./docs 123456789
```

### Verify Login Outside MCP

```bash
python3 $REPO_ROOT/.agents/skills/confluence/scripts/test_confluence_login.py
```

### Convert Markdown to Wiki Markup

```bash
python3 $REPO_ROOT/.agents/skills/confluence/scripts/convert_markdown_to_wiki.py input.md output.wiki
```

### Render Mermaid Diagrams

```bash
python3 $REPO_ROOT/.agents/skills/confluence/scripts/render_mermaid.py diagram.mmd output.png
python3 $REPO_ROOT/.agents/skills/confluence/scripts/render_mermaid.py notes.md --extract-from-markdown --output-dir ./diagrams
```

## Read-Only MCP Tools

| Tool                             | Description                    |
| -------------------------------- | ------------------------------ |
| `confluence_search`            | Search pages using CQL or text |
| `confluence_get_page`          | Retrieve a page by ID or title |
| `confluence_get_page_children` | Get child pages for a page     |
| `confluence_get_labels`        | Read page labels               |
| `confluence_get_comments`      | Read page comments             |

## Utility Scripts

| Script                                  | Purpose                                                      |
| --------------------------------------- | ------------------------------------------------------------ |
| `scripts/list_confluence_spaces.py`   | List Confluence spaces with optional filters and JSON output |
| `scripts/test_confluence_login.py`    | Minimal direct login probe                                   |
| `scripts/download_confluence.py`      | Download pages to Markdown                                   |
| `scripts/search_confluence.py`        | Search by keyword, created date, and updated date            |
| `scripts/convert_markdown_to_wiki.py` | Convert Markdown to Confluence Wiki Markup                   |
| `scripts/render_mermaid.py`           | Render Mermaid diagrams locally                              |
| `scripts/confluence_auth.py`          | Shared credential discovery for read-only scripts            |

## Reference Docs

| Guide                                   | Purpose                                        |
| --------------------------------------- | ---------------------------------------------- |
| `references/conversion_guide.md`      | Markdown and Wiki Markup conversion guidance   |
| `references/wiki_markup_guide.md`     | Wiki Markup syntax reference                   |
| `references/troubleshooting_guide.md` | Read-only troubleshooting and auth diagnostics |
