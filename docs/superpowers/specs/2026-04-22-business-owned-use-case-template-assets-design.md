# Business-Owned Use-Case Template Assets Design

## Context

The repository currently treats `document-template` as the place that owns both:

1. generic document rendering capability
2. specific business templates such as the 8D report template

That ownership is wrong. As more business use cases adopt templates, continuing to add those templates into `document-template` would make the base skill responsible for domain assets that belong to individual business workflows.

The current code already says that 8D should use a template owned by the 8D skill, but the repository structure still keeps the actual 8D template and sample JSON under `skills/document-template/`. Runtime staging currently copies that asset from `document-template`, so the implementation does not match the intended contract.

## Goals

1. Establish a reusable repository convention for business-owned template assets.
2. Move the 8D template and example data out of `document-template` and into a business-owned location.
3. Make onboarding preview, generated `SKILL.md`, and staged skill packages resolve template assets from the business use case definition rather than from `document-template`.
4. Keep `document-template` focused on generic rendering and validation scripts.

## Non-Goals

1. Pre-build every possible business skill into a repository-installed skill package.
2. Change the install semantics of base skills listed in `skills/manifest.json`.
3. Generalize beyond file-backed template assets in this change.

## Recommended Structure

Business template assets live under:

```text
skills/use-cases/<use-case-directory>/
```

Example for 8D:

```text
skills/use-cases/eight-d-report-preparation/
├── templates/
│   └── 8d-report.docx
├── examples/
│   └── 8d-report.sample.json
└── README.md
```

This keeps:

1. `skills/<base-skill-id>/` for reusable base skills
2. `skills/use-cases/<use-case-directory>/` for business-owned assets used by generated skills

## Configuration Contract

Add an optional `templateAssets` block to use-case definitions in `src/shared/config.json`.

Example shape:

```json
{
  "templateAssets": {
    "repoDir": "skills/use-cases/eight-d-report-preparation",
    "defaultTemplatePath": "templates/8d-report.docx",
    "exampleDataPath": "examples/8d-report.sample.json",
    "rendererBaseSkillId": "document-template"
  }
}
```

Rules:

1. `templateAssets` is present only for use cases that own repository template assets.
2. `repoDir` points to the business-owned asset directory, not to a base skill directory.
3. `rendererBaseSkillId` declares which base skill performs rendering; for now this is `document-template`.
4. If `templateAssets` is absent, onboarding behaves as it does today for non-template use cases.

## Runtime Behavior

### Preview and Generated Skill Markdown

Preview and final generated `SKILL.md` use the same backend builder and the same `templateAssets` source.

For a template-backed use case:

1. If the user provides an external template link, generated content says to prefer the user template.
2. If the user does not provide an external template and the repository asset exists, generated content points to the business skill template path such as `templates/8d-report.docx`.
3. If the repository asset is declared but missing, generated content explicitly says to build the business template first, then call `document-template`.

`document-template` must no longer be described as the owner of the business template.

### Package Staging

When a generated skill package is staged:

1. If the selected use case has `templateAssets`, copy declared assets from the business-owned repo directory into the generated skill package.
2. Copy them into their relative paths under the generated package, typically `templates/...` and optionally `examples/...`.
3. Do not source business assets from `skills/document-template/`.

### Document Rendering Contract

`document-template` remains the renderer and validator:

1. `render_doc_template.js`
2. `validate_doc_template.js`
3. environment prerequisites and PDF conversion guidance

It does not own 8D or any other business template.

## 8D Migration

Move these assets:

1. `skills/document-template/templates/8d-report.docx`
2. `skills/document-template/examples/8d-report.sample.json`

To:

1. `skills/use-cases/eight-d-report-preparation/templates/8d-report.docx`
2. `skills/use-cases/eight-d-report-preparation/examples/8d-report.sample.json`

Add a short `README.md` in the 8D business asset directory that states:

1. the directory is owned by the 8D business use case
2. `document-template` is the renderer
3. new business templates should follow the same `skills/use-cases/<use-case-directory>/` convention

Update any `document-template` docs that still reference the 8D template as a bundled example.

## Implementation Plan

1. Extend shared use-case config typing to include `templateAssets`.
2. Add repository-side business asset directory for 8D and move the files.
3. Update Rust onboarding generator to resolve declared business assets and stage them into generated packages.
4. Update Node skill generator parity logic to resolve the same config and copy the same asset set.
5. Remove 8D-specific bundled asset assumptions from `document-template` docs and tests.
6. Update tests to assert business-owned paths and staged assets.

## Error Handling

If `templateAssets` is declared but the source files are missing:

1. staging should not silently fall back to `document-template`
2. generated markdown should instruct the agent to create the missing business template first
3. tests should verify that missing assets do not regress to base-skill ownership wording

## Testing

Minimum verification:

1. `npm test`
2. `cargo test --manifest-path src-tauri/Cargo.toml`
3. `npm run build`
4. targeted `document-template` Node tests if their fixtures move

Key regression assertions:

1. 8D default copy mentions a business-owned template path
2. staged 8D skill packages contain `templates/8d-report.docx`
3. the asset source path is the business-owned directory
4. `document-template` docs no longer claim that 8D is its bundled default template

## Risks

1. Existing tests may assume that `document-template` owns the 8D example assets.
2. Resolver logic must stay deterministic across Rust tests that override skill directories.
3. If future use cases add multiple asset files, the config contract must stay simple enough to extend without custom per-use-case code.

## Decision

Adopt a repository-wide convention where template assets belong to business use cases under `skills/use-cases/<use-case-directory>/`, while `document-template` remains the shared rendering capability.
