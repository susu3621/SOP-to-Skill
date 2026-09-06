#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: ./pif_request.sh METHOD PATH [JSON_BODY]

Call a Brain API endpoint with Bearer token auth.

Arguments:
  METHOD     HTTP method such as GET, POST, PUT, PATCH, DELETE
  PATH       /api path, api path, or bare resource path
  JSON_BODY  Optional JSON string or @/path/to/body.json for write requests

Environment:
  PERSONAL_SYS_TOKEN                  API token
  PERSONAL_SYS_URL                    HTTPS origin override (HTTP only for localhost tests)

Examples:
  ./pif_request.sh GET /api/projects/requests
  ./pif_request.sh GET /api/todos
  ./pif_request.sh POST /api/annual-plans '{"name":"Q2"}'
EOF
}

normalize_path() {
  local raw_path="$1"
  local normalized path_part lowered
  if [[ "$raw_path" == *://* || "$raw_path" == //* || "$raw_path" == *'#'* || "$raw_path" == *$'\n'* || "$raw_path" == *$'\r'* ]]; then
    echo "Pass an /api path, not an absolute URL, fragment, or multiline value." >&2
    return 1
  fi
  normalized="/${raw_path#/}"
  case "$normalized" in
    /api|/api/*|/api\?*) ;;
    *) normalized="/api$normalized" ;;
  esac
  path_part="${normalized%%\?*}"
  lowered="$(printf '%s' "$path_part" | tr '[:upper:]' '[:lower:]')"
  case "$lowered/" in
    *'/../'*|*'/./'*|*'//'*|*'%2e'*|*'%2f'*|*'%5c'*|*'\'*|*'%25'*)
      echo "Path traversal and encoded path separators are not allowed." >&2
      return 1 ;;
  esac
  printf '%s' "$normalized"
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi
if [[ $# -lt 2 || $# -gt 3 ]]; then
  usage >&2
  exit 1
fi

token="${PERSONAL_SYS_TOKEN:-}"
if [[ -z "$token" ]]; then
  echo "Missing API token. Set PERSONAL_SYS_TOKEN." >&2
  exit 1
fi
if [[ ! "$token" =~ ^[a-zA-Z0-9._~+/-]+=*$ ]]; then
  echo "Invalid Bearer token format." >&2
  exit 1
fi
method="$(printf '%s' "$1" | tr '[:lower:]' '[:upper:]')"
case "$method" in GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS) ;; *) echo "Unsupported HTTP method." >&2; exit 1 ;; esac
path="$(normalize_path "$2")"
base_url="${PERSONAL_SYS_URL:-https://personal.junslan.com}"
base_url="${base_url%/}"
# Accept only an origin: credentials, path prefixes, query and fragments are invalid.
if [[ "$base_url" =~ ^https://([a-zA-Z0-9.-]+|\[[0-9a-fA-F:]+\])(:[0-9]+)?$ ]]; then
  :
elif [[ "$base_url" =~ ^http://(localhost|127\.0\.0\.1|\[::1\])(:[0-9]+)?$ ]]; then
  :
else
  echo "PERSONAL_SYS_URL must be an HTTPS origin; HTTP is allowed only for localhost, 127.0.0.1 or [::1] tests." >&2
  exit 1
fi
url="${base_url}${path}"
body_file="$(mktemp)"
trap 'rm -f "$body_file"' EXIT
curl_args=(--disable -sS --noproxy '*' --connect-timeout 10 --max-time 60
  -X "$method" -H 'Accept: application/json' -o "$body_file" -w '%{http_code}')
if [[ -n "${3:-}" ]]; then
  if [[ "$3" == @* ]]; then
    jq -e . "${3#@}" >/dev/null
    curl_args+=(-H 'Content-Type: application/json' --data-binary "$3")
  else
    printf '%s' "$3" | jq -e . >/dev/null
    curl_args+=(-H 'Content-Type: application/json' --data-binary "$3")
  fi
fi
# Keep the credential off curl's argv and out of temporary files. --disable ignores
# ~/.curlrc so it cannot silently add redirects, verbose logging or --insecure.
if ! status_code="$(printf 'header = "Authorization: Bearer %s"\n' "$token" | curl "${curl_args[@]}" --config - "$url")"; then
  echo "Brain API transport failed; TLS verification remains enabled." >&2
  exit 1
fi
if jq -e . "$body_file" >/dev/null 2>&1; then
  jq . "$body_file"
else
  cat "$body_file"
fi
if [[ ! "$status_code" =~ ^2[0-9][0-9]$ ]]; then
  echo "Brain API request failed with HTTP ${status_code}; redirects are not followed." >&2
  exit 1
fi
