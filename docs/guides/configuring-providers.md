# Configuring AI Providers

MonokerOS connects to LLM providers through the OpenAI-compatible `/chat/completions` API. Any provider that implements this endpoint works out of the box.

---

## Provider Hierarchy

Provider configuration follows a resolution chain:

```
Per-agent override  →  Workspace default  →  Environment variable
```

1. **Per-agent** -- If an agent has a model configuration with a provider, API key, or model name, that takes priority.
2. **Workspace default** -- The workspace's configured default provider.
3. **Environment variable** -- `LLM_API_KEY`, `LLM_BASE_URL`, and `LLM_MODEL` from the `.env` file.

This means you can run a workspace where most agents use GPT-4o (workspace default) but your code review agent uses Claude (per-agent override) and your research agent uses a local Ollama model (another per-agent override).

---

## Workspace-Level Configuration

### Via Environment Variables

The simplest approach -- set your provider in the `.env` file:

```dotenv
LLM_API_KEY=sk-your-api-key
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o
```

All agents inherit these settings unless overridden.

### Common Provider Configurations

| Provider | `LLM_BASE_URL` | `LLM_MODEL` (example) |
|---|---|---|
| OpenAI | `https://api.openai.com/v1` | `gpt-4o` |
| Anthropic | `https://api.anthropic.com/v1` | `claude-sonnet-4-5-20250929` |
| Google Gemini | `https://generativelanguage.googleapis.com/v1beta/openai` | `gemini-2.0-flash` |
| DeepSeek | `https://api.deepseek.com` | `deepseek-chat` |
| xAI (Grok) | `https://api.x.ai/v1` | `grok-3` |
| Groq | `https://api.groq.com/openai/v1` | `llama-3.3-70b-versatile` |
| Mistral | `https://api.mistral.ai/v1` | `mistral-large-latest` |
| OpenRouter | `https://openrouter.ai/api/v1` | `openai/gpt-4o` |
| Together AI | `https://api.together.xyz/v1` | `meta-llama/Llama-3-70b-chat-hf` |
| Ollama (local) | `http://host.docker.internal:11434/v1` | `llama3` |
| LM Studio (local) | `http://host.docker.internal:1234/v1` | (your loaded model) |

> [!TIP]
> For local providers (Ollama, LM Studio), use `host.docker.internal` instead of `localhost` so agent containers can reach the provider running on your host machine.

### Via Convex Dashboard

You can also configure providers through the Convex dashboard at [localhost:6791](http://localhost:6791):

1. Open the `workspaces` table.
2. Find your workspace.
3. Edit the `providers` array to add or modify provider configurations.
4. Set `defaultProviderId` to the provider you want as the default.

---

## Per-Agent Model Override

To give a specific agent a different provider or model:

1. Click the agent in the org chart.
2. Open the agent's detail panel.
3. The model configuration is set during agent creation or can be updated in the Convex dashboard.

Agent model config fields:

| Field | Description |
|---|---|
| `providerId` | Override the provider (e.g., `anthropic`, `openai`, `ollama`) |
| `model` | Override the model name |
| `apiKeyOverride` | Use a dedicated API key for this agent |
| `temperature` | Control response creativity (0.0 - 2.0) |
| `maxTokens` | Limit response length |

### Example: Mixed-Provider Workspace

```
Workspace default: OpenAI / gpt-4o
├── Frontend team: (inherits workspace default)
├── QA team: Anthropic / claude-sonnet-4-5 (per-agent override)
├── Research agent: Ollama / llama3 (per-agent, local model)
└── Code review agent: DeepSeek / deepseek-chat (per-agent)
```

---

## Supported Providers

MonokerOS ships with 33+ pre-configured providers. Any provider that exposes an OpenAI-compatible `/chat/completions` endpoint will work. See the [full provider list](../features/ai-providers.md) for details on each provider, including default models and tool calling support.

---

## Troubleshooting

### Agent Not Responding

1. Verify your API key is valid and has not expired.
2. Check that `LLM_BASE_URL` matches the correct endpoint for your provider.
3. Check the Container Service logs: `docker compose logs container-service`.

### Local Provider Not Reachable

If using Ollama or LM Studio on your host machine:

- Use `http://host.docker.internal:<port>/v1` as the base URL (not `localhost`).
- Ensure the provider is running and accepting connections.
- On Linux, you may need to use your machine's local IP address instead.

### Rate Limiting

If you see rate limit errors:

- Reduce the number of concurrent agent conversations.
- Switch to a higher-tier API plan.
- Use per-agent API keys to distribute rate limits across separate accounts.

---

## Related

- [Managing Agents](./managing-agents.md) -- Configure per-agent model overrides
- [Features: AI Providers](../features/ai-providers.md) -- Full provider catalog
