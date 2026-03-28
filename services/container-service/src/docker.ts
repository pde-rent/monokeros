/**
 * Container Engine API operations via Unix socket.
 * Supports both Podman (preferred) and Docker via the runtime detection module.
 * Supports both OpenClaw (desktop) and ZeroClaw (headless) agent runtimes.
 */

import { join } from "node:path";
import { provision, buildOpenClawConfig, type ProvisionData, type ProvisionProvider } from "./provision";
import { buildZeroClawConfig } from "./provision";
import { runtime } from "./runtime";
import { getRuntimeProfile, type AgentRuntimeType } from "./runtimes";

// ── Constants ─────────────────────────────────────────────────────────────────

const CONTAINER_PREFIX = "mk-agent-";
const DOCKER_NETWORK = "monokeros";
const CONTAINER_SOCKET = runtime.socket;
const DATA_DIR = process.env.DATA_DIR || join(process.cwd(), "data");
const MCP_SOURCE_PATH =
  process.env.MCP_SOURCE_PATH || join(process.cwd(), "../../packages/mcp");

// ── In-memory runtime map ─────────────────────────────────────────────────────

interface ContainerStats {
  cpuPercent: number;
  memoryMb: number;
  windows: string[];
  updatedAt: string;
}

interface AgentRuntime {
  memberId: string;
  workspaceId: string | null;
  containerId: string | null;
  containerName: string | null;
  vncPort: number | null;
  openclawPort: number | null;
  /** Internal gateway URL (works for both OpenClaw and ZeroClaw) */
  gatewayUrl: string | null;
  /** @deprecated Use `gatewayUrl` */
  openclawUrl: string | null;
  runtimeType: AgentRuntimeType;
  desktop: boolean;
  status: "running" | "stopped" | "error";
  error?: string;
  stats?: ContainerStats;
}

const runtimes = new Map<string, AgentRuntime>();

export function getRuntime(agentId: string): AgentRuntime | undefined {
  return runtimes.get(agentId);
}

/** Validate that an agent belongs to the given workspace. */
export function validateWorkspace(agentId: string, workspaceId: string): boolean {
  const rt = runtimes.get(agentId);
  if (!rt || !rt.workspaceId) return false;
  return rt.workspaceId === workspaceId;
}

// ── VNC Session Tokens ──────────────────────────────────────────────────────

interface VncSession {
  agentId: string;
  workspaceId: string;
  role: string;
  expiresAt: number;
}

const vncSessions = new Map<string, VncSession>();

/** Create a VNC session token with 5-minute TTL. Returns UUID token. */
export function createVncSession(agentId: string, workspaceId: string, role: string): string {
  if (!validateWorkspace(agentId, workspaceId)) {
    throw new Error("Workspace mismatch");
  }

  const rt = runtimes.get(agentId);
  if (rt && !rt.desktop) {
    throw new Error("Agent runtime does not support desktop access");
  }

  const token = crypto.randomUUID();
  vncSessions.set(token, {
    agentId,
    workspaceId,
    role,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });
  return token;
}

/** Validate a VNC session token. Returns session info if valid, null otherwise. */
export function validateVncSession(token: string): { agentId: string; role: string } | null {
  const session = vncSessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    vncSessions.delete(token);
    return null;
  }
  return { agentId: session.agentId, role: session.role };
}

// ── Container Engine API fetch ────────────────────────────────────────────────

async function dockerFetch(
  path: string,
  opts: { method?: string; body?: unknown; timeout?: number } = {},
): Promise<Response> {
  const { method = "GET", body, timeout = 10_000 } = opts;
  const url = CONTAINER_SOCKET.startsWith("unix://")
    ? `http://localhost${path}`
    : `${CONTAINER_SOCKET.replace(/\/$/, "")}${path}`;

  const fetchOpts: RequestInit & { unix?: string } = {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(timeout),
  };

  if (CONTAINER_SOCKET.startsWith("unix://")) {
    (fetchOpts as Record<string, unknown>).unix = CONTAINER_SOCKET.slice(7);
  }

  return fetch(url, fetchOpts);
}

// ── Network ───────────────────────────────────────────────────────────────────

async function ensureNetwork(): Promise<void> {
  try {
    const res = await dockerFetch(`/networks/${DOCKER_NETWORK}`);
    if (res.ok) return;
  } catch {
    // doesn't exist
  }

  try {
    await dockerFetch("/networks/create", {
      method: "POST",
      body: { Name: DOCKER_NETWORK, Driver: "bridge" },
    });
    console.log(`[container] Created network: ${DOCKER_NETWORK}`);
  } catch (err) {
    console.warn(`[container] Failed to create network: ${err}`);
  }
}

// ── Container lifecycle ───────────────────────────────────────────────────────

async function createAndStartContainer(
  agentId: string,
  runtimeType: AgentRuntimeType,
  desktop: boolean,
  env: Record<string, string>,
): Promise<{ containerId: string; vncPort: number; gatewayPort: number }> {
  const profile = getRuntimeProfile(runtimeType, desktop);
  const containerName = `${CONTAINER_PREFIX}${agentId}`;
  const agentDataPath = join(DATA_DIR, agentId);

  const hostConfig: Record<string, unknown> = {
    PortBindings: profile.portBindings,
    Binds: profile.binds(agentDataPath, MCP_SOURCE_PATH),
    NetworkMode: DOCKER_NETWORK,
    Memory: profile.memory,
    NanoCpus: profile.nanoCpus,
    SecurityOpt: ["no-new-privileges"],
    RestartPolicy: { Name: "unless-stopped" },
  };

  if (profile.shmSize > 0) {
    hostConfig.ShmSize = profile.shmSize;
  }
  if (Object.keys(profile.tmpfs).length > 0) {
    hostConfig.Tmpfs = profile.tmpfs;
  }

  const createRes = await dockerFetch(
    "/containers/create?name=" + containerName,
    {
      method: "POST",
      timeout: 30_000,
      body: {
        Image: profile.image,
        Env: Object.entries(env).map(([k, v]) => `${k}=${v}`),
        ExposedPorts: profile.exposedPorts,
        HostConfig: hostConfig,
        Labels: {
          "monokeros.agent": agentId,
          "monokeros.runtime": runtimeType,
        },
      },
    },
  );

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Container create failed (${createRes.status}): ${errText}`);
  }

  const { Id: containerId } = (await createRes.json()) as { Id: string };

  // Start
  const startRes = await dockerFetch(`/containers/${containerId}/start`, {
    method: "POST",
    timeout: 30_000,
  });
  if (!startRes.ok && startRes.status !== 304) {
    const errText = await startRes.text();
    throw new Error(`Container start failed (${startRes.status}): ${errText}`);
  }

  // Get mapped ports
  const inspectRes = await dockerFetch(`/containers/${containerId}/json`);
  const inspectData = (await inspectRes.json()) as {
    NetworkSettings: {
      Ports: Record<string, Array<{ HostPort: string }> | null>;
    };
  };

  // VNC port (only for OpenClaw)
  let vncPort = 0;
  if (profile.hasDesktop) {
    const vncBindings = inspectData.NetworkSettings.Ports["6080/tcp"];
    vncPort = vncBindings?.[0]?.HostPort ? parseInt(vncBindings[0].HostPort, 10) : 0;
  }

  // Gateway port
  const gatewayBindings =
    inspectData.NetworkSettings.Ports[`${profile.gatewayPort}/tcp`];
  const gatewayPort = gatewayBindings?.[0]?.HostPort
    ? parseInt(gatewayBindings[0].HostPort, 10)
    : 0;

  return { containerId, vncPort, gatewayPort };
}

async function removeContainer(containerId: string): Promise<void> {
  try {
    await dockerFetch(`/containers/${containerId}/stop`, {
      method: "POST",
      timeout: 15_000,
    });
  } catch {
    // may already be stopped
  }
  try {
    await dockerFetch(`/containers/${containerId}?force=true`, {
      method: "DELETE",
      timeout: 10_000,
    });
  } catch {
    // best effort
  }
}

// ── Container Stats ──────────────────────────────────────────────────────

async function fetchContainerStats(
  containerId: string,
): Promise<{ cpuPercent: number; memoryMb: number }> {
  try {
    const res = await dockerFetch(
      `/containers/${containerId}/stats?stream=false`,
      { timeout: 5_000 },
    );
    if (!res.ok) return { cpuPercent: 0, memoryMb: 0 };

    const data = (await res.json()) as {
      cpu_stats: {
        cpu_usage: { total_usage: number };
        system_cpu_usage: number;
        online_cpus: number;
      };
      precpu_stats: {
        cpu_usage: { total_usage: number };
        system_cpu_usage: number;
      };
      memory_stats: { usage: number; limit: number };
    };

    // CPU percentage calculation
    const cpuDelta =
      data.cpu_stats.cpu_usage.total_usage -
      data.precpu_stats.cpu_usage.total_usage;
    const systemDelta =
      data.cpu_stats.system_cpu_usage - data.precpu_stats.system_cpu_usage;
    const cpuPercent =
      systemDelta > 0
        ? Math.round(
            (cpuDelta / systemDelta) *
              (data.cpu_stats.online_cpus || 1) *
              100 *
              10,
          ) / 10
        : 0;

    const memoryMb = Math.round(data.memory_stats.usage / 1024 / 1024);

    return { cpuPercent, memoryMb };
  } catch {
    return { cpuPercent: 0, memoryMb: 0 };
  }
}

async function fetchWindowList(containerId: string, desktop: boolean): Promise<string[]> {
  // No desktop — skip window list entirely
  if (!desktop) {
    return [];
  }

  try {
    const execCreateRes = await dockerFetch(
      `/containers/${containerId}/exec`,
      {
        method: "POST",
        timeout: 5_000,
        body: {
          AttachStdout: true,
          AttachStderr: false,
          Cmd: [
            "bash",
            "-c",
            "xdotool search --onlyvisible --name '' getwindowname 2>/dev/null || true",
          ],
        },
      },
    );
    if (!execCreateRes.ok) return [];
    const { Id: execId } = (await execCreateRes.json()) as { Id: string };

    const execStartRes = await dockerFetch(`/exec/${execId}/start`, {
      method: "POST",
      timeout: 5_000,
      body: { Detach: false, Tty: false },
    });
    if (!execStartRes.ok) return [];

    const output = await execStartRes.text();
    // Docker multiplexed stream: strip 8-byte frame headers
    const lines = output
      .split("\n")
      .map((l) => l.replace(/^[\x00-\x1f]{0,8}/, "").trim())
      .filter((l) => l.length > 0 && l !== "Desktop" && l !== "tint2");
    return lines;
  } catch {
    return [];
  }
}

async function updateContainerStats(
  agentId: string,
  rt: AgentRuntime,
): Promise<void> {
  if (rt.status !== "running" || !rt.containerId) return;

  const [{ cpuPercent, memoryMb }, windows] = await Promise.all([
    fetchContainerStats(rt.containerId),
    fetchWindowList(rt.containerId, rt.desktop),
  ]);

  rt.stats = {
    cpuPercent,
    memoryMb,
    windows,
    updatedAt: new Date().toISOString(),
  };
}

let statsInterval: ReturnType<typeof setInterval> | null = null;
const CONVEX_URL = process.env.CONVEX_SITE_URL ?? "";
const MK_API_KEY = process.env.MK_API_KEY ?? "mk_dev_system";
const SNAPSHOT_EVERY_N_TICKS = 6; // 6 × 10s = 60s

export function startStatsPolling(intervalMs = 10_000): void {
  if (statsInterval) return;
  let tick = 0;
  statsInterval = setInterval(async () => {
    const entries = Array.from(runtimes.entries());
    await Promise.allSettled(
      entries.map(([id, rt]) => updateContainerStats(id, rt)),
    );

    tick++;
    if (tick % SNAPSHOT_EVERY_N_TICKS === 0) {
      syncResourceSnapshots(entries);
    }
  }, intervalMs);
  console.log(
    `[container] Stats polling started (every ${intervalMs / 1000}s)`,
  );
}

/** Fire-and-forget: batch-send resource snapshots to Convex. */
function syncResourceSnapshots(
  entries: Array<[string, AgentRuntime]>,
): void {
  if (!CONVEX_URL) return;

  const snapshots = entries
    .filter(([, rt]) => rt.status === "running" && rt.stats && rt.workspaceId)
    .map(([, rt]) => ({
      memberId: rt.memberId,
      workspaceId: rt.workspaceId!,
      cpuPercent: rt.stats!.cpuPercent,
      memoryMb: rt.stats!.memoryMb,
      windowCount: rt.stats!.windows.length,
    }));

  if (snapshots.length === 0) return;

  fetch(`${CONVEX_URL}/api/metrics/resource-snapshots`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${MK_API_KEY}`,
    },
    body: JSON.stringify({ snapshots }),
  }).catch((err) => {
    console.warn(`[container] Failed to sync resource snapshots: ${err}`);
  });
}

export function getStats(agentId: string): ContainerStats | null {
  return runtimes.get(agentId)?.stats ?? null;
}

// ── Gateway Readiness ───────────────────────────────────────────────────────

async function waitForGateway(
  url: string,
  healthEndpoint: string,
  timeoutMs = 30_000,
): Promise<boolean> {
  const start = Date.now();
  const pollMs = 1_000;

  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${url}${healthEndpoint}`, {
        signal: AbortSignal.timeout(2_000),
      });
      if (res.ok) return true;
    } catch {
      // Not ready yet
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }
  return false;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function startContainer(
  agentId: string,
  workspaceSlug?: string,
  provisionData?: ProvisionData,
  runtimeType: AgentRuntimeType = "openclaw",
  desktop?: boolean,
): Promise<AgentRuntime> {
  const existing = runtimes.get(agentId);
  if (existing?.status === "running" && existing.containerId) {
    return existing;
  }

  const resolvedDesktop = desktop ?? (runtimeType === "openclaw");
  const profile = getRuntimeProfile(runtimeType, resolvedDesktop);

  await ensureNetwork();

  // Clean up any stale container
  const containerName = `${CONTAINER_PREFIX}${agentId}`;
  try {
    const checkRes = await dockerFetch(`/containers/${containerName}/json`);
    if (checkRes.ok) {
      const data = (await checkRes.json()) as { Id: string };
      await removeContainer(data.Id);
    }
  } catch {
    // no existing container
  }

  // Provision workspace files
  await provision(agentId, DATA_DIR, provisionData, runtimeType, resolvedDesktop);

  console.log(`[container] Starting ${runtimeType} container for agent ${agentId} (desktop: ${resolvedDesktop})`);

  try {
    const env: Record<string, string> = {
      AGENT_ID: agentId,
      LLM_API_KEY: process.env.LLM_API_KEY ?? "",
      LLM_BASE_URL: process.env.LLM_BASE_URL ?? "",
      LLM_MODEL: process.env.LLM_MODEL ?? "",
      LLM_TYPE: process.env.LLM_TYPE ?? "openai_compat",
      MK_API_KEY: process.env.MK_API_KEY ?? "mk_dev_system",
      MK_WORKSPACE: workspaceSlug ?? "default",
      MONOKEROS_API_URL:
        process.env.MONOKEROS_API_URL ?? "http://container-service:3002",
      ...profile.extraEnv,
    };

    const { containerId, vncPort, gatewayPort } =
      await createAndStartContainer(agentId, runtimeType, resolvedDesktop, env);

    // When running on the host (dev mode), use localhost + mapped port.
    // Inside a container, use the container name on the bridge network.
    const isRunningInContainer = process.env.DATA_DIR === "/data";
    const gatewayUrl = isRunningInContainer
      ? `http://${containerName}:${profile.gatewayPort}`
      : `http://localhost:${gatewayPort}`;

    const rt: AgentRuntime = {
      memberId: agentId,
      workspaceId: workspaceSlug ?? null,
      containerId,
      containerName,
      vncPort: resolvedDesktop ? vncPort : null,
      openclawPort: gatewayPort,
      gatewayUrl,
      openclawUrl: gatewayUrl,
      runtimeType,
      desktop: resolvedDesktop,
      status: "running",
    };
    runtimes.set(agentId, rt);

    const portInfo = resolvedDesktop
      ? `VNC :${vncPort}, Gateway :${gatewayPort}`
      : `Gateway :${gatewayPort}`;
    console.log(
      `[container] Agent ${agentId} started (${containerId.slice(0, 12)}, ${portInfo})`,
    );

    // Wait for gateway to become ready (non-blocking)
    waitForGateway(gatewayUrl, profile.healthEndpoint).then((ready) => {
      if (ready) {
        console.log(`[container] Gateway ready for agent ${agentId} (${runtimeType})`);
      } else {
        console.warn(
          `[container] Gateway did not become ready within timeout for agent ${agentId}`,
        );
      }
    });

    return rt;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[container] Failed to start ${agentId}: ${errorMsg}`);

    const rt: AgentRuntime = {
      memberId: agentId,
      workspaceId: workspaceSlug ?? null,
      containerId: null,
      containerName: null,
      vncPort: null,
      openclawPort: null,
      gatewayUrl: null,
      openclawUrl: null,
      runtimeType,
      desktop: resolvedDesktop,
      status: "error",
      error: errorMsg,
    };
    runtimes.set(agentId, rt);
    return rt;
  }
}

export async function stopContainer(agentId: string): Promise<void> {
  const rt = runtimes.get(agentId);
  if (rt?.containerId) {
    console.log(`[container] Stopping container for agent ${agentId}`);
    await removeContainer(rt.containerId);
  }

  runtimes.set(agentId, {
    memberId: agentId,
    workspaceId: rt?.workspaceId ?? null,
    containerId: null,
    containerName: null,
    vncPort: null,
    openclawPort: null,
    gatewayUrl: null,
    openclawUrl: null,
    runtimeType: rt?.runtimeType ?? "openclaw",
    desktop: rt?.desktop ?? true,
    status: "stopped",
  });
}

export async function restartContainer(
  agentId: string,
  workspaceSlug?: string,
  provisionData?: ProvisionData,
  runtimeType?: AgentRuntimeType,
  desktop?: boolean,
): Promise<AgentRuntime> {
  const existing = runtimes.get(agentId);
  const resolvedType = runtimeType ?? existing?.runtimeType ?? "openclaw";
  const resolvedDesktop = desktop ?? existing?.desktop;
  await stopContainer(agentId);
  return startContainer(agentId, workspaceSlug, provisionData, resolvedType, resolvedDesktop);
}

/**
 * Update the model config for a running agent without restarting the container.
 * Writes a new config file and touches a .reload flag file that the entrypoint
 * monitors — the gateway restarts within ~2s with the updated config.
 */
export async function updateModel(
  agentId: string,
  provider: ProvisionProvider,
  workspaceSlug: string,
  runtimeType?: AgentRuntimeType,
): Promise<{ ok: boolean }> {
  const rt = runtimes.get(agentId);
  if (!rt || rt.status !== "running") {
    throw new Error(`Agent ${agentId} is not running`);
  }

  const resolvedType = runtimeType ?? rt.runtimeType;
  const agentDir = join(DATA_DIR, agentId);

  if (resolvedType === "zeroclaw") {
    const config = buildZeroClawConfig(agentId, provider, workspaceSlug);
    await Bun.write(join(agentDir, "config.toml"), config);
  } else {
    const config = buildOpenClawConfig(agentId, provider, workspaceSlug);
    await Bun.write(join(agentDir, "openclaw.json"), JSON.stringify(config, null, 2));
  }

  await Bun.write(join(agentDir, ".reload"), "1");

  console.log(
    `[container] Model updated for agent ${agentId}: ${provider.providerId}/${provider.model} (${resolvedType})`,
  );

  return { ok: true };
}

export async function healthCheck(
  agentId: string,
): Promise<{ healthy: boolean; status: string }> {
  const rt = runtimes.get(agentId);
  if (!rt || !rt.containerId) {
    return { healthy: false, status: rt?.status ?? "unknown" };
  }

  // Check container is running via engine API
  try {
    const res = await dockerFetch(`/containers/${rt.containerId}/json`);
    if (!res.ok) return { healthy: false, status: rt.status };
    const data = (await res.json()) as { State: { Running: boolean } };
    return { healthy: data.State.Running, status: rt.status };
  } catch {
    return { healthy: false, status: rt.status };
  }
}

export async function getDesktop(
  agentId: string,
): Promise<{ vncPort: number | null; status: string; hasDesktop: boolean }> {
  const rt = runtimes.get(agentId);
  return {
    vncPort: rt?.vncPort ?? null,
    status: rt?.status ?? "stopped",
    hasDesktop: rt?.desktop ?? false,
  };
}

/** Get runtime capabilities for an agent. */
export function getCapabilities(agentId: string): { hasDesktop: boolean; runtimeType: AgentRuntimeType } | null {
  const rt = runtimes.get(agentId);
  if (!rt) return null;
  return {
    hasDesktop: rt.desktop,
    runtimeType: rt.runtimeType,
  };
}
