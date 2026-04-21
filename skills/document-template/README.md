# Document Template Skill

This packaged skill provides a reusable document-output layer for business workflows such as 8D reports and ISO9001 evidence packs.

The intended flow is:

1. A business skill produces structured JSON.
2. This skill validates the JSON against a `.docx` template.
3. This skill renders a `.docx` file.
4. If needed, this skill converts the `.docx` to `.pdf`.

## Local Development

Install dependencies inside the skill package:

```bash
npm install --prefix skills/document-template
```

Run the validation script:

```bash
node skills/document-template/scripts/validate_doc_template.js \
  --template skills/document-template/templates/8d-report.docx \
  --data skills/document-template/examples/8d-report.sample.json
```

Run the render script:

```bash
node skills/document-template/scripts/render_doc_template.js \
  --template skills/document-template/templates/8d-report.docx \
  --data skills/document-template/examples/8d-report.sample.json \
  --output /tmp/8d-report.docx
```

## Installing LibreOffice For PDF Output

PDF export depends on `libreoffice` or `soffice`.

macOS:

```bash
brew install --cask libreoffice
```

Windows:

```powershell
winget search LibreOffice
winget install --id TheDocumentFoundation.LibreOffice -e
```

## Repository Layout

```text
document-template/
  SKILL.md
  README.md
  package.json
  scripts/
  templates/
  examples/
```
