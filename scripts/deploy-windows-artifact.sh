#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 2 ] || [ "$#" -gt 3 ]; then
  echo "usage: $0 <host> <user> [executable-path]" >&2
  exit 1
fi

TARGET_HOST="$1"
TARGET_USER="$2"
EXECUTABLE_PATH="${3:-}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SSH_OPTS=(-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null)

find_latest_executable() {
  ls -t "${REPO_ROOT}"/artifacts/desktop/*/windows/*.exe 2>/dev/null | head -n 1 || true
}

if [ -z "$EXECUTABLE_PATH" ]; then
  npm --prefix "$REPO_ROOT" run build:desktop:all
  EXECUTABLE_PATH="$(find_latest_executable)"
fi

if [ -z "$EXECUTABLE_PATH" ] || [ ! -f "$EXECUTABLE_PATH" ]; then
  echo "Windows executable not found: $EXECUTABLE_PATH" >&2
  exit 1
fi

REMOTE_EXECUTABLE='skill-configurator.exe'
REMOTE_SCRIPT='install-skill-configurator.ps1'

scp "${SSH_OPTS[@]}" "$EXECUTABLE_PATH" "${TARGET_USER}@${TARGET_HOST}:${REMOTE_EXECUTABLE}"
scp "${SSH_OPTS[@]}" "${SCRIPT_DIR}/install-skill-configurator.ps1" "${TARGET_USER}@${TARGET_HOST}:${REMOTE_SCRIPT}"

ssh "${SSH_OPTS[@]}" "${TARGET_USER}@${TARGET_HOST}" \
  "powershell -NoProfile -ExecutionPolicy Bypass -File ${REMOTE_SCRIPT}"

ssh "${SSH_OPTS[@]}" "${TARGET_USER}@${TARGET_HOST}" \
  "powershell -NoProfile -Command \"Get-Process | Where-Object { \$_.Path -like '*skill-configurator.exe' -or \$_.ProcessName -eq 'skill-configurator' -or \$_.ProcessName -eq 'Skill Configurator' } | Select-Object -First 5 ProcessName,Id,Path | ConvertTo-Json -Compress\""
