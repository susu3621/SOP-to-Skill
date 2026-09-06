# Brain·项目管理 API Usage

## Service Defaults

- Base URL: `https://personal.junslan.com`
- Live OpenAPI: `https://personal.junslan.com/api/openapi.json`
- Token env var: `PERSONAL_SYS_TOKEN`
- Optional base URL override: `PERSONAL_SYS_URL`

Use `PERSONAL_SYS_URL` only when deliberately overriding the default deployment for testing.

## Authentication Rules

- Send `Authorization: Bearer <token>` on every `/api/*` request.
- The token flow only applies to `/api` and `/api/...` paths.
- Token permissions are enforced by the server; possession of a token does not authorize unrelated operations. Read before mutating when the target record is not obvious.
- Use token-management routes only when explicitly requested and permitted by the server.
- Treat the live OpenAPI document as route-level guidance; request and response schemas may be thin or missing.
- When a schema is missing or thin, inspect related `GET` responses before writing.
- Treat `401` as a token problem first and `403` as a true authorization or business-rule failure.
- Prefer path-prefix exploration over keyword guessing.
- Read current server state before writes when the payload or record identity is uncertain.
- Trust the live OpenAPI over static text when they differ.

## OpenAPI Characteristics

- The OpenAPI JSON is generated from Flask routes at runtime.
- The spec reliably includes paths, methods, summaries, path parameters, and a small response set.
- The spec may omit request body schemas and detailed response schemas.
- Tags are derived from the first path segment after `/api/`, so related endpoints usually cluster by that first segment.
- Newer nested resources usually show up in the spec even when their request payload details stay thin.

## Capability Areas

- `/api/projects*` for feedback intake and review.
- `/api/annual-plans*` and `/api/todos*` for plan tracking and task execution.
- `/api/pending-counts` for progress counters.

## Known Request Shape

`GET /api/projects/requests` is the primary read path for tracking feedback progress.

- Query filters: `project_id`, `status`, `type`, `type_tag`
- Use it to list a user's current feedback queue or inspect the status of one project before updating anything
- Response items typically include `id`, `type`, `type_tag`, `status`, `description`, `project_id`, `project_name`, `created_at`, `updated_at`, and `due_at`

The live OpenAPI for `POST /api/projects/requests` includes an explicit request body schema:

```json
{
  "type": "Improvement",
  "type_tag": "后端",
  "description": "改进移动端反馈提交流程",
  "page_url": "https://example.test/feedback",
  "project_id": 12,
  "due_at": "2026-04-05T09:15:00+08:00"
}
```

- Required: `type`, `description`
- `type` enum: `Feature`, `Bug`, `Refactor`, `Improvement`
- `type_tag` enum: `UI`, `后端`, `数据库`, `运维`, `文档`
- Optional: `type_tag`, `page_url`, `project_id`, `due_at`
- `due_at` expects ISO 8601 date-time input
- Status changes usually flow through `PUT /api/projects/requests/{feedback_id}` with a `status` field after discovering the target via `GET /api/projects/requests`
- For completed development work, send `{"status":"dev_done"}` and leave the final `done` transition to the user
- Success response: `{"success": true, "id": 123}`

## Practical Exploration Pattern

1. When the route contract is uncertain, inspect the relevant spec with `./pif_openapi.sh '<jq_filter>'`.
2. Narrow to project-management routes first when the service area is broad.
3. Inspect the live spec for the path and method you need.
4. Read current records with `./pif_request.sh GET ...` before mutating.
5. For nested resources, discover the parent record IDs first.

## Response and Error Handling

- `401` usually means the token is missing or wrong.
- `403` usually means the route rejected the operation even though the token is valid.
- Non-2xx responses still print the response body; inspect it before retrying.
- The helper scripts pretty-print JSON when possible, making server error payloads easier to inspect.
- `404` on a nested route usually means the parent or child ID is wrong, not that the feature is unavailable.
- `400` on prompt, token, or batch-trigger routes often means the body shape or prerequisite state is wrong; inspect the paired `GET` route first when one exists.

## Conventions for Agents

- Prefer `/api/openapi.json` and `/api/*` over HTML pages.
- Prefer `GET` discovery before `POST`, `PUT`, `PATCH`, or `DELETE`.
- Prefer path-prefix filtering in OpenAPI before free-text route guessing.
- Preserve server-managed fields unless the endpoint clearly expects them.
- For nested resources, discover the parent record IDs first and then operate on child routes.
- For paired `GET`/`POST` config or prompt routes, read the current value before overwriting it.
- For read-state routes such as `mark-read`, `mark-all-read`, `toggle-star`, `ignore`, or `lock`, confirm the task really wants state mutation.
- Avoid sensitive token-management routes unless the task explicitly involves token management or token rotation.
- If the live spec is too thin for a write call, infer from related read responses and task context instead of inventing broad payloads.
- Use the smallest valid payload you can justify from the live spec and current state.

## Request Dependencies

- `depends_on_id` on request creation and update identifies one prerequisite request,
  including requests in another project. Omit it to preserve the current value;
  send `null` to remove the dependency.
- The service rejects missing IDs, self-dependencies, and transitive cycles.
- `GET /api/projects/{project_id}/requests/dependency-graph` returns `nodes`,
  `edges` (`source` depends on `target`), and `isolated_count`. The graph includes
  connected cross-project chains across all versions and statuses. Isolated
  requests are counted but omitted from the graph.
