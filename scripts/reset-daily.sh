#!/usr/bin/env bash

# Reset the hosted Virtual Carillon hymn history for today or a supplied date.

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/dev.env}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

: "${REMOTE_HOST:?Set REMOTE_HOST in $ENV_FILE (for example, your SSH host alias)}"

if [[ $# -gt 1 ]]; then
  echo "Usage: $0 [YYYY-MM-DD]" >&2
  exit 2
fi

RESET_DATE="${1:-}"
if [[ -n "$RESET_DATE" && ! "$RESET_DATE" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
  echo "Date must use YYYY-MM-DD format." >&2
  exit 2
fi

ssh "$REMOTE_HOST" bash -s -- "$RESET_DATE" "${CARILLON_CONTAINER:-}" <<'REMOTE_SCRIPT'
set -Eeuo pipefail

reset_date="${1:-}"
container="${2:-}"

if [[ -z "$container" ]]; then
  container="$(docker ps --filter 'ancestor=virtual-carillon:latest' --filter 'status=running' --format '{{.Names}}' | head -n 1)"
fi

: "${container:?Could not find a running Virtual Carillon container; set CARILLON_CONTAINER in dev.env}"

docker exec "$container" node -e '
const date = process.argv[1] || undefined;
const body = date ? JSON.stringify({ date }) : "{}";
const token = process.env.VIRTUAL_CARILLON_API_TOKEN;

fetch("http://127.0.0.1:9876/api/hymns/reset-day", {
  method: "POST",
  headers: {
    authorization: `Bearer ${token ?? ""}`,
    "content-type": "application/json",
  },
  body,
}).then(async (response) => {
  const text = await response.text();
  console.log(`HTTP ${response.status}`);
  console.log(text);
  if (!response.ok) process.exitCode = 1;
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
' "$reset_date"
REMOTE_SCRIPT
