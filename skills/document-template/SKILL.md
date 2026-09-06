---
name: document-template
description: Use when a workflow needs to render a Word template from structured JSON, validate template/data compatibility, or export the rendered result to PDF.
---
# Document Template Skill

Use this skill when a business workflow needs a formal document output from:

- a `.docx` template
- structured JSON content

This skill provides two script entrypoints:

- `render_doc_template.js`
- `validate_doc_template.js`

## Required Environment

- `node`
- npm packages from `package.json`, including `docxtemplater` and `pizzip`
- Optional for PDF output: `libreoffice` or `soffice`

Check Node/npm before using the bundled scripts. Check LibreOffice only for PDF output:

```bash
node --version
npm --version
libreoffice --version
```

## LibreOffice Installation

Use the OS-appropriate method below when PDF output is required and `libreoffice` or `soffice` is missing.

### macOS

```bash
brew install --cask libreoffice
```

If `brew` is unavailable, use an already available authorized conversion path or report only the blocked PDF step; DOCX rendering can continue.

### Windows

```powershell
winget search LibreOffice
winget install --id TheDocumentFoundation.LibreOffice -e
```

If `winget` is unavailable, use an already available authorized conversion path or report only the blocked PDF step; DOCX rendering can continue.

## Missing Environment Handling

Check only dependencies needed by the requested operation. Reuse available authorized tools for equivalent reads or conversions when the bundled probe is unnecessary. A missing optional probe or renderer does not block independent work.

If a required dependency has no suitable alternative, report the exact blocked step. Install within the user's existing environment/setup authorization; ask only when installation requires additional scope. Do not install unrelated tools or substitute credentials. Verify the chosen workflow before claiming completion.

## Core Workflows

### Validate A Template And JSON Input

```bash
node {{script_dir}}/validate_doc_template.js \
  --template /path/to/template.docx \
  --data /path/to/data.json
```

Validate with PDF readiness:

```bash
node {{script_dir}}/validate_doc_template.js \
  --template /path/to/template.docx \
  --data /path/to/data.json \
  --format pdf
```

### Render DOCX

```bash
node {{script_dir}}/render_doc_template.js \
  --template /path/to/template.docx \
  --data /path/to/data.json \
  --output /tmp/output.docx
```

### Render PDF

```bash
node {{script_dir}}/render_doc_template.js \
  --template /path/to/template.docx \
  --data /path/to/data.json \
  --output /tmp/8d-report.pdf \
  --format pdf \
  --keep-docx
```

## Input Contract

- Template input must be a `.docx` file
- Structured content input must be a JSON file
- The template should use `docxtemplater` tags such as `{field}` and loops such as `{#items}{name}{/items}`

## Output Contract

Validation returns machine-readable JSON with:

- `success`
- `missingTags`
- `renderedDocx`
- `renderedPdf`
- `warnings`
- `errors`

Render returns machine-readable JSON with:

- `success`
- `docxPath`
- `pdfPath`
- `errors`

## Utility Scripts

| Script | Purpose |
| --- | --- |
| `scripts/render_doc_template.js` | Render a `.docx` template with structured JSON data |
| `scripts/validate_doc_template.js` | Validate required tags, trial-render the document, and optionally verify PDF conversion |
| `scripts/lib/render.js` | Shared docxtemplater render helper |
| `scripts/lib/inspect.js` | Shared template-tag inspection helper |
| `scripts/lib/pdf.js` | Optional LibreOffice PDF conversion helper |

## Notes

- `docxtemplater` generates `.docx`; PDF export is a separate conversion step.
- PDF export uses LibreOffice headless mode and may render differently from Microsoft Word.
- Business workflows own their repository template assets, typically under `skills/use-cases/<use-case-directory>/`.
- `{{skill_dir}}` and `{{script_dir}}` are resolved during installation so the commands point at the installed skill package.
