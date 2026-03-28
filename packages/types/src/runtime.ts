import type { AgentRuntimeType } from "./enums";

export enum ZeroClawStatus {
  STOPPED = "stopped",
  RUNNING = "running",
  ERROR = "error",
}

export interface AgentRuntime {
  memberId: string;
  /** Docker container ID (null if not yet spawned) */
  containerId: string | null;
  /** Container name on the Docker network */
  containerName: string | null;
  /** Host port mapped to the container's noVNC port (6080) */
  vncPort: number | null;
  /** Internal gateway API URL reachable from the API server */
  gatewayUrl: string | null;
  /** @deprecated Use `gatewayUrl` instead */
  openclawUrl: string | null;
  /** Runtime type: "openclaw" (desktop) or "zeroclaw" (headless) */
  runtimeType: AgentRuntimeType;
  status: ZeroClawStatus;
  lastHealthCheck: string | null;
  error?: string;
  retryCount: number;
  nextRetryAt: string | null;
  lifecycle: "active" | "standby" | "dormant";
}

// ── Agent streaming event types ─────────────────────────────────────────────

export type DaemonEvent =
  | { type: "status"; data: { phase: string } }
  | { type: "tool_start"; data: { id: string; name: string; args?: Record<string, string> } }
  | { type: "tool_end"; data: { id: string; name: string; durationMs: number } }
  | { type: "content"; data: { delta: string } }
  | { type: "usage"; data: { promptTokens: number; completionTokens: number; totalTokens: number; model?: string } }
  | { type: "done"; data: { response?: string } }
  | { type: "error"; data: { message: string } };
