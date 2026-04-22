# 8D Report Template Assets

This directory owns the repository-side template assets for the `eight-d-report-preparation` business use case.

- `templates/8d-report.docx` is the default 8D Word template shipped with the business workflow.
- `examples/8d-report.sample.json` is sample structured data for validation and rendering checks.
- `document-template` is the renderer and validator; it does not own these business assets.

New business workflows that need repository-owned templates should follow the same layout:

```text
skills/use-cases/<use-case-directory>/
```
