# Installation

This guide walks you through setting up MonokerOS for local development.

## Prerequisites

| Requirement | Minimum Version | Notes |
|-------------|----------------|-------|
| **Bun** | 1.1+ | Sole runtime and package manager. Never use `node`, `npm`, `npx`, or `yarn`. |
| **Podman** or **Docker** | Podman 4.x+ / Docker 24+ | Container runtime for Convex backend, Container Service, and agent containers. Podman is recommended (daemonless, rootless). Docker works as a drop-in alternative. |
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

### Install a Container Runtime

MonokerOS supports **Podman** (recommended) and **Docker**. The Container Service auto-detects which runtime is available, preferring Podman when both are present.

#### Option A: Podman (Recommended)

Podman is daemonless and runs rootless by default.

**macOS:**
```bash
brew install podman
podman machine init
podman machine start
```

**Linux (Fedora/RHEL):**
```bash
sudo dnf install podman podman-compose
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt install podman
pip install podman-compose  # or: sudo apt install podman-compose
```

Verify your installation:
```bash
podman --version
podman compose version
```

#### Option B: Docker

Download and install Docker Desktop from [docker.com](https://www.docker.com/products/docker-desktop/). Ensure the Docker daemon is running before proceeding.

```bash
docker --version
docker compose version
```

---

## Clone and Install

```bash
git clone <your-repo-url> monokeros
cd monokeros
bun install
```

`bun install` resolves all workspace dependencies across the web app and all shared packages in a single pass.

### Monorepo Layout

```
monokeros/
├── apps/
│   └── web/              # Next.js 15 + TurboPack (port 3000)
├── convex/               # Convex schema, functions, and seed data
├── docker/
│   ├── openclaw-desktop/    # Agent container Dockerfile (Ubuntu + OpenClaw)
│   ├── container-service/# Container Service Dockerfile
│   └── web/              # Web app production Dockerfile
├── packages/             # Shared packages (types, constants, ui, utils, renderer, etc.)
├── services/             # Container Service source
├── docker-compose.yml    # Infrastructure stack
├── turbo.json
└── package.json          # Bun workspaces root
```

---

## Environment Setup

MonokerOS requires environment variables for the infrastructure stack. Create a `.env` file in the project root.

### 1. Copy the Example File

```bash
cp .env.example .env
```

Or create `.env` manually with the required variables.

### 2. Configure Required Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CONVEX_SELF_HOSTED_ADMIN_KEY` | Yes | -- | Admin key for the self-hosted Convex backend. Generate with `openssl rand -hex 32`. |
| `CONTAINER_SERVICE_SECRET` | Yes | -- | Shared secret between Convex actions and Container Service. Generate with `openssl rand -hex 32`. |
| `LLM_API_KEY` | Yes | -- | API key for your chosen LLM provider. |
| `LLM_BASE_URL` | No | `https://api.openai.com/v1` | Base URL for the provider's OpenAI-compatible endpoint. |
| `LLM_MODEL` | No | `gpt-4o` | Model identifier sent in chat completion requests. |
| `NEXT_PUBLIC_CONVEX_URL` | No | `http://127.0.0.1:3210` | URL where the browser reaches the Convex backend. |

Example `.env`:

```dotenv
CONVEX_SELF_HOSTED_ADMIN_KEY=your_admin_key_here
CONTAINER_SERVICE_SECRET=your_secret_here
LLM_API_KEY=sk-your-api-key-here
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o
NEXT_PUBLIC_CONVEX_URL=http://127.0.0.1:3210
```

---

## Start Infrastructure

The Docker Compose stack runs the Convex backend, Convex dashboard, Container Service, and the web app.

```bash
docker compose up -d
```

This starts four services:

| Service | Port | Purpose |
|---------|------|---------|
| `convex-backend` | 3210, 3211 | Self-hosted Convex real-time database |
| `convex-dashboard` | 6791 | Convex admin dashboard |
| `container-service` | 3002 | Docker container orchestration for agents |
| `web` | 3000 | Next.js 15 web application |

---

## Build the Agent Desktop Image

Agent containers are spawned dynamically by the Container Service. You need to build the base image first:

```bash
# Podman
podman build -t monokeros/openclaw-desktop docker/openclaw-desktop/

# Docker
docker build -t monokeros/openclaw-desktop docker/openclaw-desktop/
```

This builds an Ubuntu 24.04 image with OpenBox, Xvnc, noVNC, Chrome, and OpenClaw pre-installed. Each agent gets its own instance of this image at runtime.

---

## Push Convex Schema

Deploy the Convex schema and functions to the self-hosted backend:

```bash
bunx convex deploy --admin-key $CONVEX_SELF_HOSTED_ADMIN_KEY --url http://localhost:3210
```

This pushes the schema definitions, queries, mutations, and actions from the `convex/` directory. Seed data is auto-loaded via `convex/seed.ts` on first deployment.

---

## AI Provider Setup

MonokerOS connects to LLM providers through an OpenAI-compatible API interface, giving you access to 33+ providers. Set `LLM_BASE_URL` and `LLM_API_KEY` for whichever provider you choose.

### Common Provider Configurations

| Provider | `LLM_BASE_URL` | `LLM_MODEL` (example) |
|----------|----------------|----------------------|
| OpenAI | `https://api.openai.com/v1` | `gpt-4o` |
| Anthropic (via proxy) | `https://api.anthropic.com/v1` | `claude-sonnet-4-20250514` |
| Google (Gemini) | `https://generativelanguage.googleapis.com/v1beta/openai` | `gemini-2.0-flash` |
| Groq | `https://api.groq.com/openai/v1` | `llama-3.3-70b-versatile` |
| Mistral | `https://api.mistral.ai/v1` | `mistral-large-latest` |
| OpenRouter | `https://openrouter.ai/api/v1` | `openai/gpt-4o` |
| Together AI | `https://api.together.xyz/v1` | `meta-llama/Llama-3-70b-chat-hf` |
| Ollama (local) | `http://localhost:11434/v1` | `llama3` |

Any provider that exposes an OpenAI-compatible `/chat/completions` endpoint will work. Provider settings can also be configured per-workspace through the Convex dashboard.

---

## Development Mode

For active development with hot-reloading, run the infrastructure stack via Docker and the web app locally:

```bash
# Start Convex + Container Service via Docker
docker compose up -d convex-backend convex-dashboard container-service

# Run the web app with hot-reloading (separate terminal)
bun run dev
```

This gives you TurboPack hot-reloading on the Next.js app while the backend services run in Docker.

### Running the Web App Directly

```bash
cd apps/web && bunx next dev --port 3000 --turbopack
```

---

## Verify Your Setup

1. Open [http://localhost:3000](http://localhost:3000) -- the MonokerOS web interface.
2. Open [http://localhost:6791](http://localhost:6791) -- the Convex dashboard (for inspecting data and functions).
3. Sign up with an email address and password (Convex Auth handles registration).
4. You should see the seed workspace pre-loaded with agents, teams, and projects.

If you can see the workspace dashboard, your installation is complete.

---

## Other Useful Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Start the web app via TurboRepo (hot-reloading) |
| `bun run typecheck` | Type-check all packages (uses `tsgo` via turbo) |
| `bun run lint` | Lint all packages (uses oxlint) |
| `bun run build` | Build all packages |
| `docker compose logs -f` | Tail logs for all Docker services |
| `docker compose down` | Stop all Docker services |

> **Note:** Typechecking uses tsgo (`@typescript/native-preview`), the native Go-based TypeScript type checker. The turbo pipeline handles this automatically, but you can run it manually: `bunx @typescript/native-preview --noEmit`

---

## Common Issues

### Container Runtime Not Running

If `docker compose up` (or `podman compose up`) fails, ensure your runtime is available:

```bash
# Podman
podman info

# Docker
docker info
```

### Port Conflicts

If ports 3000, 3002, 3210, or 6791 are already in use:

```bash
lsof -i :3000
lsof -i :3210
```

Ports can be overridden via environment variables in `.env`:

```dotenv
CONVEX_PORT=3210
CONVEX_DASHBOARD_PORT=6791
CONTAINER_SERVICE_PORT=3002
WEB_PORT=3000
```

### Missing Environment Variables

If agents fail to start or you see provider errors:

1. Verify `.env` exists in the project root with valid values for all required variables.
2. Ensure `CONVEX_SELF_HOSTED_ADMIN_KEY` and `CONTAINER_SERVICE_SECRET` are set.
3. Ensure your `LLM_API_KEY` has not expired or hit its rate limit.
4. Check that `LLM_BASE_URL` matches the correct endpoint for your provider.

### Agent Desktop Image Not Found

If agent containers fail to start, ensure you have built the base image:

```bash
# Use whichever runtime you have installed
podman build -t monokeros/openclaw-desktop docker/openclaw-desktop/
# or
docker build -t monokeros/openclaw-desktop docker/openclaw-desktop/
```

### Bun Version Mismatch

```bash
bun --version

# Update Bun if needed
bun upgrade
```

---

## Next Steps

- [Quick Start](./quick-start.md) -- explore the platform and chat with your first agent
- [Self-Hosting](./self-hosting.md) -- full deployment reference with security and operations
- [Core Concepts: Agents](../core-concepts/agents.md) -- understand agent configuration and capabilities
