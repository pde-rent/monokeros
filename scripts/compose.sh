#!/usr/bin/env sh
# OCI-generic compose wrapper. Detects podman-compose or docker compose.
# Usage: ./scripts/compose.sh up -d
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if command -v podman-compose >/dev/null 2>&1; then
  exec podman-compose -f "$ROOT/docker-compose.yml" "$@"
elif command -v podman >/dev/null 2>&1 && podman compose version >/dev/null 2>&1; then
  exec podman compose -f "$ROOT/docker-compose.yml" "$@"
elif command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  exec docker compose -f "$ROOT/docker-compose.yml" "$@"
elif command -v docker-compose >/dev/null 2>&1; then
  exec docker-compose -f "$ROOT/docker-compose.yml" "$@"
else
  echo "Error: no compose tool found (tried podman-compose, podman compose, docker compose, docker-compose)" >&2
  exit 1
fi
