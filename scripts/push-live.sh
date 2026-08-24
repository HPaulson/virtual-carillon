#!/usr/bin/env bash

# Validate, commit, push, and deploy the Home Assistant integration to the live host.

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

BRANCH="$(git -C "$ROOT_DIR" branch --show-current)"
COMMIT_MESSAGE="${1:-Update Virtual Carillon}"
LOCAL_ARCHIVE="$(mktemp -t virtual-carillon-ha.XXXXXX.tar.gz)"
REMOTE_ARCHIVE="/tmp/virtual-carillon-ha-$$.tar.gz"

cleanup() {
  rm -f "$LOCAL_ARCHIVE"
  ssh "$REMOTE_HOST" "rm -f '$REMOTE_ARCHIVE'" >/dev/null 2>&1 || true
}
trap cleanup EXIT

cd "$ROOT_DIR"

echo "==> Typechecking"
pnpm typecheck

echo "==> Preparing commit"
git add -A -- . ':(exclude)**/__pycache__/**'
if ! git diff --cached --quiet; then
  echo "==> Committing changes"
  git commit -m "$COMMIT_MESSAGE"
else
  echo "==> No local changes to commit"
fi

echo "==> Pushing $BRANCH to GitHub"
git push origin "$BRANCH"

echo "==> Copying the complete Home Assistant integration to $REMOTE_HOST"
COPYFILE_DISABLE=1 tar \
  --exclude='._*' \
  --exclude='*/._*' \
  --exclude='virtual_carillon/__pycache__' \
  --exclude='virtual_carillon/**/*.pyc' \
  -czf "$LOCAL_ARCHIVE" \
  -C "$ROOT_DIR/homeassistant/custom_components" \
  virtual_carillon
scp "$LOCAL_ARCHIVE" "$REMOTE_HOST:$REMOTE_ARCHIVE"
ssh "$REMOTE_HOST" "docker cp '$REMOTE_ARCHIVE' '$HA_CONTAINER:/tmp/virtual-carillon-ha.tar.gz'"
ssh "$REMOTE_HOST" "docker exec '$HA_CONTAINER' tar --extract --gzip --no-same-owner --no-same-permissions --file=/tmp/virtual-carillon-ha.tar.gz --directory=/config/custom_components"
ssh "$REMOTE_HOST" "docker exec '$HA_CONTAINER' rm -f /tmp/virtual-carillon-ha.tar.gz"

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
