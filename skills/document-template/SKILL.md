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

Check before running document-template scripts:

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

If `brew` is unavailable, stop and report that Homebrew is missing instead of switching to a GUI installer.

### Windows

```powershell
winget search LibreOffice
winget install --id TheDocumentFoundation.LibreOffice -e
```

If `winget` is unavailable, stop and report that Windows Package Manager is missing instead of switching to a GUI installer.

## Missing Environment Handling

1. If `node`, `npm`, `libreoffice`, or another required executable is missing, stop and summarize exactly which tools are unavailable.
2. If a required tool is missing, ask the user for confirmation before installing anything.
3. After the user confirms, install the missing dependency automatically with the machine's package manager, the command-line LibreOffice method above, or `npm install --prefix {{skill_dir}}`.
4. Re-run the environment checks and the validation script before rendering a final document.

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
