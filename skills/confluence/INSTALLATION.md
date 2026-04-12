# Confluence Read-Only Skill Installation Guide

## What This Skill Includes

- Confluence search guidance for read-only MCP usage
- Page download to Markdown
- Direct login probe for troubleshooting
- Markdown to Wiki Markup conversion
- Mermaid rendering

This installation does not include Confluence write features.

## Python Dependencies

```bash
cd /path/to/confluence-skill
python3 -m pip install -r scripts/requirements.txt
```

## Optional Mermaid CLI

```bash
npm install -g @mermaid-js/mermaid-cli
```

## Verify Installation

### Check script help

```bash
python3 scripts/render_mermaid.py -h
python3 scripts/test_connection.py
```

### Check tests

```bash
pytest tests/test_confluence_login.py tests/test_download_confluence.py -v
```

## Environment Variables

```bash
export CONFLUENCE_URL="https://your-instance.atlassian.net"
export CONFLUENCE_USERNAME="your.email@example.com"
export CONFLUENCE_PASSWORD="your-password-or-api-token"
```

## Common Tasks

### Search Confluence

Use read-only MCP tools such as `confluence_search` and `confluence_get_page`.

### Download a Page

```bash
python3 scripts/download_confluence.py 123456789
```

### Convert Markdown

```bash
python3 scripts/convert_markdown_to_wiki.py examples/sample-confluence-page.md /tmp/sample.wiki
```

### Render Mermaid

```bash
python3 scripts/render_mermaid.py -c 'graph TD; A-->B' /tmp/diagram.png
```
