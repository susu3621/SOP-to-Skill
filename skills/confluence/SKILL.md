---
name: confluence
description: Use when listing Confluence spaces, reading Confluence content, searching Confluence, downloading pages to Markdown, converting Markdown to Confluence Wiki Markup, creating pages from Markdown, or rendering Mermaid diagrams for documentation.
---
# Confluence Skill

Use this skill for Confluence workflows including reading and writing. It supports space listing, keyword search, date-based search, page retrieval, page download, page creation from Markdown, format conversion, and Mermaid rendering.

## Quick Decision Matrix

| Task                                 | Tool                                    | Notes                                                             |
| ------------------------------------ | --------------------------------------- | ----------------------------------------------------------------- |
| List Confluence spaces               | `scripts/list_confluence_spaces.py`   | Use before building department-to-space mappings                  |
| Search Confluence by keyword or date | `scripts/search_confluence.py`        | Standard CLI for keyword, created-date, and updated-date searches |
| Search Confluence with raw CQL       | MCP read tools                          | Use `confluence_search` for direct CQL queries                  |
| Inspect page hierarchy               | MCP read tools                          | Use `confluence_get_page_children`                              |
| Inspect labels/comments              | MCP read tools                          | Use `confluence_get_labels`, `confluence_get_comments`        |
| Verify direct login                  | `scripts/test_connection.py`    | Uses env vars only                                                |
| Download pages to Markdown           | `scripts/download_confluence.py`      | Handles attachments and child pages                               |
| **Create page from Markdown**        | `scripts/create_confluence_page.py`   | Converts Markdown to Wiki Markup and creates page                 |
| **Update existing page**             | `scripts/create_confluence_page.py`   | Use `--update` flag to update existing pages                      |
| Search pages from CLI                | `scripts/search_confluence.py`        | Calls the read-only search API                                    |
| Convert Markdown to Wiki Markup      | `scripts/convert_markdown_to_wiki.py` | Local conversion only                                             |
| Render Mermaid diagrams              | `scripts/render_mermaid.py`           | Produces PNG/SVG/PDF locally                                      |

## Required Environment

- `python3`
- Python packages from `scripts/requirements.txt`
- Confluence credentials discoverable via `scripts/confluence_auth.py`
- Supported config sources: `CONFLUENCE_*` environment variables, `.env`, `.env.confluence`, `.env.jira`, `.env.atlassian`, parent directories, or `--env-file`
- Optional: Atlassian MCP server for search and read-only page inspection
- Optional for Mermaid rendering: Node.js plus `@mermaid-js/mermaid-cli`

Check before running script workflows:

```bash
python3 --version
python3 -m pip --version
```

If you need Mermaid rendering, also verify:

```bash
npx -y @mermaid-js/mermaid-cli -h
```

## Missing Environment Handling

1. If `python3`, `pip`, `npx`, or another required executable is missing, stop and summarize exactly which tools are unavailable.
2. If a required tool is missing, ask the user for confirmation before installing anything.
3. After the user confirms, install the missing dependency automatically with the machine's package manager or `python3 -m pip install -r {{script_dir}}/requirements.txt`.
4. Re-run the environment checks and `python3 {{script_dir}}/test_connection.py` before continuing with search, download, or page-write commands.

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

### Create Page from Markdown

Create a new Confluence page from a Markdown file:

```bash
# Basic usage - title defaults to filename
python3 $REPO_ROOT/.agents/skills/confluence/scripts/create_confluence_page.py \
    --file input.md \
    --space "~username"

# Specify custom title
python3 $REPO_ROOT/.agents/skills/confluence/scripts/create_confluence_page.py \
    --file input.md \
    --space "~username" \
    --title "My Custom Title"

# Create as child of another page
python3 $REPO_ROOT/.agents/skills/confluence/scripts/create_confluence_page.py \
    --file input.md \
    --space "DEV" \
    --title "Child Page" \
    --parent-id 123456789

# Update an existing page by ID (recommended)
python3 $REPO_ROOT/.agents/skills/confluence/scripts/create_confluence_page.py \
    --file input.md \
    --page-id 123456789

# Update an existing page by title (will auto-update if exists)
python3 $REPO_ROOT/.agents/skills/confluence/scripts/create_confluence_page.py \
    --file input.md \
    --space "~username" \
    --title "Existing Page"

# Create with agent signature in version comment
python3 $REPO_ROOT/.agents/skills/confluence/scripts/create_confluence_page.py \
    --file input.md \
    --space "~username" \
    --title "My Page" \
    --auto-agent-comment

# Preview Wiki Markup without creating page
python3 $REPO_ROOT/.agents/skills/confluence/scripts/create_confluence_page.py \
    --file input.md \
    --space "~username" \
    --dry-run
```

**Options:**
- `--file, -f`: Path to Markdown file (required)
- `--space, -s`: Confluence space key (required for new pages)
- `--title, -t`: Page title (defaults to filename)
- `--page-id, -i`: Page ID to update (alternative to --space + --title)
- `--parent-id, -p`: Parent page ID for nested pages
- `--auto-agent-comment`: Add "Co-Authored-By-Agent" to version comment
- `--dry-run`: Preview Wiki Markup without creating page
- `--env-file, -e`: Custom .env file for credentials

### Verify Login Outside MCP

```bash
python3 $REPO_ROOT/.agents/skills/confluence/scripts/test_connection.py
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
| `scripts/test_connection.py`    | Minimal direct login probe                                   |
| `scripts/download_confluence.py`      | Download pages to Markdown                                   |
| `scripts/search_confluence.py`        | Search by keyword, created date, and updated date            |
| `scripts/create_confluence_page.py`   | Create or update pages from Markdown files                   |
| `scripts/convert_markdown_to_wiki.py` | Convert Markdown to Confluence Wiki Markup                   |
| `scripts/render_mermaid.py`           | Render Mermaid diagrams locally                              |
| `scripts/confluence_auth.py`          | Shared credential discovery for all scripts                  |

## Reference Docs

| Guide                                   | Purpose                                        |
| --------------------------------------- | ---------------------------------------------- |
| `references/conversion_guide.md`      | Markdown and Wiki Markup conversion guidance   |
| `references/wiki_markup_guide.md`     | Wiki Markup syntax reference                   |
| `references/troubleshooting_guide.md` | Read-only troubleshooting and auth diagnostics |
