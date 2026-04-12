# Quick Reference

## Auth Probe

```bash
python3 scripts/test_connection.py
```

## List Confluence Spaces

```bash
python3 scripts/list_confluence_spaces.py
python3 scripts/list_confluence_spaces.py --limit 100
python3 scripts/list_confluence_spaces.py --type global --status current --json
python3 scripts/list_confluence_spaces.py --env-file /path/to/.env
```

## Search Confluence

```bash
python3 scripts/search_confluence.py --keyword "authentication"
python3 scripts/search_confluence.py --created-after 2026-03-01 --created-before 2026-03-10
python3 scripts/search_confluence.py --updated-after 2026-03-01 --updated-before 2026-03-10
python3 scripts/search_confluence.py --keyword "auth" --updated-after 2026-03-01 --space DEV
python3 scripts/search_confluence.py --env-file /path/to/.env --keyword "authentication"
```

## Download Pages

```bash
python3 scripts/download_confluence.py PAGE_ID
python3 scripts/download_confluence.py --download-children PAGE_ID
python3 scripts/download_confluence.py --save-html PAGE_ID
python3 scripts/download_confluence.py --output-dir ./docs PAGE_ID
python3 scripts/download_confluence.py --page-ids-file page_ids.txt
```

## Convert Markdown to Wiki Markup

```bash
python3 scripts/convert_markdown_to_wiki.py input.md output.wiki
python3 scripts/convert_markdown_to_wiki.py input.md
```

## Render Mermaid

```bash
python3 scripts/render_mermaid.py diagram.mmd output.png
python3 scripts/render_mermaid.py -c 'graph TD; A-->B' output.svg
python3 scripts/render_mermaid.py notes.md --extract-from-markdown --output-dir ./diagrams
```

## Read-Only MCP Tools

- `confluence_search`
- `confluence_get_page`
- `confluence_get_page_children`
- `confluence_get_labels`
- `confluence_get_comments`

## Credential Sources

```bash
export CONFLUENCE_URL="https://your-instance.atlassian.net"
export CONFLUENCE_USERNAME="your.email@example.com"
export CONFLUENCE_PASSWORD="your-password-or-api-token"
```

Also supported without export:

- `.env`
- `.env.confluence`
- `.env.jira`
- `.env.atlassian`
- `--env-file /path/to/.env`
