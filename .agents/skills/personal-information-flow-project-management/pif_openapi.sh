#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: ./pif_openapi.sh [jq_filter]

Fetch the live OpenAPI JSON from the Brain service.

Environment:
  PERSONAL_SYS_TOKEN                  API token
  PERSONAL_SYS_URL                    HTTPS origin override (HTTP only for localhost tests)

Examples:
  ./pif_openapi.sh
  ./pif_openapi.sh '.paths | keys'
  ./pif_openapi.sh '.paths | with_entries(select((.key|startswith("/api/projects")) or (.key|startswith("/api/annual-plans"))))'
EOF
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi
if [[ $# -gt 1 ]]; then usage >&2; exit 1; fi
skill_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# Preserve failure status and do not turn a server error into an empty jq result.
if response="$("$skill_dir/pif_request.sh" GET /api/openapi.json)"; then
  :
else
  status=$?
  printf '%s\n' "$response"
  exit "$status"
fi
if [[ -n "${1:-}" ]]; then
  printf '%s\n' "$response" | jq "$1"
else
  printf '%s\n' "$response"
fi
