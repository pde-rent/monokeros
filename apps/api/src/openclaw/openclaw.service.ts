import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { MockStore } from '../store/mock-store';
import { AgentRuntime, ZeroClawStatus } from '@monokeros/types';
import type { DaemonEvent } from '@monokeros/types';
import { DEFAULT_ZAI_BASE_URL, DEFAULT_ZAI_MODEL, LLM_TIMEOUT_MS } from '@monokeros/constants';
import { buildSoulMd, buildAgentsMd, buildToolsMd, buildUserMd } from './openclaw.templates';
import { buildOpenClawConfig } from './openclaw.config';
import { join, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
import { KNOWLEDGE_DIR } from '@monokeros/constants';
import { now } from '@monokeros/utils';
import { getDataDir } from '../common/data-dir';

@Injectable()
export class OpenClawService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(OpenClawService.name);
  private readonly runtimes = new Map<string, AgentRuntime>();
  private readonly dataDir = getDataDir();

  /** URL of the OpenClaw gateway (running in Docker or locally) */
  private readonly gatewayUrl: string;
  /** Bearer token for authenticating with the gateway */
  private readonly gatewayToken: string;

  constructor(private store: MockStore) {
    mkdirSync(this.dataDir, { recursive: true });
    this.gatewayUrl = process.env.OPENCLAW_GATEWAY_URL || 'http://127.0.0.1:18789';
    this.gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN || '';
  }

  async onModuleInit() {
    this.log.log('Initializing OpenClaw agent integration...');

    // Provision workspace files for all agents
    const agents = this.store.getAgentMembers();
    for (const agent of agents) {
      await this.provision(agent.id);
    }

    // Generate and write openclaw.json config
    await this.writeGatewayConfig();

    // Mark all agents as running (gateway manages lifecycle)
    for (const agent of agents) {
      this.runtimes.set(agent.id, {
        memberId: agent.id,
        socketPath: null,
        pid: null,
        status: ZeroClawStatus.RUNNING,
        lastHealthCheck: now(),
        retryCount: 0,
        nextRetryAt: null,
        lifecycle: 'active',
      });
    }

    // Verify gateway health
    try {
      await this.healthCheck();
      this.log.log(`OpenClaw gateway connected at ${this.gatewayUrl}`);
    } catch {
      this.log.warn(`OpenClaw gateway not reachable at ${this.gatewayUrl} — agents will start when gateway is available`);
      for (const rt of this.runtimes.values()) {
        rt.status = ZeroClawStatus.PENDING;
      }
    }

    this.log.log(`Provisioned ${agents.length} agents for OpenClaw`);
  }

  async onModuleDestroy() {
    // Gateway lifecycle is managed by Docker, nothing to stop
    this.log.log('OpenClaw service shutting down');
  }

  /** Resolve the effective AI provider config for an agent */
  private resolveProvider(agentId: string): { baseUrl: string; model: string; apiKey: string } {
    const member = this.store.members.get(agentId);
    if (!member) throw new Error(`Member ${agentId} not found`);

    const workspace = this.store.workspaces.get(member.workspaceId)
      ?? [...this.store.workspaces.values()][0];

    const agentProviderId = member.modelConfig?.providerId ?? workspace?.defaultProviderId;
    const wsProvider = agentProviderId
      ? workspace?.providers.find((p) => p.provider === agentProviderId)
      : workspace?.providers[0];

    return {
      baseUrl: wsProvider?.baseUrl || process.env.ZAI_BASE_URL || DEFAULT_ZAI_BASE_URL,
      model: member.modelConfig?.model ?? wsProvider?.defaultModel ?? process.env.ZAI_MODEL ?? DEFAULT_ZAI_MODEL,
      apiKey: member.modelConfig?.apiKeyOverride ?? wsProvider?.apiKey ?? process.env.ZAI_API_KEY ?? '',
    };
  }

  /** Write the openclaw.json gateway config file */
  private async writeGatewayConfig(): Promise<void> {
    const agents = this.store.getAgentMembers();
    const workspace = [...this.store.workspaces.values()][0];
    if (!workspace) return;

    const provider = this.resolveProvider(agents[0]?.id ?? '');

    const config = buildOpenClawConfig(agents, workspace, {
      dataDir: this.dataDir,
      model: provider.model,
      baseUrl: provider.baseUrl,
      apiKeyEnv: 'ZAI_API_KEY',
      telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
      enableWhatsApp: process.env.ENABLE_WHATSAPP === 'true',
      mcpCommand: 'bun',
      mcpArgs: ['run', resolve(__dirname, '../../../packages/mcp/src/index.ts')],
      mcpEnv: {
        MONOKEROS_API_KEY: process.env.MK_API_KEY || 'mk_dev_system',
        MONOKEROS_WORKSPACE: workspace.slug,
        MONOKEROS_API_URL: process.env.MONOKEROS_API_URL || 'http://localhost:3001',
      },
    });

    const configPath = process.env.OPENCLAW_CONFIG_PATH
      || join(this.dataDir, '..', 'openclaw.json');
    await Bun.write(configPath, JSON.stringify(config, null, 2));
  }

  /** Provision workspace files for a single agent */
  async provision(agentId: string): Promise<void> {
    const member = this.store.members.get(agentId);
    if (!member) throw new Error(`Member ${agentId} not found`);
    if (member.type !== 'agent') throw new Error(`Member ${agentId} is not an agent`);

    const dir = join(this.dataDir, agentId);
    const wsDir = join(dir, 'workspace');

    mkdirSync(join(dir, 'memory'), { recursive: true });
    mkdirSync(wsDir, { recursive: true });
    mkdirSync(join(dir, KNOWLEDGE_DIR), { recursive: true });
    mkdirSync(join(dir, 'sessions'), { recursive: true });

    const allTeams = [...this.store.teams.values()];
    const allMembers = [...this.store.members.values()];
    const workspace = this.store.workspaces.get(member.workspaceId)
      ?? [...this.store.workspaces.values()][0];

    await Promise.all([
      Bun.write(join(wsDir, 'SOUL.md'), buildSoulMd(member)),
      Bun.write(join(wsDir, 'AGENTS.md'), buildAgentsMd(member, allTeams, allMembers, workspace)),
      Bun.write(join(wsDir, 'TOOLS.md'), buildToolsMd(member)),
      Bun.write(join(wsDir, 'USER.md'), buildUserMd()),
    ]);
  }

  /** Check if the OpenClaw gateway is healthy */
  private async healthCheck(): Promise<boolean> {
    const res = await fetch(`${this.gatewayUrl}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  }

  /** Start (provision) a single agent — gateway manages actual runtime */
  async start(agentId: string): Promise<AgentRuntime> {
    const existing = this.runtimes.get(agentId);
    if (existing?.status === ZeroClawStatus.RUNNING) return existing;

    await this.provision(agentId);
    await this.writeGatewayConfig();

    const rt: AgentRuntime = {
      memberId: agentId,
      socketPath: null,
      pid: null,
      status: ZeroClawStatus.RUNNING,
      lastHealthCheck: now(),
      retryCount: 0,
      nextRetryAt: null,
      lifecycle: 'active',
    };
    this.runtimes.set(agentId, rt);

    this.log.log(`Agent ${agentId} provisioned for OpenClaw`);
    return rt;
  }

  /** Stop an agent — marks as stopped, gateway handles cleanup */
  async stop(agentId: string): Promise<void> {
    const rt = this.runtimes.get(agentId);
    if (rt) {
      rt.status = ZeroClawStatus.STOPPED;
      rt.pid = null;
    }
  }

  /** Restart an agent */
  async restart(agentId: string): Promise<AgentRuntime> {
    await this.stop(agentId);
    return this.start(agentId);
  }

  /** Start all agents */
  async startAll(): Promise<AgentRuntime[]> {
    const ids = this.store.getAgentMembers().map((m) => m.id);
    const results = await Promise.allSettled(ids.map((id) => this.start(id)));
    return results
      .filter((r): r is PromiseFulfilledResult<AgentRuntime> => r.status === 'fulfilled')
      .map((r) => r.value);
  }

  /** Stop all agents */
  async stopAll(): Promise<void> {
    await Promise.all([...this.runtimes.keys()].map((id) => this.stop(id)));
  }

  /**
   * Send a message to an agent via OpenClaw's OpenAI-compatible API.
   * Returns the complete response text.
   */
  async sendMessage(agentId: string, message: string, conversationId?: string, adminContext?: boolean): Promise<string> {
    let fullResponse = '';
    for await (const event of this.streamMessage(agentId, message, conversationId, adminContext)) {
      if (event.type === 'done') {
        fullResponse = event.data.response;
      }
    }
    return fullResponse;
  }

  /**
   * Stream a message to an agent via OpenClaw's /v1/chat/completions endpoint.
   * Parses SSE events and yields DaemonEvent objects matching the existing interface.
   */
  async *streamMessage(
    agentId: string,
    message: string,
    conversationId?: string,
    adminContext?: boolean,
  ): AsyncGenerator<DaemonEvent> {
    const rt = this.runtimes.get(agentId);
    if (!rt || (rt.status !== ZeroClawStatus.RUNNING && rt.status !== ZeroClawStatus.PENDING)) {
      throw new Error(`Agent ${agentId} is not running`);
    }

    // Build system prompt context
    const member = this.store.members.get(agentId);
    const systemPrompt = member
      ? `You are ${member.name}, ${member.title}. ${member.specialization}. Respond helpfully using Markdown.`
      : 'You are a helpful assistant.';

    // Resolve AI provider for this agent
    const provider = this.resolveProvider(agentId);

    // Use the AI provider directly (same approach as daemon, but centralized)
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(conversationId ? this.getConversationHistory(conversationId) : []),
      { role: 'user', content: message },
    ];

    yield { type: 'status', data: { phase: 'thinking' } };

    const res = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model: provider.model,
        messages,
        stream: true,
        ...(adminContext && { metadata: { admin_context: true } }),
      }),
      signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
    });

    if (!res.ok) {
      const errText = await res.text();
      yield { type: 'error', data: { message: `LLM API error ${res.status}: ${errText}` } };
      return;
    }

    if (!res.body) {
      yield { type: 'error', data: { message: 'No response body from LLM API' } };
      return;
    }

    // Parse SSE stream
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let accumulated = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const data = trimmed.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data) as {
            choices?: Array<{
              delta?: {
                content?: string;
                tool_calls?: Array<{
                  index: number;
                  id?: string;
                  function?: { name?: string; arguments?: string };
                }>;
              };
              finish_reason?: string | null;
            }>;
          };

          const choice = parsed.choices?.[0];
          if (!choice) continue;

          // Handle tool calls in streaming format
          if (choice.delta?.tool_calls) {
            for (const tc of choice.delta.tool_calls) {
              if (tc.id && tc.function?.name) {
                yield {
                  type: 'tool_start',
                  data: {
                    id: tc.id,
                    name: tc.function.name,
                    args: undefined,
                  },
                };
              }
            }
          }

          // Handle content chunks
          if (choice.delta?.content) {
            accumulated += choice.delta.content;
            yield { type: 'content', data: { text: accumulated } };
          }

          // Handle tool call completion
          if (choice.finish_reason === 'tool_calls') {
            // Tool execution happens server-side in OpenClaw
            yield { type: 'status', data: { phase: 'reflecting' } };
          }
        } catch {
          // Skip malformed SSE data
        }
      }
    }

    // Emit final done event
    yield { type: 'done', data: { response: accumulated } };
  }

  /** Get conversation history in OpenAI message format */
  private getConversationHistory(conversationId: string): Array<{ role: string; content: string }> {
    const messages = this.store.getMessagesByConversation(conversationId, 50);
    return messages.map((m) => ({
      role: m.role === 'agent' ? 'assistant' : 'user',
      content: m.content,
    }));
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
