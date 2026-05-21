#!/usr/bin/env bash
# Deploy web + API: build SPA → /var/www/checkin (Caddy), rebuild/restart API (Docker).
# Does not modify Caddy — paste deploy/Caddyfile.snippet once on the VPS.
set -euo pipefail

REPO_ROOT="${CHECKIN_REPO:-${HOME}/git/checkin}"
WEB_ROOT="${CHECKIN_WEB_ROOT:-/var/www/checkin}"
COMPOSE_FILE="${CHECKIN_COMPOSE_FILE:-${REPO_ROOT}/deploy/docker-compose.yml}"

cd "${REPO_ROOT}"

if [[ ! -f deploy/docker-compose.yml ]]; then
  echo "Expected deploy/docker-compose.yml under ${REPO_ROOT}" >&2
  exit 1
fi

if [[ ! -f .env ]]; then
  echo "Missing ${REPO_ROOT}/.env (copy from .env.example)" >&2
  exit 1
fi

if [[ ! -f api-key.json ]]; then
  echo "Missing ${REPO_ROOT}/api-key.json (Google service account JSON, next to .env)" >&2
  exit 1
fi

echo "==> npm ci"
npm ci

echo "==> npm run build"
npm run build

if [[ ! -d web/dist ]]; then
  echo "Build did not produce web/dist" >&2
  exit 1
fi

echo "==> Publish static files to ${WEB_ROOT}"
mkdir -p "${WEB_ROOT}"
rsync -a --delete web/dist/ "${WEB_ROOT}/"

echo "==> Docker compose (API)"
docker compose -f "${COMPOSE_FILE}" up -d --build

echo "Done. Verify: curl -sS https://tbs.barai.se/api/health"
