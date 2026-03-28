#!/usr/bin/env sh
# Build MonokerOS container images using the available OCI runtime.
# Detects podman or docker automatically.
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Detect OCI engine
if command -v podman >/dev/null 2>&1; then
  ENGINE=podman
elif command -v docker >/dev/null 2>&1; then
  ENGINE=docker
else
  echo "Error: neither podman nor docker found in PATH" >&2
  exit 1
fi

echo "Using engine: $ENGINE"

echo "Building monokeros/openclaw:latest ..."
"$ENGINE" build -t monokeros/openclaw:latest "$ROOT/docker/openclaw/"

echo "Building monokeros/zeroclaw:latest ..."
"$ENGINE" build -t monokeros/zeroclaw:latest "$ROOT/docker/zeroclaw/"

echo "Building monokeros/web:latest ..."
"$ENGINE" build -t monokeros/web:latest -f "$ROOT/docker/web/Dockerfile" "$ROOT"

echo "Building monokeros/container-service:latest ..."
"$ENGINE" build -t monokeros/container-service:latest -f "$ROOT/docker/container-service/Dockerfile" "$ROOT"

echo "All images built successfully."
