import type { Member, Workspace } from '@monokeros/types';

export interface OpenClawAgentConfig {
  id: string;
  agentDir: string;
  workspace: string;
}

export interface OpenClawConfig {
  agents: {
    defaults: {
      model: string;
      provider: string;
    };
    list: OpenClawAgentConfig[];
  };
  providers: Record<string, {
    kind: string;
    baseUrl: string;
    apiKeyEnv: string;
    models: string[];
  }>;
  channels: {
    telegram?: { enabled: boolean; botToken: string };
    whatsapp?: { enabled: boolean };
  };
  tools: {
    mcp: {
      servers: Record<string, {
        command: string;
        args: string[];
        env: Record<string, string>;
      }>;
    };
  };
  gateway: {
    http: {
      bind: string;
      port: number;
      endpoints: {
        chatCompletions: { enabled: boolean };
      };
    };
  };
  session: {
    dmScope: string;
    reset: { mode: string; atHour: number };
  };
}

/** Build the full openclaw.json configuration for a workspace */
export function buildOpenClawConfig(
  agents: Member[],
  workspace: Workspace,
  opts: {
    dataDir: string;
    model: string;
    baseUrl: string;
    apiKeyEnv: string;
    telegramBotToken?: string;
    enableWhatsApp?: boolean;
    mcpCommand: string;
    mcpArgs: string[];
    mcpEnv: Record<string, string>;
  },
): OpenClawConfig {
  const agentList: OpenClawAgentConfig[] = agents.map((m) => ({
    id: m.id,
    agentDir: `${opts.dataDir}/${m.id}`,
    workspace: `${opts.dataDir}/${m.id}/workspace`,
  }));

  return {
    agents: {
      defaults: {
        model: opts.model,
        provider: 'monokeros',
      },
      list: agentList,
    },
    providers: {
      monokeros: {
        kind: 'openai',
        baseUrl: opts.baseUrl,
        apiKeyEnv: opts.apiKeyEnv,
        models: [opts.model],
      },
    },
    channels: {
      ...(opts.telegramBotToken && {
        telegram: { enabled: true, botToken: opts.telegramBotToken },
      }),
      ...(opts.enableWhatsApp && {
        whatsapp: { enabled: true },
      }),
    },
    tools: {
      mcp: {
        servers: {
          monokeros: {
            command: opts.mcpCommand,
            args: opts.mcpArgs,
            env: opts.mcpEnv,
          },
        },
      },
    },
    gateway: {
      http: {
        bind: '0.0.0.0',
        port: 18789,
        endpoints: {
          chatCompletions: { enabled: true },
        },
      },
    },
    session: {
      dmScope: 'per-channel-peer',
      reset: { mode: 'daily', atHour: 4 },
    },
  };
}
