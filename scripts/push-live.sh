#!/usr/bin/env bash

# Validate and deploy the current working tree to the live host.

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
: "${HA_CONTAINER:?Set HA_CONTAINER in $ENV_FILE (your Home Assistant container name)}"

LOCAL_ARCHIVE="$(mktemp -t virtual-carillon-ha.XXXXXX.tar.gz)"
ENGINE_ARCHIVE="$(mktemp -t virtual-carillon-engine.XXXXXX.tar.gz)"
REMOTE_ARCHIVE="/tmp/virtual-carillon-ha-$$.tar.gz"
REMOTE_ENGINE_ARCHIVE="/tmp/virtual-carillon-engine-$$.tar.gz"
REMOTE_ENGINE_DIR="/tmp/virtual-carillon-engine-$$"

cleanup() {
  rm -f "$LOCAL_ARCHIVE" "$ENGINE_ARCHIVE"
  ssh "$REMOTE_HOST" "rm -f '$REMOTE_ARCHIVE' '$REMOTE_ENGINE_ARCHIVE'; rm -rf '$REMOTE_ENGINE_DIR'" >/dev/null 2>&1 || true
}
trap cleanup EXIT

cd "$ROOT_DIR"

echo "==> Typechecking"
pnpm typecheck

echo "==> Copying the complete Home Assistant integration to $REMOTE_HOST"
COPYFILE_DISABLE=1 tar \
  --no-xattrs \
  --no-acls \
  --no-fflags \
  --exclude='._*' \
  --exclude='*/._*' \
  --exclude='virtual_carillon/__pycache__' \
  --exclude='virtual_carillon/**/*.pyc' \
  -czf "$LOCAL_ARCHIVE" \
  -C "$ROOT_DIR/homeassistant/integration" \
  virtual_carillon
scp "$LOCAL_ARCHIVE" "$REMOTE_HOST:$REMOTE_ARCHIVE"
ssh "$REMOTE_HOST" "docker cp '$REMOTE_ARCHIVE' '$HA_CONTAINER:/tmp/virtual-carillon-ha.tar.gz'"
ssh "$REMOTE_HOST" "docker exec '$HA_CONTAINER' tar --extract --gzip --no-same-owner --no-same-permissions --file=/tmp/virtual-carillon-ha.tar.gz --directory=/config/custom_components"
ssh "$REMOTE_HOST" "docker exec '$HA_CONTAINER' rm -f /tmp/virtual-carillon-ha.tar.gz"

echo "==> Building the current engine source archive"
COPYFILE_DISABLE=1 tar \
  --no-xattrs \
  --no-acls \
  --no-fflags \
  --exclude='._*' \
  --exclude='*/._*' \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.data' \
  --exclude='*.sqlite' \
  --exclude='*.sqlite-shm' \
  --exclude='*.sqlite-wal' \
  -czf "$ENGINE_ARCHIVE" \
  -C "$ROOT_DIR" \
  Dockerfile package.json pnpm-lock.yaml tsconfig.json eslint.config.mjs .prettierrc.json scripts engine homeassistant README.md LICENSE
scp "$ENGINE_ARCHIVE" "$REMOTE_HOST:$REMOTE_ENGINE_ARCHIVE"

echo "==> Rebuilding and restarting the Virtual Carillon engine"
printf -v REMOTE_ENGINE_COMMAND 'HA_CONTAINER_ARG=%q CARILLON_CONTAINER_ARG=%q CARILLON_COMPOSE_DIR_ARG=%q CARILLON_COMPOSE_FILE_ARG=%q REMOTE_ENGINE_ARCHIVE_ARG=%q REMOTE_ENGINE_DIR_ARG=%q bash -s' \
  "$HA_CONTAINER" "${CARILLON_CONTAINER:-}" "${CARILLON_COMPOSE_DIR:-}" "${CARILLON_COMPOSE_FILE:-}" "$REMOTE_ENGINE_ARCHIVE" "$REMOTE_ENGINE_DIR"
ssh "$REMOTE_HOST" "$REMOTE_ENGINE_COMMAND" <<'REMOTE_ENGINE_SCRIPT'
set -Eeuo pipefail

archive="$REMOTE_ENGINE_ARCHIVE_ARG"
build_dir="$REMOTE_ENGINE_DIR_ARG"
container="${CARILLON_CONTAINER_ARG:-}"
compose_dir="${CARILLON_COMPOSE_DIR_ARG:-}"
compose_file="${CARILLON_COMPOSE_FILE_ARG:-}"

if [[ -z "$container" ]]; then
  container="$(docker ps --filter 'label=com.docker.compose.service=virtual-carillon' --filter 'status=running' --format '{{.Names}}' | head -n 1)"
fi
if [[ -z "$container" ]]; then
  container="$(docker ps --filter 'ancestor=virtual-carillon:latest' --filter 'status=running' --format '{{.Names}}' | head -n 1)"
fi

if [[ -n "$container" ]]; then
  labels="$(docker inspect "$container" --format '{{json .Config.Labels}}')"
  if [[ -z "$compose_dir" ]]; then
    compose_dir="$(docker inspect "$container" --format '{{index .Config.Labels "com.docker.compose.project.working_dir"}}')"
  fi
  if [[ -z "$compose_file" ]]; then
    compose_file="$(docker inspect "$container" --format '{{index .Config.Labels "com.docker.compose.project.config_files"}}')"
  fi
else
  labels="{}"
fi

if [[ -z "$compose_dir" || -z "$compose_file" ]]; then
  echo "Could not find the engine Compose project. Set CARILLON_CONTAINER, CARILLON_COMPOSE_DIR, and CARILLON_COMPOSE_FILE in dev.env." >&2
  echo "Detected Docker labels: $labels" >&2
  exit 1
fi

mkdir -p "$build_dir"
tar --extract --gzip --no-same-owner --no-same-permissions --file="$archive" --directory="$build_dir"
echo "Building image on remote host from $build_dir"
docker build --tag virtual-carillon:latest "$build_dir"
echo "Restarting Compose service virtual-carillon"
docker compose --project-directory "$compose_dir" --file "$compose_file" up --detach --no-build --force-recreate virtual-carillon
rm -f "$archive"
rm -rf "$build_dir"
REMOTE_ENGINE_SCRIPT

echo "==> Restarting Home Assistant"
ssh "$REMOTE_HOST" "docker restart '$HA_CONTAINER' >/dev/null"

echo "==> Waiting for Home Assistant to become healthy"
for _ in {1..30}; do
  health="$(ssh "$REMOTE_HOST" "docker inspect '$HA_CONTAINER' --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}unknown{{end}}'" 2>/dev/null || true)"
  if [[ "$health" == "healthy" ]]; then
    echo "Home Assistant is healthy."
    exit 0
  fi
  sleep 2
done

echo "Home Assistant did not report healthy within 60 seconds." >&2
ssh "$REMOTE_HOST" "docker ps -a --filter name='$HA_CONTAINER' --format '{{.Names}} {{.Status}}'" || true
exit 1
