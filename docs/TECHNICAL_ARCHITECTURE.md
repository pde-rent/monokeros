# MonokerOS - Technical Architecture

## Overview

TurboRepo monorepo with Bun workspaces. Two apps (Next.js frontend with TurboPack, Nest.js API on Bun runtime) with shared packages. In-memory mock store for PoC (no database). Bun is the sole runtime and package manager - no npm/pnpm/yarn.

---

## Monorepo Structure

```
monokeros/
├── apps/
│   ├── web/                    # Next.js 15 + React 19
│   └── api/                    # Nest.js 11
├── packages/
│   ├── shared-types/           # TypeScript interfaces, enums
│   ├── validation/             # Zod schemas
│   ├── ui/                     # Shared React components
│   ├── constants/              # Roles, permissions, defaults
│   ├── utils/                  # Pure utility functions
│   ├── mock-data/              # Fixtures, generators, simulators
│   └── config/                 # Shared tsconfig, lint configs
├── services/
│   └── orchestrator/           # Go + gRPC (placeholder)
├── turbo.json
├── package.json (Bun workspaces)
├── .oxlintrc.json
└── tsconfig.json
```

---

## Tech Stack

### Frontend (`apps/web`)
| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 15 | Framework (App Router) |
| React | 19 | UI library |
| TypeScript | 5.x | Type safety |
| @xyflow/react | 12.x | Diagram/flow visualization |
| @tanstack/react-query | 5.x | Server state management |
| Zustand | 5.x | Client state management |
| socket.io-client | 4.x | WebSocket client |
| @dnd-kit/core | 6.x | Drag-and-drop |
| Tailwind CSS | 4.x | Utility-first CSS |
| Zod | 3.x | Runtime validation |

### Backend (`apps/api`)
| Technology | Version | Purpose |
|-----------|---------|---------|
| Nest.js | 11 | API framework |
| Socket.io | 4.x | WebSocket server |
| TypeScript | 5.x | Type safety |
| Zod | 3.x | Request validation |

### Shared
| Technology | Purpose |
|-----------|---------|
| TurboRepo | Monorepo build orchestration |
| TurboPack | Next.js dev bundler |
| Bun | Runtime & package manager |
| oxlint | Fast linting |
| TypeScript | Shared type contracts |

---

## API Design

### REST Endpoints

```
# Agents
GET    /api/agents              # List all agents
GET    /api/agents/:id          # Get agent by ID
PATCH  /api/agents/:id/status   # Update agent status

# Teams
GET    /api/teams               # List all teams
GET    /api/teams/:id           # Get team with members

# Projects
GET    /api/projects            # List all projects
GET    /api/projects/:id        # Get project with phases
PATCH  /api/projects/:id/gate   # Update gate status

# Tasks
GET    /api/tasks               # List tasks (filterable)
GET    /api/tasks/:id           # Get task detail
POST   /api/tasks               # Create task
PATCH  /api/tasks/:id           # Update task
PATCH  /api/tasks/:id/move      # Move task (status change)
PATCH  /api/tasks/:id/assign    # Assign task to agent

# Console
GET    /api/conversations             # List conversations
GET    /api/conversations/:id         # Get conversation
POST   /api/conversations             # Create conversation
POST   /api/conversations/:id/messages # Send message

# Humans
GET    /api/humans              # List humans
GET    /api/humans/:id          # Get human by ID

# Files - Workspace Listing
GET    /api/files/workspaces              # List all workspaces (team + agent)

# Files - Team Workspaces
GET    /api/files/teams/:teamId           # Get team workspace file tree
GET    /api/files/teams/:teamId/file      # Read team file (?path=)

# Files - Agent Workspaces
GET    /api/files/agents/:agentId         # Get agent workspace file tree
GET    /api/files/agents/:agentId/file    # Read agent file (?path=)

# Files - CRUD Operations
POST   /api/files/:category/:ownerId/file     # Create file (?dir=)
POST   /api/files/:category/:ownerId/folder   # Create folder (?dir=)
PATCH  /api/files/:category/:ownerId/rename   # Rename item (?path=)
PATCH  /api/files/:category/:ownerId/content  # Update file content (?path=)
```

### WebSocket Events

#### Namespace: `/agents`
| Event | Direction | Payload |
|-------|-----------|---------|
| `agent:status-changed` | Server -> Client | `{ agentId, status, timestamp }` |
| `agent:task-assigned` | Server -> Client | `{ agentId, taskId }` |

#### Namespace: `/tasks`
| Event | Direction | Payload |
|-------|-----------|---------|
| `task:created` | Server -> Client | `{ task }` |
| `task:updated` | Server -> Client | `{ task }` |
| `task:moved` | Server -> Client | `{ taskId, from, to }` |

#### Namespace: `/console`
| Event | Direction | Payload |
|-------|-----------|---------|
| `console:message` | Both | `{ conversationId, message }` |
| `console:stream-start` | Server -> Client | `{ conversationId, agentId }` |
| `console:stream-chunk` | Server -> Client | `{ conversationId, chunk }` |
| `console:stream-end` | Server -> Client | `{ conversationId, messageId }` |
| `console:typing` | Server -> Client | `{ conversationId, agentId }` |

#### Namespace: `/projects`
| Event | Direction | Payload |
|-------|-----------|---------|
| `project:phase-changed` | Server -> Client | `{ projectId, phase }` |
| `project:gate-updated` | Server -> Client | `{ projectId, gate }` |

---

## State Management

### Client State (Zustand)
- **`ui-store`**: Active view, detail panel state, sidebar state, theme
- **`diagram-store`**: Viewport position, selected nodes, active layout mode, filter state
- **`console-store`**: Active conversations, message drafts, streaming state, split config

### Server State (TanStack Query)
- All REST data fetched and cached via TanStack Query
- Query key factory pattern:
  ```typescript
  const queryKeys = {
    agents: {
      all: ['agents'] as const,
      detail: (id: string) => ['agents', id] as const,
    },
    // ... etc
  }
  ```
- Optimistic updates for drag-and-drop task moves
- WebSocket events trigger cache invalidation

---

## File System Architecture

### Storage Layout
```
apps/api/data/
├── agents/                    # Agent-specific workspaces (private)
│   ├── agent_pm_lead/
│   ├── agent_dev_01/
│   └── ...
└── workspaces/                # Team-shared workspaces
    ├── team_pm/
    ├── team_design/
    ├── team_dev/
    ├── team_qa/
    ├── team_devops/
    └── team_seo/
```

### Two-Parent Folder Structure
- **Team Workspaces** (`data/workspaces/`): Shared across team members, organized by team ID
- **Agent Workspaces** (`data/agents/`): Private to individual agents, each containing SOUL.md, IDENTITY.md, config.toml, and work files

### Visibility Rules
- Team workspaces are visible to all users (shared collaborative spaces)
- Agent workspaces are private to the owning agent

### System Files (Non-Renameable)
- `SOUL.md` — Agent soul definition
- `IDENTITY.md` — Agent identity document
- `config.toml` — Agent configuration

---

## In-Memory Mock Store

For the PoC, all data lives in memory on the API server:

```typescript
class MockStore {
  agents: Map<string, Agent>
  teams: Map<string, Team>
  projects: Map<string, Project>
  tasks: Map<string, Task>
  conversations: Map<string, Conversation>
  humans: Map<string, Human>

  // Seeded from @monokeros/mock-data fixtures
  // Full CRUD operations on Maps
  // No persistence - resets on server restart
}
```

---

## Real-Time Architecture

```
Browser ──── Socket.io Client ──── Socket.io Server ──── MockStore
                                        │
                                   4 namespaces
                                   Room-based subs
                                   Streaming support
```

- Client connects to specific namespaces based on active view
- Room subscriptions: `conversation:conv_123`, `project:proj_456`
- Console streaming: Server emits chunks at variable speed to simulate agent typing

---

## Build & Dev

### TurboRepo Tasks
| Task | Description |
|------|-------------|
| `build` | Build all packages and apps |
| `dev` | Start all apps in development mode |
| `lint` | Run oxlint across all packages |
| `typecheck` | Run tsc --noEmit across all packages |

### Ports
- `apps/web`: http://localhost:3000
- `apps/api`: http://localhost:3001

### Package Dependencies
```
apps/web ──> packages/shared-types
         ──> packages/validation
         ──> packages/ui
         ──> packages/constants
         ──> packages/utils
         ──> packages/config

apps/api ──> packages/shared-types
         ──> packages/validation
         ──> packages/mock-data
         ──> packages/constants
         ──> packages/utils
         ──> packages/config
```
