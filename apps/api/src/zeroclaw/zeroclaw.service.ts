import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { MockStore } from '../store/mock-store';
import { AgentRuntime, ZeroClawStatus } from '@monokeros/types';
import type { DaemonEvent } from '@monokeros/types';
import type { ResolvedProvider } from './zeroclaw.templates';
import { HEALTH_CHECK_TIMEOUT_MS, STARTUP_TIMEOUT_MS, GRACEFUL_SHUTDOWN_MS, LLM_TIMEOUT_MS, DEFAULT_ZAI_BASE_URL, DEFAULT_ZAI_MODEL } from '@monokeros/constants';
import {
  buildConfigToml,
  buildSoulMd,
  buildIdentityMd,
  buildFoundationMd,
  buildAgentsMd,
  buildSkillsMd,
} from './zeroclaw.templates';
import { join, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
import { KNOWLEDGE_DIR } from '@monokeros/constants';
import { now } from '@monokeros/utils';
import { getDataDir } from '../common/data-dir';

@Injectable()
export class ZeroClawService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(ZeroClawService.name);
  private readonly runtimes = new Map<string, AgentRuntime>();
  private readonly procs = new Map<string, ReturnType<typeof Bun.spawn>>();
  /** Internal port map — will be removed when migrating to Unix domain sockets */
  private readonly ports = new Map<string, number>();

  /** @deprecated Will be replaced by Unix domain sockets */
  private readonly basePort = 4000;
  private readonly dataDir = getDataDir();
  private readonly daemonScript = resolve(__dirname, 'daemon.ts');
  /** Shared secret for authenticating webhook calls to daemon processes */
  private readonly webhookSecret = crypto.randomUUID();

  constructor(private store: MockStore) {
    mkdirSync(this.dataDir, { recursive: true });
  }

  async onModuleInit() {
    this.log.log('Auto-starting all agents...');
    const results = await this.startAll();
    const running = results.filter((r) => r.status === ZeroClawStatus.RUNNING).length;
    this.log.log(`Auto-start complete: ${running}/${results.length} agents running`);
  }

  async onModuleDestroy() {
    await this.stopAll();
  }

  /** Validate agentId to prevent path traversal */
  private validateAgentId(agentId: string): void {
    const dir = resolve(join(this.dataDir, agentId));
    if (!dir.startsWith(this.dataDir + '/')) {
      throw new Error(`Invalid agent ID: ${agentId}`);
    }
  }

  /** Get a deterministic port for an agent */
  private getPort(agentId: string): number {
    const ids = this.store.getAgentMembers().map((m) => m.id);
    const index = ids.indexOf(agentId);
    if (index < 0) throw new Error(`Agent ${agentId} not found in store`);
    return this.basePort + index;
  }

  /** Resolve the effective AI provider config for an agent */
  private resolveProvider(agentId: string): { resolved: ResolvedProvider; apiKey: string } {
    const member = this.store.members.get(agentId);
    if (!member) throw new Error(`Member ${agentId} not found`);

    const workspace = this.store.workspaces.get(member.workspaceId)
      ?? [...this.store.workspaces.values()][0];

    // Find workspace-level provider
    const agentProviderId = member.modelConfig?.providerId ?? workspace?.defaultProviderId;
    const wsProvider = agentProviderId
      ? workspace?.providers.find((p) => p.provider === agentProviderId)
      : workspace?.providers[0];

    const baseUrl = wsProvider?.baseUrl || process.env.ZAI_BASE_URL || DEFAULT_ZAI_BASE_URL;
    const model = member.modelConfig?.model ?? wsProvider?.defaultModel ?? process.env.ZAI_MODEL ?? DEFAULT_ZAI_MODEL;
    const apiKey = member.modelConfig?.apiKeyOverride ?? wsProvider?.apiKey ?? process.env.ZAI_API_KEY ?? '';

    // Use a unique env var name when agent has an override key
    const apiKeyEnv = member.modelConfig?.apiKeyOverride ? `AGENT_${agentId}_API_KEY` : 'ZAI_API_KEY';

    return {
      resolved: { baseUrl, model, apiKeyEnv },
      apiKey,
    };
  }

  /** Provision workspace files for an agent */
  private async provision(agentId: string): Promise<number> {
    this.validateAgentId(agentId);

    const member = this.store.members.get(agentId);
    if (!member) throw new Error(`Member ${agentId} not found in store`);
    if (member.type !== 'agent') throw new Error(`Member ${agentId} is not an agent`);

    const port = this.getPort(agentId);
    const dir = join(this.dataDir, agentId);

    mkdirSync(join(dir, 'memory'), { recursive: true });
    mkdirSync(join(dir, 'workspace'), { recursive: true });
    mkdirSync(join(dir, KNOWLEDGE_DIR), { recursive: true });

    // Gather context for templates
    const allTeams = [...this.store.teams.values()];
    const allMembers = [...this.store.members.values()];

    // Resolve workspace slug and provider for this agent
    const workspace = this.store.workspaces.get(member.workspaceId)
      ?? [...this.store.workspaces.values()][0];
    const workspaceSlug = workspace?.slug ?? 'default';
    const { resolved: resolvedProvider } = this.resolveProvider(agentId);

    await Promise.all([
      Bun.write(join(dir, 'config.toml'), buildConfigToml(member, port, workspaceSlug, resolvedProvider)),
      Bun.write(join(dir, 'SOUL.md'), buildSoulMd(member)),
      Bun.write(join(dir, 'IDENTITY.md'), buildIdentityMd(member)),
      Bun.write(join(dir, 'FOUNDATION.md'), buildFoundationMd()),
      Bun.write(join(dir, 'AGENTS.md'), buildAgentsMd(member, allTeams, allMembers, workspace)),
      Bun.write(join(dir, 'SKILLS.md'), buildSkillsMd(member)),
    ]);

    return port;
  }

  /** Start a single agent */
  async start(agentId: string): Promise<AgentRuntime> {
    const existing = this.runtimes.get(agentId);
    if (existing?.status === ZeroClawStatus.RUNNING) {
      return existing;
    }

    const port = await this.provision(agentId);
    this.ports.set(agentId, port);
    const dir = join(this.dataDir, agentId);

    const rt: AgentRuntime = {
      memberId: agentId,
      socketPath: null,
      pid: null,
      status: ZeroClawStatus.STARTING,
      lastHealthCheck: null,
      retryCount: 0,
      nextRetryAt: null,
      lifecycle: 'active',
    };
    this.runtimes.set(agentId, rt);

    // Look up agent's API key for daemon auth
    const agentKeys = this.store.getApiKeysByMember(agentId);
    const activeKey = agentKeys.find((k) => !k.revoked);
    // Dev mode: deterministic key; production: would retrieve stored raw key
    const rawApiKey = activeKey ? `mk_dev_${agentId}` : '';

    // Resolve AI provider config for this agent
    const { resolved: resolvedProvider, apiKey: resolvedAiKey } = this.resolveProvider(agentId);

    let proc: ReturnType<typeof Bun.spawn>;
    try {
      proc = Bun.spawn(['bun', 'run', this.daemonScript], {
        cwd: dir,
        env: {
          ...process.env,
          HOME: dir,
          ZAI_API_KEY: resolvedAiKey,
          ZAI_BASE_URL: resolvedProvider.baseUrl,
          ZAI_MODEL: resolvedProvider.model,
          // Set agent-specific env var if overriding
          ...(resolvedProvider.apiKeyEnv !== 'ZAI_API_KEY' && {
            [resolvedProvider.apiKeyEnv]: resolvedAiKey,
          }),
          MONOKEROS_API_KEY: rawApiKey,
          ZEROCLAW_WEBHOOK_SECRET: this.webhookSecret,
        },
        stdout: 'pipe',
        stderr: 'pipe',
      });
    } catch (err) {
      rt.status = ZeroClawStatus.ERROR;
      rt.error = `Spawn failed: ${err}`;
      this.log.error(`Failed to spawn ZeroClaw for ${agentId}: ${err}`);
      return rt;
    }

    this.procs.set(agentId, proc);
    rt.pid = proc.pid;

    // Wait for healthy (up to 15s), checking for early exit
    const deadline = Date.now() + STARTUP_TIMEOUT_MS;
    while (Date.now() < deadline) {
      // Check if process already exited
      if (proc.exitCode !== null) {
        rt.status = ZeroClawStatus.ERROR;
        rt.error = `Process exited with code ${proc.exitCode}`;
        break;
      }
      try {
        const res = await fetch(`http://127.0.0.1:${port}/health`, {
          signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
        });
        if (res.ok) {
          rt.status = ZeroClawStatus.RUNNING;
          break;
        }
      } catch {
        // not ready yet
      }
      await Bun.sleep(200);
    }

    if (rt.status !== ZeroClawStatus.RUNNING && rt.status !== ZeroClawStatus.ERROR) {
      rt.status = ZeroClawStatus.ERROR;
      rt.error = 'Health check timeout';
    }
    rt.lastHealthCheck = now();
    this.log.log(`Agent ${agentId} -> ${rt.status} on :${port}`);
    return rt;
  }

  /** Stop a single agent */
  async stop(agentId: string): Promise<void> {
    const proc = this.procs.get(agentId);
    if (proc) {
      proc.kill(15); // SIGTERM
      // Wait up to 3s for graceful exit, then force kill
      const grace = setTimeout(() => {
        try {
          proc.kill(9); // SIGKILL
        } catch {
          // already dead
        }
      }, GRACEFUL_SHUTDOWN_MS);
      // Clean up timer if process exits before timeout
      proc.exited.then(() => clearTimeout(grace)).catch(() => clearTimeout(grace));
      this.procs.delete(agentId);
    }
    const rt = this.runtimes.get(agentId);
    if (rt) {
      rt.status = ZeroClawStatus.STOPPED;
      rt.pid = null;
    }
  }

  /** Restart a single agent (stop + start) */
  async restart(agentId: string): Promise<AgentRuntime> {
    await this.stop(agentId);
    return this.start(agentId);
  }

  /** Start all agent members in parallel */
  async startAll(): Promise<AgentRuntime[]> {
    const ids = this.store.getAgentMembers().map((m) => m.id);
    const results = await Promise.allSettled(ids.map((id) => this.start(id)));
    return results
      .filter((r): r is PromiseFulfilledResult<AgentRuntime> => r.status === 'fulfilled')
      .map((r) => r.value);
  }

  /** Stop all agents */
  async stopAll(): Promise<void> {
    await Promise.all([...this.procs.keys()].map((id) => this.stop(id)));
  }

  /** Send message to agent via webhook, get complete response */
  async sendMessage(agentId: string, message: string, conversationId?: string, adminContext?: boolean): Promise<string> {
    const rt = this.runtimes.get(agentId);
    if (!rt || rt.status !== ZeroClawStatus.RUNNING) {
      throw new Error(`Agent ${agentId} is not running`);
    }

    const port = this.ports.get(agentId);
    if (!port) throw new Error(`No port for agent ${agentId}`);

    const res = await fetch(`http://127.0.0.1:${port}/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': this.webhookSecret,
      },
      body: JSON.stringify({
        message,
        conversation_id: conversationId,
        ...(adminContext && { admin_context: true }),
      }),
      signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
    });

    if (!res.ok) {
      throw new Error(`Webhook ${res.status}: ${await res.text()}`);
    }

    const data = (await res.json()) as Record<string, unknown>;
    if (typeof data.response !== 'string') {
      throw new Error(`Unexpected webhook response shape: ${JSON.stringify(data)}`);
    }
    return data.response;
  }

  /** Stream daemon events as an async generator (NDJSON from webhook) */
  async *streamMessage(agentId: string, message: string, conversationId?: string, adminContext?: boolean): AsyncGenerator<DaemonEvent> {
    const rt = this.runtimes.get(agentId);
    if (!rt || rt.status !== ZeroClawStatus.RUNNING) {
      throw new Error(`Agent ${agentId} is not running`);
    }

    const port = this.ports.get(agentId);
    if (!port) throw new Error(`No port for agent ${agentId}`);

    const res = await fetch(`http://127.0.0.1:${port}/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': this.webhookSecret,
      },
      body: JSON.stringify({
        message,
        conversation_id: conversationId,
        ...(adminContext && { admin_context: true }),
      }),
      signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
    });

    if (!res.ok) {
      throw new Error(`Webhook ${res.status}: ${await res.text()}`);
    }

    if (!res.body) {
      throw new Error('No response body from webhook');
    }

    // Parse NDJSON line by line from the streaming response
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      // Keep the last incomplete line in the buffer
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          yield JSON.parse(trimmed) as DaemonEvent;
        } catch {
          // Skip malformed lines
        }
      }
    }

    // Process any remaining buffer
    if (buffer.trim()) {
      try {
        yield JSON.parse(buffer.trim()) as DaemonEvent;
      } catch {
        // Skip
      }
    }
  }

  /** Get runtime info for an agent */
  getRuntime(agentId: string): AgentRuntime | undefined {
    return this.runtimes.get(agentId);
  }

  /** Get all runtime info */
  getAllRuntimes(): AgentRuntime[] {
    return [...this.runtimes.values()];
  }
}
