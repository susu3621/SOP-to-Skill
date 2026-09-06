---
name: personal-information-flow-project-management
description: Read and update live Brain requests, plans, and todos; use for numbered development requests and status readback.
---

# Brain·项目管理 API

## Request workflow

Resolve helpers relative to this skill directory, not the repository root. Set `PERSONAL_SYS_TOKEN` in the environment; `PERSONAL_SYS_URL` defaults to `https://personal.junslan.com`. HTTP is accepted only for explicitly configured localhost / 127.0.0.1 / [::1] test servers. TLS verification stays enabled; redirects are returned as errors.

- When the route or contract is uncertain, run `./pif_openapi.sh '<jq filter>'` for the relevant routes. Reuse an already verified contract within the task; do not repeatedly dump the full spec.
- Call `./pif_request.sh METHOD /api/path [JSON_BODY]`. Run it from this skill directory or use its full path. `JSON_BODY` may be `@/path/to/body.json` to keep private payloads out of command arguments.
- Live responses are authoritative. If a schema is incomplete, inspect the related GET response before writing the smallest justified payload. Read the exact target back after a write.
- Actual token permissions are server-owned. Possession of a token does not authorize unrelated mutations. Token/credential management is explicit-only; preserve task scope and prior authorization without asking again for routine steps.
- Treat 401 as an authentication failure and 403 as an authorization/business-rule failure. Report API errors as errors, not empty data. Keep credentials out of logs and artifacts.

## Numbered development requests

1. Read the live request collection, select each requested ID exactly, and verify project ownership and eligible status. Preserve the user's order.
2. Finish one request through the implementation, relevant tests, local commit, deployment/device acceptance and readback required by the task. A request ID does not add push or deployment authority; existing authorization remains valid.
3. If the current request is genuinely blocked, report the evidence and stop the batch. Do not skip it or mark investigation alone complete.
4. Only after the required delivery is complete, send `PUT /api/projects/requests/<id>` with `{"status":"dev_done"}`. Reread the collection (normally `.data[]`), select the exact ID and verify status before continuing.
5. Leave final `done` to the user. Keep unrelated fields unchanged.

## Route selection

- Feedback and execution review: `/api/projects*`
- Annual plans and todos: `/api/annual-plans*` and `/api/todos*`
- Progress counters: `/api/pending-counts`

For additional request shapes and response semantics, consult [references/api-usage.md](references/api-usage.md) only when needed.
