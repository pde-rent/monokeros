export enum ZeroClawStatus {
  STOPPED = 'stopped',
  PENDING = 'pending',
  PROVISIONING = 'provisioning',
  STARTING = 'starting',
  RUNNING = 'running',
  STOPPING = 'stopping',
  DRAINING = 'draining',
  ERROR = 'error',
}

export interface AgentRuntime {
  memberId: string;
  socketPath: string | null;
  pid: number | null;
  status: ZeroClawStatus;
  lastHealthCheck: string | null;
  error?: string;
  retryCount: number;
  nextRetryAt: string | null;
  lifecycle: 'active' | 'standby' | 'dormant';
}

// ── Daemon streaming event types ────────────────────────────────────────────

export type DaemonEvent =
  | { type: 'status'; data: { phase: string } }
  | { type: 'tool_start'; data: { id: string; name: string; args?: Record<string, string> } }
  | { type: 'tool_end'; data: { id: string; name: string; durationMs: number } }
  | { type: 'content'; data: { text: string } }
  | { type: 'done'; data: { response: string } }
  | { type: 'error'; data: { message: string } };
