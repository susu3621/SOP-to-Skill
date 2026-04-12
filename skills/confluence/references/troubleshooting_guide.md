# Troubleshooting Guide

This guide covers read-only Confluence workflows: login diagnostics, page download, conversion, and Mermaid rendering.

## Authentication Fails

Check these variables first:

```bash
echo "$CONFLUENCE_URL"
echo "$CONFLUENCE_USERNAME"
echo "$CONFLUENCE_PASSWORD"
```

Then run:

```bash
python3 scripts/test_connection.py
```

If the login probe succeeds but another script fails, compare the exact API URL being used.

## Wrong Base URL or `/wiki` Path

Atlassian Cloud often uses `/wiki`. Self-hosted Confluence often does not.

Examples:

- Cloud: `https://example.atlassian.net/wiki/rest/api/...`
- Self-hosted: `http://wiki.example.com/rest/api/...`

If you see a 404 with an HTML page instead of JSON, verify the script is calling the correct base path.

## Downloader Cannot Find Credentials

`scripts/download_confluence.py` accepts:

- direct environment variables
- `--env-file /path/to/file`
- discovered `.env` variants through `scripts/confluence_auth.py`

If you rely on live shell variables, do not pass a missing `--env-file`.

## Missing Python Dependencies

Install required packages:

```bash
python3 -m pip install -r scripts/requirements.txt
```

## Page Download Fails

Common causes:

- wrong page ID
- insufficient read permission
- incorrect Confluence base URL
- self-hosted instance using a different context path than expected

Use the smallest reproducible test first:

```bash
python3 scripts/download_confluence.py PAGE_ID
```

Then add options like `--download-children` or `--save-html`.

## Mermaid Rendering Fails

Check Mermaid CLI:

```bash
mmdc --version
```

If `mmdc` is missing:

```bash
npm install -g @mermaid-js/mermaid-cli
```

If rendering still fails, validate the Mermaid syntax in a minimal example before rendering a full Markdown file.

## Markdown Conversion Looks Wrong

Use a smaller sample first:

```bash
python3 scripts/convert_markdown_to_wiki.py examples/sample-confluence-page.md
```

Then compare the output against the reference guides in:

- `references/conversion_guide.md`
- `references/wiki_markup_guide.md`
