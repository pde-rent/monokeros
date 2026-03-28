/**
 * Container runtime detection.
 *
 * Probes for Podman first (preferred — daemonless, rootless), then falls back
 * to Docker. The detected runtime is exported as a singleton so every module
 * uses the same socket and host-gateway value.
 *
 * Detection order:
 *   1. CONTAINER_SOCKET or DOCKER_HOST env  → use directly
 *   2. CONTAINER_RUNTIME=podman|docker env  → skip the other
 *   3. Auto-detect: probe Podman sockets, then Docker socket
 */

import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// ── Types ────────────────────────────────────────────────────────────────────

export type RuntimeName = "podman" | "docker" | "apple-containers";

export interface ContainerRuntime {
  /** "podman" or "docker" */
  name: RuntimeName;
  /** Full socket URL, e.g. "unix:///run/podman/podman.sock" or a TCP URL */
  socket: string;
  /** Just the file path (for unix sockets) */
  socketPath: string;
  /** CLI binary name: "podman" or "docker" */
  buildCommand: string;
  /** Compose invocation, e.g. ["podman", "compose"] */
  composeCommand: string[];
  /** DNS name that resolves to the host from inside a container */
  hostGateway: string;
}

// ── Socket candidates ────────────────────────────────────────────────────────

const XDG = process.env.XDG_RUNTIME_DIR;
const HOME = homedir();

const PODMAN_CANDIDATES: string[] = [
  ...(XDG ? [join(XDG, "podman/podman.sock")] : []),
  join(HOME, ".local/share/containers/podman/machine/podman.sock"),
  "/run/podman/podman.sock",
];

const APPLE_CONTAINERS_CANDIDATES: string[] =
  process.platform === "darwin"
    ? [
        join(HOME, "Library/Containers/com.apple.container.runtime/Data/socket"),
      ]
    : [];

const DOCKER_CANDIDATES: string[] = ["/var/run/docker.sock"];

// ── Helpers ──────────────────────────────────────────────────────────────────

function firstExisting(paths: string[]): string | null {
  for (const p of paths) {
    if (existsSync(p)) return p;
  }
  return null;
}

function buildRuntime(name: RuntimeName, socketPath: string): ContainerRuntime {
  const hostGateway =
    name === "podman" || name === "apple-containers"
      ? "host.containers.internal"
      : "host.docker.internal";

  // Apple Containers uses the Docker CLI interface
  const buildCommand = name === "apple-containers" ? "docker" : name;
  const composeCommand = name === "apple-containers" ? ["docker", "compose"] : [name, "compose"];

  return {
    name,
    socket: `unix://${socketPath}`,
    socketPath,
    buildCommand,
    composeCommand,
    hostGateway,
  };
}

// ── Detection ────────────────────────────────────────────────────────────────

function detect(): ContainerRuntime {
  // 1. Explicit socket override
  const explicitSocket =
    process.env.CONTAINER_SOCKET ?? process.env.DOCKER_HOST;
  if (explicitSocket) {
    // Infer runtime name from the path or fall back to env hint
    const hint = process.env.CONTAINER_RUNTIME as RuntimeName | undefined;
    const name: RuntimeName =
      hint ?? (explicitSocket.includes("podman") ? "podman" : "docker");

    if (explicitSocket.startsWith("unix://")) {
      return buildRuntime(name, explicitSocket.slice(7));
    }
    // TCP or other URL — return as-is
    return {
      name,
      socket: explicitSocket,
      socketPath: explicitSocket,
      buildCommand: name,
      composeCommand: [name, "compose"],
      hostGateway:
        name === "podman"
          ? "host.containers.internal"
          : "host.docker.internal",
    };
  }

  // 2. Forced runtime via CONTAINER_RUNTIME env
  const forced = process.env.CONTAINER_RUNTIME as RuntimeName | undefined;
  if (forced === "podman") {
    const sock = firstExisting(PODMAN_CANDIDATES);
    if (sock) return buildRuntime("podman", sock);
    throw new Error(
      `CONTAINER_RUNTIME=podman but no Podman socket found. Searched: ${PODMAN_CANDIDATES.join(", ")}`,
    );
  }
  if (forced === "docker") {
    const sock = firstExisting(DOCKER_CANDIDATES);
    if (sock) return buildRuntime("docker", sock);
    throw new Error(
      `CONTAINER_RUNTIME=docker but no Docker socket found. Searched: ${DOCKER_CANDIDATES.join(", ")}`,
    );
  }

  // 3. Auto-detect — prefer Podman, then Apple Containers (macOS), then Docker
  const podmanSock = firstExisting(PODMAN_CANDIDATES);
  if (podmanSock) return buildRuntime("podman", podmanSock);

  const appleSock = firstExisting(APPLE_CONTAINERS_CANDIDATES);
  if (appleSock) return buildRuntime("apple-containers", appleSock);

  const dockerSock = firstExisting(DOCKER_CANDIDATES);
  if (dockerSock) return buildRuntime("docker", dockerSock);

  // Fallback: assume Docker socket (will fail at first API call if missing)
  console.warn(
    "[runtime] No container socket found — defaulting to /var/run/docker.sock",
  );
  return buildRuntime("docker", "/var/run/docker.sock");
}

// ── Singleton ────────────────────────────────────────────────────────────────

export const runtime: ContainerRuntime = detect();

console.log(
  `[runtime] Using ${runtime.name} (socket: ${runtime.socketPath})`,
);
