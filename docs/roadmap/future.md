# Future Plans & Roadmap

This document outlines the planned features and improvements for MonokerOS. Items are grouped by category and roughly prioritized within each section.

## Overview

```mermaid
timeline
    title MonokerOS Roadmap
    section Foundation
        Database Layer : PostgreSQL / SQLite
        OAuth2 : Google, Microsoft, GitHub
        Storage Backends : S3, GDrive, Dropbox
    section Integration
        Jira Sync : Bidirectional
        Linear Integration : Import/sync
        Trello Import : One-time migration
    section Platform
        OpenClaw Backend : Full agent orchestration
        Plugin System : Custom behaviors
        Self-Hosting : Docker, Kubernetes
    section Experience
        Mobile : PWA + responsive
        Monitoring : Dashboards + cost tracking
        Multi-Workspace : Cross-workspace agents
```

## Database

**Current state**: All data is stored in an in-memory mock store (`MockStore`). Server restarts wipe all data, and seed data is auto-loaded on boot.

**Planned**:

| Feature | Description | Priority |
|---------|-------------|----------|
| **PostgreSQL support** | Full relational database for production deployments | High |
| **SQLite support** | Lightweight alternative for self-hosted / single-machine deployments | High |
| **Migration system** | Schema versioning and migration tooling | High |
| **Data persistence** | Conversations, files, members, projects all survive restarts | High |

```mermaid
flowchart LR
    A[MockStore - In Memory] -->|Migration| B[PostgreSQL / SQLite]
    B --> C[Prisma / Drizzle ORM]
    C --> D[Type-safe queries]
    C --> E[Schema migrations]
```

## Authentication

**Current state**: Dev-mode login (any email + "password"), JWT tokens, `mk_` API keys. See [Authentication](../technical/auth.md) for current details.

**Planned**:

| Feature | Description | Priority |
|---------|-------------|----------|
| **Google OAuth2** | Sign in with Google accounts | High |
| **Microsoft OAuth2** | Sign in with Microsoft / Azure AD | Medium |
| **GitHub OAuth2** | Sign in with GitHub accounts | Medium |
| **SSO (SAML)** | Enterprise SAML-based single sign-on | Medium |
| **SSO (OIDC)** | OpenID Connect for generic identity providers | Medium |
| **Magic links** | Passwordless email login | Low |
| **MFA / 2FA** | Multi-factor authentication | Low |

```mermaid
flowchart TD
    A[Login Page] --> B{Provider?}
    B -- Email/Password --> C[Local Auth]
    B -- Google --> D[Google OAuth2]
    B -- Microsoft --> E[Microsoft OAuth2]
    B -- GitHub --> F[GitHub OAuth2]
    B -- SSO --> G[SAML / OIDC]
    C & D & E & F & G --> H[JWT Token Issued]
```

## Storage Backends

**Current state**: Files are stored in the in-memory mock store as virtual file entries. See [File Management](../features/file-management.md).

**Planned**:

| Feature | Description | Priority |
|---------|-------------|----------|
| **Local filesystem** | Store files on disk for self-hosted deployments | High |
| **Amazon S3** | S3-compatible object storage | High |
| **Google Drive** | Sync workspace drives with Google Drive | Medium |
| **Dropbox** | Sync workspace drives with Dropbox | Medium |
| **Azure Blob** | Azure Blob Storage integration | Low |

The storage layer will use a pluggable adapter pattern, allowing different backends per workspace or globally.

## Integration Bridges

**Current state**: MonokerOS operates as a standalone platform with no external tool integrations.

**Planned**:

| Feature | Description | Priority |
|---------|-------------|----------|
| **Jira sync** | Bidirectional sync of projects and tasks with Jira | High |
| **Trello import** | One-time import of Trello boards into MonokerOS projects | Medium |
| **Linear integration** | Sync issues and projects with Linear | Medium |
| **GitHub Issues** | Sync tasks with GitHub issues | Medium |
| **Slack bridge** | Forward agent messages to Slack channels | Low |
| **Webhooks (outbound)** | Notify external systems of MonokerOS events | Medium |

```mermaid
flowchart LR
    subgraph MonokerOS
        P[Projects]
        T[Tasks]
        M[Messages]
    end

    subgraph External
        J[Jira]
        L[Linear]
        TR[Trello]
        GH[GitHub Issues]
        SL[Slack]
    end

    P <-->|"Bidirectional sync"| J
    P <-->|"Bidirectional sync"| L
    TR -->|"One-time import"| P
    T <-->|"Issue sync"| GH
    M -->|"Forward"| SL
```

## OpenClaw / ZeroClaw Evolution

**Current state**: Agents run as embedded [ZeroClaw daemons](../technical/daemon.md) -- child processes spawned by the API server. See the daemon documentation for details.

**Planned**:

| Feature | Description | Priority |
|---------|-------------|----------|
| **OpenClaw backend** | Standalone agent orchestration service replacing embedded daemons | High |
| **Agent pools** | Pre-warmed agent processes for faster cold starts | Medium |
| **Distributed execution** | Run agents across multiple machines | Medium |
| **Agent-to-agent communication** | Direct messaging between agent daemons | Medium |
| **Persistent daemon state** | Survive API restarts without losing conversation context | High |

```mermaid
flowchart TD
    subgraph Current["Current: ZeroClaw (Embedded)"]
        API1[API Server] -->|"Bun.spawn"| D1[Daemon 1]
        API1 -->|"Bun.spawn"| D2[Daemon 2]
    end

    subgraph Future["Future: OpenClaw (Standalone)"]
        API2[API Server] -->|gRPC| OC[OpenClaw Service]
        OC --> P1[Agent Pool 1]
        OC --> P2[Agent Pool 2]
        OC --> P3[Agent Pool N]
    end
```

## Agent Capabilities

**Current state**: Agents can search the web, read/write files, search knowledge, and (with admin context) manage workspace entities. See [Daemon System](../technical/daemon.md) for current tools.

**Planned**:

| Feature | Description | Priority |
|---------|-------------|----------|
| **Code execution sandboxes** | Agents can run code in isolated containers | High |
| **Web browsing** | Full browser automation for research tasks | Medium |
| **API integrations** | Agents call external APIs (REST, GraphQL) | Medium |
| **Image generation** | Agents create images via DALL-E, Midjourney, etc. | Low |
| **Document generation** | Agents produce PDFs, slides, spreadsheets | Medium |
| **Custom tools** | User-defined tools via plugin system | Medium |

## Multi-Workspace

**Current state**: Each workspace is independent with its own members, teams, projects, and files.

**Planned**:

| Feature | Description | Priority |
|---------|-------------|----------|
| **Cross-workspace agent sharing** | Reuse agent configurations across workspaces | Medium |
| **Organization-level admin** | Manage multiple workspaces from a single org account | Medium |
| **Agent marketplace** | Browse and install pre-configured agents | Low |
| **Template marketplace** | Community-contributed workspace templates | Low |

## Monitoring & Observability

**Current state**: Basic health check endpoints on daemons. No centralized monitoring.

**Planned**:

| Feature | Description | Priority |
|---------|-------------|----------|
| **Agent performance dashboards** | Response times, token usage, error rates per agent | High |
| **Cost tracking** | Per-agent and per-workspace LLM cost monitoring | High |
| **Audit logs** | Track all workspace changes with who/what/when | Medium |
| **Usage analytics** | Message volume, active agents, project progress metrics | Medium |
| **Alerting** | Notifications when agents error, costs spike, or daemons crash | Medium |

```mermaid
flowchart LR
    A[Agent Daemons] -->|Metrics| B[Monitoring Service]
    C[API Server] -->|Logs| B
    B --> D[Dashboard UI]
    B --> E[Cost Reports]
    B --> F[Alerts]
```

## Mobile & Responsive

**Current state**: Desktop-optimized web application.

**Planned**:

| Feature | Description | Priority |
|---------|-------------|----------|
| **Responsive design** | Adapt UI for tablet and mobile viewports | Medium |
| **PWA** | Progressive Web App for installable mobile experience | Medium |
| **Push notifications** | Browser and mobile push for messages and alerts | Medium |
| **Offline support** | Cache recent conversations for offline reading | Low |

## Self-Hosting

**Current state**: Run locally with `bun run dev`. No production deployment tooling.

**Planned**:

| Feature | Description | Priority |
|---------|-------------|----------|
| **Docker Compose** | Single-command deployment with docker compose | High |
| **Kubernetes Helm charts** | Production-grade K8s deployment | Medium |
| **One-click deploy** | Railway, Render, Fly.io templates | Medium |
| **Configuration guide** | Environment variables, secrets, networking docs | High |
| **Backup/restore** | Database and file backup tooling | Medium |

```mermaid
flowchart TD
    subgraph Docker["Docker Compose"]
        W[Web Container - Next.js]
        A[API Container - NestJS/Bun]
        DB[PostgreSQL Container]
        R[Redis Container - optional]
    end

    W -->|Port 3000| LB[Reverse Proxy / Load Balancer]
    A -->|Port 3001| LB
    A --> DB
    A --> R
```

## Plugin System

**Current state**: No plugin or extension mechanism.

**Planned**:

| Feature | Description | Priority |
|---------|-------------|----------|
| **Custom agent behaviors** | Plugins that extend agent tool sets | Medium |
| **UI extensions** | Custom panels, widgets, and views | Low |
| **Custom renderers** | Plugin-defined content renderers | Low |
| **Event hooks** | React to workspace events with custom logic | Medium |
| **Plugin registry** | Discover and install community plugins | Low |

## Contributing

Interested in contributing to any of these features? Check the repository for open issues tagged with `roadmap` or `help-wanted`.

## Related Documentation

- [System Overview](../architecture/overview.md) -- Current architecture
- [Daemon System](../technical/daemon.md) -- Current agent execution model
- [Authentication](../technical/auth.md) -- Current auth system
- [File Management](../features/file-management.md) -- Current file storage
- [AI Providers](../features/ai-providers.md) -- Current provider support
