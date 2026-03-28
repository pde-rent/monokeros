<h1 align="center">MonokerOS</h1>

<p align="center">
  <strong>The operating system for AI agent teams.</strong><br/>
  Declarative orchestration. Containerized runtimes. Built-in workspace tooling.<br/>
  Define your agent workforce in YAML. The platform handles the rest.
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> &bull;
  <a href="#features">Features</a> &bull;
  <a href="#user-guides">Guides</a> &bull;
  <a href="docs/index.md">Docs</a> &bull;
  <a href="CONTRIBUTING.md">Contributing</a>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-AGPL%20v3-blue.svg" alt="License: AGPL v3" /></a>
  <a href="docs/COMMERCIAL_LICENSE.md"><img src="https://img.shields.io/badge/also-Commercial-10b981" alt="Commercial License Available" /></a>
  <img src="https://img.shields.io/badge/runtime-Bun-f472b6" alt="Bun" />
  <img src="https://img.shields.io/badge/typechecker-tsgo-3178c6" alt="tsgo" />
  <img src="https://img.shields.io/badge/AI_providers-33+-10b981" alt="33+ AI Providers" />
</p>

<!-- TODO: hero screenshot — org chart or full dashboard view -->
<!-- <p align="center"><img src="docs/assets/screenshots/hero.png" alt="MonokerOS dashboard" width="900" /></p> -->

---

AI agents are powerful individually. Give one a task, a model, and some tools, and it produces reasonable work. But production work is not one agent solving one problem. It is twenty agents across five teams, working on three projects, with shared files, coordinated handoffs, human approval gates, and a way to observe what is happening.

That coordination layer does not exist today. You end up stitching together Slack for communication, Jira for tracking, Google Drive for files, and a custom deployment pipeline for each agent. The glue code becomes the product.

**MonokerOS eliminates the glue.** It is an open-source orchestration platform where every agent runs in its own OCI container with a full Ubuntu desktop, Chrome, and a pluggable agentic runtime ([OpenClaw](https://github.com/openclaw/openclaw) by default). The platform provides everything agents need to operate as a team: project boards with kanban and Gantt views, hierarchical file drives, streaming chat, a wiki, and an interactive org chart. All data flows through a real-time [Convex](https://www.convex.dev/) backend -- no separate Postgres, Redis, S3, or WebSocket infrastructure required.

If Kubernetes is the control plane for containerized services, MonokerOS is the control plane for containerized agents. It runs on [Podman](https://podman.io/) or [Docker](https://www.docker.com/) today, with [Kubernetes](https://kubernetes.io/) support planned for distributing agents across a cluster.

---

## How It Maps to Kubernetes

MonokerOS borrows the same resource model, declarative configuration, and lifecycle management patterns as Kubernetes:

| Kubernetes | MonokerOS | What it does |
|---|---|---|
| Namespace | **Workspace** | Isolated multi-tenant environment with its own agents, teams, projects, and drives |
| Pod | **Agent** | Containerized process with its own desktop, browser, and tools |
| PersistentVolume | **Drive** | Hierarchical file storage scoped to members, teams, projects, or workspace |
| kubelet | **Container Service** | Provisions and manages OCI containers via the Podman/Docker API |
| ConfigMap | **SOUL.md / AGENTS.md** | Declarative identity and context files injected at container startup |
| YAML Manifests | **YAML Manifests** | `apiVersion: v1`, `kind: Agent`, `metadata`, `spec` -- same structure |

### Declarative agent definition

```yaml
apiVersion: v1
kind: Agent
metadata:
  name: frontend-engineer
  namespace: acme-corp
  labels:
    team: development
spec:
  displayName: "Frontend Engineer"
  title: "Senior React Developer"
  specialization: "React, TypeScript, UI/UX"
  identity:
    soul: |
      You are a meticulous frontend engineer who writes clean,
      accessible, and performant React code. You favor composition
      over inheritance and functional components over class components.
    skills: [React, TypeScript, Tailwind CSS, accessibility, performance]
  model:
    provider: anthropic
    name: claude-sonnet-4-5-20250929
    temperature: 0.7
    maxTokens: 4096
```

```yaml
apiVersion: v1
kind: Team
metadata:
  name: ui-ux-design
spec:
  displayName: "UI/UX Design"
  type: design
  color: "#ec4899"
  lead: sarah-chen
  members: [alex-park, jordan-lee, riley-quinn]
```

Manifests are version-controlled, reproducible, and human-readable. The platform uses them as the import/export format; runtime state lives in the Convex database.

---

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) >= 1.1
- [Podman](https://podman.io/) >= 4.x (recommended) or [Docker](https://www.docker.com/products/docker-desktop/) >= 24.x

### 1. Clone and install

```bash
git clone https://github.com/pde-rent/monokeros.git
cd monokeros && bun install
```

### 2. Configure environment

Create a `.env` file in the project root:

```dotenv
# Generate these with: openssl rand -hex 32
CONVEX_SELF_HOSTED_ADMIN_KEY=your_generated_admin_key
CONTAINER_SERVICE_SECRET=your_generated_secret

# Any OpenAI-compatible provider works
LLM_API_KEY=sk-your-api-key-here
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o
```

> [!TIP]
> Use any provider that exposes `/chat/completions`: OpenAI, Anthropic, Google Gemini, DeepSeek, Groq, Mistral, Ollama (local), or [30+ others](docs/features/ai-providers.md).

### 3. Start the stack

```bash
# Start infrastructure (Convex + Container Service + Web)
docker compose up -d      # or: podman compose up -d

# Build the agent desktop image (first time only)
docker build -t monokeros/openclaw-desktop docker/openclaw-desktop/
# or: podman build -t monokeros/openclaw-desktop docker/openclaw-desktop/

# Deploy Convex schema
bunx convex deploy \
  --admin-key $CONVEX_SELF_HOSTED_ADMIN_KEY \
  --url http://localhost:3210
```

### 4. Open MonokerOS

| Service | URL | Purpose |
|---|---|---|
| Web UI | [localhost:3000](http://localhost:3000) | Main application |
| Convex Dashboard | [localhost:6791](http://localhost:6791) | Database admin |

### What to do next

1. **Sign up** with email and password
2. **Explore the seed workspace** -- pre-loaded with agents, teams, and projects
3. **Start an agent** -- select one in the org chart and click Start
4. **Watch it work** -- open the Desktop Viewer to see the agent's live Ubuntu desktop
5. **Chat** -- open a conversation, send a message, watch the streaming response

> [!NOTE]
> First-time container builds take a few minutes. Subsequent starts are fast.

---

## Features

### Agent Runtime

Every agent runs in its own OCI container with an isolated Ubuntu 24.04 desktop, Chrome, filesystem, and a pluggable agentic runtime (OpenClaw by default). Agents have identity files (SOUL.md for personality, AGENTS.md for organizational context), configurable autonomy levels, and per-agent model overrides. Watch agents work in real time through the Desktop Viewer's noVNC feed -- see them browse, write code, and use tools.

<!-- TODO: GIF — agent desktop viewer showing a running agent browsing / writing code -->
<!-- <p align="center"><img src="docs/assets/screenshots/desktop-viewer.gif" alt="Agent desktop viewer" width="800" /></p> -->

### Project Management

Four view modes: **kanban board**, **Gantt chart**, **list view**, and **agent queue**. Tasks have priorities, assignees, dependencies, and a six-stage status workflow (backlog, todo, in progress, in review, awaiting acceptance, done). SDLC gates provide human approval checkpoints between project phases. Cross-validation lets you assign the same task to multiple agents, compare their outputs, and score consensus.

<!-- TODO: screenshot — kanban board with tasks in various columns -->
<!-- <p align="center"><img src="docs/assets/screenshots/kanban.png" alt="Kanban board" width="800" /></p> -->

### Chat & Messaging

Real-time streaming communication between humans and agents. SSE-based response streaming with thinking phases and tool call visibility -- you see what the agent is thinking and which tools it is invoking. Rich rendering: Markdown, LaTeX math, Mermaid diagrams, and syntax highlighting for 16+ languages. Mention system (`@agent`, `#project`, `~task`, `:file`) with autocomplete. File attachments with drag-and-drop and inline preview. Pop-out windows for multitasking.

<!-- TODO: GIF — chat with streaming response, tool calls, and rendered markdown -->
<!-- <p align="center"><img src="docs/assets/screenshots/chat-streaming.gif" alt="Chat streaming" width="800" /></p> -->

### File Drives

Hierarchical file system with four scope levels: member (per-agent personal storage), team, project, and workspace. Three view modes (tree, grid, list) with inline preview for code, markdown, images, and PDFs. Agents read from and write to drives they have access to through MCP tools.

<!-- TODO: screenshot — file tree view with drive sidebar and file preview -->
<!-- <p align="center"><img src="docs/assets/screenshots/file-drives.png" alt="File drives" width="800" /></p> -->

### Organization Chart

Interactive React Flow graph showing team structure, agent status, and reporting lines. Agents are grouped by team with color-coded nodes. Real-time status indicators (idle, working, reviewing, blocked, offline). Three view modes: workforce, management, and project views. Click any node to view details, start a chat, or open the agent's desktop.

<!-- TODO: screenshot — org chart with colored team groups and status indicators -->
<!-- <p align="center"><img src="docs/assets/screenshots/org-chart.png" alt="Organization chart" width="800" /></p> -->

### Wiki

Collaborative documentation space for workspace-level knowledge. Full rendering pipeline (math, diagrams, code blocks, entity mentions). Hierarchical sidebar navigation with sections and table of contents. Agents and humans can create, edit, and organize pages.

### MCP Integration

Model Context Protocol server with 9 tool categories: Members, Teams, Projects, Tasks, Conversations, Files, Agents, Workspace, and Knowledge. Works with Claude Desktop, Cursor, Windsurf, and any MCP-compatible client. Agents use MCP tools internally for all workspace operations -- reading files, updating tasks, searching knowledge.

### Workspace Templates

Pre-built configurations for common organizational structures -- development agencies, legal teams, content studios -- with pre-defined agents, teams, and project workflows. 15 industry presets available, or define your own with YAML manifests.

### AI Providers

Works with any OpenAI-compatible `/chat/completions` endpoint. 33+ providers are pre-configured: OpenAI, Anthropic, Google Gemini, DeepSeek, xAI Grok, Mistral, Groq, OpenRouter, Together AI, Ollama, LM Studio, and more. Different agents can use different providers and models. See the [full provider list](docs/features/ai-providers.md).

### Platform Compatibility

MonokerOS is built as a pluggable platform. Every major subsystem is backed by an abstraction layer so you can swap implementations without changing application code -- a drop-in solution or integration point for organizations of any size.

#### Container Runtimes (OCI-Compatible)

| Runtime | Status | Description |
|---------|--------|-------------|
| [**Podman**](https://podman.io/) | Supported (default) | Daemonless, rootless. Recommended for dev and single-node. |
| [**Docker**](https://www.docker.com/) | Supported | Drop-in alternative. Docker Desktop or Docker Engine. |
| [**Kubernetes**](https://kubernetes.io/) | Planned | Helm charts for multi-node agent distribution and horizontal scaling. |

#### Agentic Runtimes

| Runtime | Status | Description |
|---------|--------|-------------|
| [**OpenClaw**](https://github.com/openclaw/openclaw) | Supported (default) | Full-featured runtime with MCP support, tool profiles, and multi-channel messaging. |
| [**nanobot**](https://github.com/HKUDS/nanobot) | Planned | Ultra-lightweight OpenClaw alternative. |
| [**ZeroClaw**](https://github.com/zeroclaw-labs/zeroclaw) | Planned | Fast, small, fully autonomous agent infrastructure. |
| [**NanoClaw**](https://github.com/qwibitai/nanoclaw) | Planned | Lightweight containerized runtime with WhatsApp support. |
| [**PicoClaw**](https://github.com/sipeed/picoclaw) | Planned | Tiny, fast, deploy-anywhere agent runtime. |
| [**MimiClaw**](https://mimiclaw.ai) | Planned | Mimicry-based runtime for persona-driven agents. |

Any runtime conforming to the OpenAI-compatible `/v1/chat/completions` streaming interface can be used as a drop-in backend.

#### Productivity Integrations

| Category | Built-in | Planned Integrations |
|----------|----------|---------------------|
| **Project Management** | Kanban, Gantt, List, Queue | [Jira](https://www.atlassian.com/software/jira), [Linear](https://linear.app/), [Asana](https://asana.com/), [Trello](https://trello.com/), [GitHub Issues](https://github.com/features/issues) |
| **Chat / Messaging** | Real-time agent chat with streaming | [Slack](https://slack.com/), [Discord](https://discord.com/), [Microsoft Teams](https://www.microsoft.com/en-us/microsoft-teams/) |
| **File Storage / Drives** | Scoped hierarchical drives | [Google Drive](https://drive.google.com/), [OneDrive](https://onedrive.live.com/), [Dropbox](https://www.dropbox.com/) |

---

## User Guides

Step-by-step walkthroughs for common workflows.

| Guide | Description |
|---|---|
| [Creating a Workspace](docs/guides/creating-a-workspace.md) | Set up a new workspace from scratch or from a template |
| [Managing Agents](docs/guides/managing-agents.md) | Create agents, configure identity and models, start and stop containers |
| [Chatting with Agents](docs/guides/chatting-with-agents.md) | Send messages, use mentions, attach files, read streaming responses |
| [Project Management](docs/guides/project-management.md) | Create projects and tasks, use kanban/Gantt/list views, manage SDLC gates |
| [File Management](docs/guides/file-management.md) | Navigate drives, create files and folders, preview content |
| [Using the Desktop Viewer](docs/guides/desktop-viewer.md) | Watch agents work, take interactive control, monitor resource usage |
| [Writing Wiki Pages](docs/guides/wiki.md) | Create and edit documentation, use markdown features |
| [Configuring AI Providers](docs/guides/configuring-providers.md) | Set up workspace and per-agent provider overrides |

---

## Architecture

```
                    ┌─────────────────────────────┐
                    │      Browser (React 19)      │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │   Next.js 15 + TurboPack     │
                    │        (port 3000)            │
                    └──────────────┬──────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                     │
   ┌──────────▼──────────┐  ┌─────▼──────┐  ┌──────────▼──────────┐
   │   Convex Backend     │  │  Container  │  │   Agent Containers   │
   │   (port 3210)        │  │  Service    │  │   (dynamic)          │
   │                      │  │  (port 3002)│  │                      │
   │ • Real-time DB       │  │             │  │  ┌─────────────────┐ │
   │ • Auth & sessions    │  │ • OCI       │  │  │ Ubuntu 24.04    │ │
   │ • File storage       │  │   lifecycle │  │  │ OpenBox + Xvnc  │ │
   │ • Mutations/queries  │  │ • Agent     │  │  │ Chrome          │ │
   │ • Subscriptions      │  │   provision │  │  │ OpenClaw        │ │
   │                      │  │ • SSE proxy │  │  │ MCP Server      │ │
   └──────────────────────┘  │ • VNC mgmt  │  │  └─────────────────┘ │
                             └─────────────┘  │  ┌─────────────────┐ │
                                              │  │ Agent N ...      │ │
                                              │  └─────────────────┘ │
                                              └──────────────────────┘
                                                        │
                                              ┌─────────▼─────────┐
                                              │   LLM Provider     │
                                              │ (OpenAI-compatible)│
                                              └───────────────────┘
```

**Four layers:**

1. **Presentation** -- Next.js 15 with React 19, Tailwind CSS v4, real-time Convex subscriptions
2. **Data** -- Self-hosted [Convex](https://www.convex.dev/) for persistence, auth, file storage, and real-time sync
3. **Orchestration** -- Bun HTTP server managing OCI container lifecycle (Podman/Docker), agent provisioning, and SSE streaming
4. **Agent Runtime** -- Ubuntu 24.04 desktop containers with pluggable agentic runtime (OpenClaw default), Chrome, MCP tools, and noVNC

### Monorepo structure

```
monokeros/
├── apps/web/                # Next.js 15 + TurboPack
├── convex/                  # Schema, queries, mutations, actions, seed data
├── services/
│   └── container-service/   # Bun HTTP server for OCI container orchestration
├── docker/
│   ├── openclaw-desktop/       # Agent container image (Ubuntu + OpenClaw)
│   └── web/                 # Production web Dockerfile
├── packages/
│   ├── types/               # Shared TypeScript types & Zod validation
│   ├── constants/           # Industry presets, provider catalog, permissions
│   ├── ui/                  # 50+ React components
│   ├── renderer/            # Markdown + LaTeX + Mermaid + Prism pipeline
│   ├── mcp/                 # Model Context Protocol server (9 tool categories)
│   ├── templates/           # Pre-built workspace templates
│   ├── avatar/              # Procedural avatar generation
│   └── utils/               # Shared utilities
├── docker-compose.yml
└── turbo.json
```

All packages reference source directly (`main: "./src/index.ts"`) -- no build step between packages.

---

## Development

```bash
bun install                   # Install all workspace dependencies
bun run dev                   # Start web app via TurboRepo (hot-reload)
bun run typecheck             # Type-check all packages (tsgo)
bun run lint                  # Lint all packages (oxlint)
bun run build                 # Build all packages
docker compose up -d          # Start infrastructure stack
docker compose logs -f        # Tail all service logs
```

For active development with hot-reloading:

```bash
# Start backend services
docker compose up -d convex-backend convex-dashboard container-service

# Run web app with hot-reload (separate terminal)
cd apps/web && bunx next dev --port 3000 --turbopack
```

---

## Roadmap

- [ ] Kubernetes support (Helm charts for multi-node agent distribution)
- [ ] Additional agentic runtimes ([nanobot](https://github.com/HKUDS/nanobot), [ZeroClaw](https://github.com/zeroclaw-labs/zeroclaw), [NanoClaw](https://github.com/qwibitai/nanoclaw), [PicoClaw](https://github.com/sipeed/picoclaw), [MimiClaw](https://mimiclaw.ai))
- [ ] Integration bridges: [Jira](https://www.atlassian.com/software/jira), [Linear](https://linear.app/), [Asana](https://asana.com/), [GitHub Issues](https://github.com/features/issues)
- [ ] Chat bridges: [Slack](https://slack.com/), [Discord](https://discord.com/), [Microsoft Teams](https://www.microsoft.com/en-us/microsoft-teams/)
- [ ] Drive sync: [Google Drive](https://drive.google.com/), [OneDrive](https://onedrive.live.com/), [Dropbox](https://www.dropbox.com/)
- [ ] Agent-to-agent delegation
- [ ] Git integration (agents commit and open PRs)
- [ ] Telegram & WhatsApp channels
- [ ] Persistent agent memory across conversations
- [ ] Custom MCP tools loadable at runtime
- [ ] Community template marketplace
- [ ] Audit log for compliance
- [ ] Per-agent and per-project cost tracking

---

## Community

<!-- TODO: uncomment when channels are created -->
<!--
- [Discord](https://discord.gg/monokeros) -- Questions, discussions, and support
- [Twitter / X](https://twitter.com/monokeros_ai) -- Updates and announcements
-->
- [GitHub Discussions](https://github.com/pde-rent/monokeros/discussions) -- RFCs, Q&A, feature requests
- [Issues](https://github.com/pde-rent/monokeros/issues) -- Bug reports

---

## Credits & Inspirations

MonokerOS stands on the shoulders of exceptional open-source projects:

**Inspired by:**

- **[Kubernetes](https://kubernetes.io/)** -- Config-first declarative resource management: namespaces, manifests, lifecycle controllers, and the separation of desired state from runtime state
- **[CrewAI](https://github.com/crewAIInc/crewAI)** -- Multi-agent team creation and management: the idea that agents work best when organized into crews with roles, goals, and coordination
- **[Agno](https://github.com/agno-agi/agno)** -- Multi-agent orchestration at scale: a programming language for building, running, and managing multi-agent systems with pluggable runtimes
- **[OpenClaw Mission Control](https://github.com/abhi1693/openclaw-mission-control)** -- Agent orchestration dashboard: centralized operations and governance for multi-agent environments
- **[OpenLens](https://github.com/MuhammedKalworworki/openlens)** -- Visual resource management: the principle that infrastructure is best understood through an interactive UI, not just CLI output

**Powered by:**

- **[OpenClaw](https://github.com/openclaw/openclaw)** -- The default autonomous AI agent runtime. Handles tool calling, memory, system prompts, and LLM orchestration. Swappable with other OCI-compatible agentic runtimes.
- **[Convex](https://www.convex.dev/)** -- Real-time backend framework providing the data layer: reactive queries, mutations, auth, file storage, and live subscriptions that push updates to every connected client.
- **[OpenBox](http://openbox.org/) + [Xvnc](https://tigervnc.org/) + [noVNC](https://novnc.com/)** -- Minimal desktop environment stack inside each agent container. OpenBox provides the window manager, Xvnc creates a virtual X display, and noVNC streams it to the browser over WebSocket.

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for branch naming, commit conventions, and PR process.

**All contributors must sign our CLA** — this grants MonokerOS the right to distribute contributions under both open-source and commercial licenses. Our CLA bot will guide you through signing on your first PR.

```bash
git clone https://github.com/pde-rent/monokeros.git
cd monokeros && bun install
bun run dev
```

---

## License

MonokerOS is dual-licensed:

| License | Use Case | Cost |
|---------|----------|------|
| **AGPL v3** | Open-source use, can comply with copyleft | Free |
| **Commercial** | Proprietary products, cannot disclose source | Paid |

- **AGPL v3**: Use MonokerOS freely under the terms of the [GNU Affero General Public License v3](LICENSE). If you modify and deploy MonokerOS as a network service, you must open-source your modifications under AGPL v3.
- **Commercial License**: For organizations that cannot comply with AGPL requirements (e.g., embedding in proprietary products, SaaS without source disclosure), commercial licenses are available. See [docs/COMMERCIAL_LICENSE.md](docs/COMMERCIAL_LICENSE.md) for pricing and terms.

This dual-licensing model enables us to build a sustainable open-source project while remaining free for hobbyists, students, and open-source projects.

For commercial licensing inquiries: license@monokeros.io
