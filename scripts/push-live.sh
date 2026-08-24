#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REMOTE_HOST="${REMOTE_HOST:-your-ssh-host}"
HA_COMPONENT_PARENT="${HA_COMPONENT_PARENT:-/path/to/homeassistant/custom_components}"
HA_CONTAINER="${HA_CONTAINER:-home-assistant-container}"
BRANCH="$(git -C "$ROOT_DIR" branch --show-current)"
COMMIT_MESSAGE="${1:-Update Virtual Carillon}"

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
ssh "$REMOTE_HOST" "test -d '$HA_COMPONENT_PARENT'"
tar \
  --exclude='virtual_carillon/__pycache__' \
  --exclude='virtual_carillon/**/*.pyc' \
  -czf - \
  -C "$ROOT_DIR/homeassistant/custom_components" \
  virtual_carillon \
  | ssh "$REMOTE_HOST" "tar --extract --gzip --no-same-owner --no-same-permissions --file=- --directory='$HA_COMPONENT_PARENT'"

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
