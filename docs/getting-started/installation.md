# Installation

This guide walks you through setting up MonokerOS for local development.

## Prerequisites

| Requirement | Minimum Version | Notes |
|-------------|----------------|-------|
| **Bun** | 1.1+ (recommended 1.3+) | Sole runtime and package manager. Never use `node`, `npm`, `npx`, or `yarn`. |
| **Git** | 2.x | For cloning the repository. |

### Install Bun

If you do not have Bun installed:

```bash
curl -fsSL https://bun.sh/install | bash
```

Verify your installation:

```bash
bun --version
# Should output 1.1.0 or higher
```

---

## Clone and Install

```bash
git clone <your-repo-url> monokeros
cd monokeros
bun install
```

`bun install` resolves all workspace dependencies across both apps and all shared packages in a single pass.

### Monorepo Layout

```
monokeros/
├── apps/
│   ├── web/          # Next.js 15 + TurboPack (port 3000)
│   └── api/          # NestJS 11 on Bun (port 3001)
├── packages/         # 10 shared packages (types, constants, ui, utils, renderer, ...)
├── turbo.json
└── package.json      # Bun workspaces root
```

For a deeper look at the architecture, see [System Overview](../architecture/overview.md).

---

## Environment Setup

MonokerOS requires a small set of environment variables for its API server. A template is provided.

### 1. Copy the Example File

```bash
cp apps/api/.env.example apps/api/.env
```

### 2. Configure Required Variables

Open `apps/api/.env` and fill in your values:

```dotenv
# --- Required ---
ZAI_API_KEY=your_api_key_here
ZAI_BASE_URL=https://api.openai.com/v1
ZAI_MODEL=gpt-4o

# --- Optional overrides ---
# ZEROCLAW_PATH=/usr/local/bin/zeroclaw
# ZEROCLAW_DATA_DIR=./data/agents
```

| Variable | Required | Description |
|----------|----------|-------------|
| `ZAI_API_KEY` | Yes | API key for your chosen AI provider. |
| `ZAI_BASE_URL` | Yes | Base URL for the provider's API endpoint. |
| `ZAI_MODEL` | Yes | Model identifier (e.g., `gpt-4o`, `claude-sonnet-4-20250514`, `gemini-2.0-flash`). |

---

## AI Provider Setup

MonokerOS connects to LLM providers through an OpenAI-compatible API interface, giving you access to 31+ providers. Set `ZAI_BASE_URL` and `ZAI_API_KEY` for whichever provider you choose.

### Common Provider Configurations

| Provider | `ZAI_BASE_URL` | `ZAI_MODEL` (example) |
|----------|----------------|----------------------|
| OpenAI | `https://api.openai.com/v1` | `gpt-4o` |
| Anthropic (via proxy) | `https://api.anthropic.com/v1` | `claude-sonnet-4-20250514` |
| Google (Gemini) | `https://generativelanguage.googleapis.com/v1beta/openai` | `gemini-2.0-flash` |
| Groq | `https://api.groq.com/openai/v1` | `llama-3.3-70b-versatile` |
| Mistral | `https://api.mistral.ai/v1` | `mistral-large-latest` |
| OpenRouter | `https://openrouter.ai/api/v1` | `openai/gpt-4o` |
| Together AI | `https://api.together.xyz/v1` | `meta-llama/Llama-3-70b-chat-hf` |
| Ollama (local) | `http://localhost:11434/v1` | `llama3` |

Any provider that exposes an OpenAI-compatible `/chat/completions` endpoint will work.

---

## Start Development

Run both the API and web app simultaneously via TurboRepo:

```bash
bun run dev
```

This starts:
- **API server** on [http://localhost:3001](http://localhost:3001)
- **Web app** on [http://localhost:3000](http://localhost:3000)

### Running Apps Individually

If you prefer to run each app in a separate terminal:

```bash
# Terminal 1 - API server (with hot reload)
cd apps/api && bun --watch src/main.ts

# Terminal 2 - Web app (with TurboPack)
cd apps/web && bunx next dev --port 3000 --turbopack
```

---

## Verify Your Setup

1. Open [http://localhost:3000](http://localhost:3000) in your browser.
2. Log in with **any email address** and the password **`password`**.
   - Development mode accepts any email; no registration required.
3. You should see the **Design Unlimited v2** seed workspace pre-loaded with agents, teams, and projects.

If you can see the workspace dashboard, your installation is complete. Head to the [Quick Start](./quick-start.md) guide to start exploring.

---

## Other Useful Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Start both apps via TurboRepo |
| `bun run typecheck` | Type-check all packages (uses `tsgo` via turbo) |
| `bun run lint` | Lint all packages (uses oxlint) |
| `bun run build` | Build all packages |
| `bun run clean` | Clean build artifacts |

> **Note:** Typechecking uses tsgo (`@typescript/native-preview`), the native Go-based TypeScript type checker, providing significantly faster type checking than standard `tsc`. The turbo pipeline handles this automatically, but if you need to run it manually: `bunx @typescript/native-preview --noEmit`

---

## Common Issues

### Port Conflicts

If port 3000 or 3001 is already in use:

```bash
# Find what is using the port
lsof -i :3000
lsof -i :3001

# Kill the process
kill -9 <PID>
```

To use different ports:
- **Web:** `cd apps/web && bunx next dev --port 3002 --turbopack`
- **API:** Update the port in `apps/api/src/main.ts`

Note that CORS is configured for `localhost:3000` by default. If you change the web port, update the CORS configuration in the API accordingly.

### Missing Environment Variables

If agents fail to respond or you see provider errors in the console:

1. Verify `apps/api/.env` exists and contains valid values for `ZAI_API_KEY`, `ZAI_BASE_URL`, and `ZAI_MODEL`.
2. Ensure your API key has not expired or hit its rate limit.
3. Check that the `ZAI_BASE_URL` matches the correct endpoint for your provider (see the table above).

### Bun Version Mismatch

The project specifies `bun@1.3.8` as its package manager. If you encounter unexpected behavior:

```bash
bun --version

# Update Bun if needed
bun upgrade
```

### Stale Daemon Processes

If agents stop responding after restarting the API server, old daemon processes may still be running with stale webhook secrets:

```bash
# Kill all running daemons
pkill -f "bun run.*daemon.ts"

# Then restart the API server
cd apps/api && bun --watch src/main.ts
```

### Mock Store Data Loss

The development environment uses an in-memory mock store. All data (workspaces, agents, conversations) is lost when the API server restarts. Seed data (the Design Unlimited v2 workspace) is automatically re-loaded on startup.

---

## Next Steps

- [Quick Start](./quick-start.md) -- explore the platform and chat with your first agent
- [Self-Hosting](./self-hosting.md) -- configuration reference for hosting MonokerOS
- [System Overview](../architecture/overview.md) -- understand the architecture
