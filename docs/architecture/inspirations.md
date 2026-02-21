# Design Inspirations

MonokerOS draws from three distinct domains -- container orchestration, agentic AI, and project management -- and fuses them into a single platform. Understanding these inspirations clarifies why the platform is structured the way it is and where its terminology comes from.

```mermaid
graph TB
    subgraph K8S["Kubernetes<br/>Infrastructure & Orchestration"]
        K1["Namespaces"]
        K2["Pods & Services"]
        K3["Deployments"]
        K4["PersistentVolumes"]
        K5["Ingress / Traefik"]
        K6["Readiness / Liveness Probes"]
        K7["Declarative YAML Manifests"]
    end

    subgraph OC["OpenClaw / ZeroClaw<br/>Agentic AI"]
        O1["Autonomous Agents"]
        O2["Tool Use"]
        O3["Long-Term Memory"]
        O4["System Prompts as Personality"]
        O5["Constrained Autonomy"]
        O6["Lightweight Runtime"]
    end

    subgraph PM["Jira / Linear<br/>Project Management"]
        P1["Kanban Boards"]
        P2["Sprint Planning"]
        P3["Status Workflows"]
        P4["Priority Tiers"]
        P5["Assignment & Teams"]
        P6["SDLC Methodology"]
    end

    subgraph MK["MonokerOS<br/>Operating System for AI Agent Teams"]
        M1["Workspaces"]
        M2["AI Agents with Daemons"]
        M3["Teams & Org Chart"]
        M4["Drives & File System"]
        M5["Mono Dispatcher"]
        M6["SDLC Gates"]
        M7["YAML Manifests"]
        M8["Projects & Tasks"]
        M9["Chat with Tool Calling"]
    end

    K1 & K7 -->|inform| M1 & M7
    K2 -->|inform| M2
    K3 -->|inform| M3
    K4 -->|inform| M4
    K5 -->|inform| M5
    K6 -->|inform| M6

    O1 & O5 -->|inform| M2
    O2 -->|inform| M9
    O3 -->|inform| M2
    O4 -->|inform| M2
    O6 -->|inform| M2

    P1 & P3 -->|inform| M8
    P2 & P6 -->|inform| M6
    P4 & P5 -->|inform| M8
    P5 -->|inform| M3

```

---

## Kubernetes Parallels

MonokerOS borrows heavily from Kubernetes in its resource model, declarative configuration, lifecycle management, and separation of desired state from runtime state. The analogy runs deep -- MonokerOS is effectively "Kubernetes for AI agents" rather than containers.

### Resource Mapping

| Kubernetes | MonokerOS | Parallel |
|---|---|---|
| **Namespace** | **Workspace** | Isolated environment with its own set of resources. All resources are scoped within a workspace, just as Kubernetes resources are scoped within a namespace. Multi-tenancy boundary. |
| **Pod / Service** | **Agent (+ ZeroClaw Daemon)** | The fundamental unit of execution. Each agent runs as its own process (a Bun child process), analogous to how each Pod runs its own container(s). Has lifecycle states, health checks, and restart policies. |
| **Deployment / ReplicaSet** | **Team** | A logical grouping of Pods (agents) with a defined purpose. Teams organize agents by function (engineering, design, QA) just as Deployments organize replicas of a service. |
| **PersistentVolume / PVC** | **Drive** | Shared storage that persists independently of agents. Drives can be mounted by multiple agents with configurable access (read-only, read-write), scoped by category (personal, team, project, workspace). |
| **Ingress Controller / Traefik** | **Mono (Dispatcher Agent)** | The entry point for user requests. Mono receives all incoming messages and routes them to the appropriate agent, or delegates project management work to Keros -- analogous to how Traefik routes HTTP traffic to backend services. |
| **Job / CronJob** | **Project** | A defined unit of work with completion criteria. Projects have phases (analogous to Job steps), defined teams and members, and drive allocations. |
| **ReadinessProbe / LivenessProbe** | **SDLC Gates** | Quality checkpoints. SDLC gates require approval before a project can advance to the next phase, just as Kubernetes probes verify a Pod is ready to receive traffic. Gates support `pending`, `awaiting_approval`, `approved`, `rejected`, and `bypassed` states. |
| **ConfigMap / Secret** | **Agent Config (SOUL.md, config.toml)** | Declarative configuration injected into the agent at startup. The daemon reads `config.toml`, `SOUL.md`, `FOUNDATION.md`, `AGENTS.md`, and `SKILLS.md` from its working directory, similar to how a Pod reads ConfigMaps and Secrets. |
| **etcd (source of truth)** | **SQLite (planned) / MockStore** | The authoritative data store. Kubernetes uses etcd; MonokerOS uses SQLite (planned) with the API as the primary interface. YAML manifests are the import/export format, not the source of truth -- exactly mirroring `kubectl apply`. |
| **Controller / Reconciler** | **Reconciler Service** | Watches desired state in the database and reconciles it with actual state by starting, stopping, or restarting agent daemons. Implements exponential backoff for failed agents. |

### Manifest Format

MonokerOS uses Kubernetes-style YAML manifests for declarative resource definition:

```yaml
apiVersion: monokeros/v1
kind: Agent
metadata:
  name: neo
  namespace: acme-corp
  labels:
    team: development
spec:
  displayName: "Neo"
  title: "Dev Lead"
  specialization: "Architecture"
  identity:
    soulRef: ./souls/neo.md
    skills:
      - system-architecture
      - code-review
  daemon:
    autonomy: supervised
    maxToolRounds: 5
  drives:
    - name: personal
      source: members/neo
      readOnly: false
    - name: team
      source: teams/development
      readOnly: false
```

The manifest convention matches Kubernetes exactly: `apiVersion`, `kind`, `metadata` (with `name`, `namespace`, `labels`, `annotations`), and `spec`. Status is never stored in manifests -- it is runtime-only, managed by the reconciler.

Multi-document YAML is supported (separated by `---`), with apply ordering by kind priority:
```
Workspace > Agent > Team > Project > Drive > TaskTemplate > Org
```

### Agent Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> stopped
    stopped --> pending: start requested
    pending --> provisioning: config generated
    provisioning --> starting: daemon spawned
    starting --> running: health check passes
    running --> stopping: stop requested / lifecycle change
    stopping --> draining: graceful shutdown
    draining --> stopped: drained

    running --> error: crash / failure
    error --> pending: retry (exponential backoff)

    note right of error
        Retry policy:
        1s, 2s, 4s, 8s
        max 5 retries
    end note
```

This mirrors Kubernetes Pod lifecycle management -- including the concept of backoff retries and the separation between desired state (`active`, `standby`, `dormant`) and observed state (`running`, `error`, `stopped`).

---

## OpenClaw / ZeroClaw Parallels

MonokerOS agents are, internally, minimal [OpenClaw](https://openclaw.ai)-style agents. OpenClaw defines a framework for building autonomous AI agents with tool use, memory, and constrained autonomy. MonokerOS adapts these concepts into a managed platform.

### What MonokerOS Draws from OpenClaw

| OpenClaw Concept | MonokerOS Implementation |
|---|---|
| **Autonomous agent** | Each MonokerOS agent is an independent process with its own conversation state, tools, and LLM access |
| **System prompt as personality** | The agent's "soul" -- a markdown file (`SOUL.md`) that defines personality, values, communication style, and expertise |
| **Tool use** | Agents can call `web_search`, `web_read`, `file_read`, `file_write`, `list_drives`, `knowledge_search`, plus role-specific tools (admin, PM, delegation) |
| **Constrained autonomy** | Configurable `autonomy` level (`supervised` or `autonomous`) and `maxToolRounds` limit (1-20) per agent |
| **Long-term memory** | Agent identity includes a `memory` array, plus persistent file drives for accumulated knowledge |
| **Context injection** | Daemon reads multiple context files at startup: `SOUL.md`, `FOUNDATION.md` (workspace context), `AGENTS.md` (team/org context), `SKILLS.md` (capabilities) |

### The ZeroClaw Daemon

The ZeroClaw daemon is MonokerOS's lightweight agent runtime -- a standalone Bun HTTP server that runs as a child process. It is intentionally minimal:

```mermaid
graph TB
    subgraph Daemon["ZeroClaw Daemon (per agent)"]
        direction TB
        CFG["Config<br/>config.toml"]
        CTX["Context Files<br/>SOUL.md, FOUNDATION.md<br/>AGENTS.md, SKILLS.md"]
        HIST["Conversation History<br/>(bounded, per-conversation)"]
        TOOLS["Tool Definitions<br/>standard + role-based"]
        LOOP["Tool-Calling Loop<br/>(max 5 rounds)"]
        HTTP["HTTP Server<br/>/health, /webhook"]
    end

    CFG --> HTTP
    CTX --> HIST
    HIST --> LOOP
    TOOLS --> LOOP
    LOOP --> HTTP

```

**Why embedded daemons instead of full OpenClaw/ZeroClaw backends?**

MonokerOS chose the embedded approach for three reasons:

1. **Security** -- Each daemon is a child process of the API server, running with a unique webhook secret. There is no network exposure beyond localhost. The API server controls the daemon's entire lifecycle.

2. **Performance** -- No network hop to an external agent runtime. The daemon is co-located with the API server and communicates via HTTP on localhost. Startup time is sub-second since Bun spawns processes efficiently.

3. **Simplicity** -- The daemon is a single TypeScript file (~1000 lines) that reads config, maintains conversation history, calls an LLM, and executes tools. No external dependencies beyond the LLM provider API.

**Future direction:** MonokerOS may support pluggable agent backends -- including full OpenClaw or ZeroClaw runtimes -- as an alternative to the embedded daemon. This would allow more sophisticated agent behaviors (multi-step planning, complex memory systems, agent-to-agent delegation) while keeping the platform's orchestration layer intact.

### Tool Calling Architecture

```mermaid
sequenceDiagram
    participant D as Daemon
    participant LLM as LLM Provider
    participant API as MonokerOS API
    participant Web as External Web

    D->>LLM: chat/completions (messages + tools)

    alt LLM returns tool_calls
        LLM-->>D: tool_calls: [web_search, file_read]

        par Execute tools in sequence
            D->>Web: web_search("React 19 features")
            Web-->>D: Search results
            D->>API: file_read(members/neo/notes.md)
            API-->>D: File content
        end

        D->>LLM: chat/completions (+ tool results)

        alt More tool calls needed
            LLM-->>D: tool_calls: [file_write]
            D->>API: file_write(members/neo/summary.md)
            API-->>D: Write confirmation
            D->>LLM: chat/completions (+ tool results)
        end
    end

    LLM-->>D: Final text response
    D-->>D: Stream as NDJSON
```

The loop runs for a maximum of `maxToolRounds` iterations (default 5, configurable per agent up to 20). If the limit is reached, the daemon returns the last assistant response or a fallback message.

---

## Jira / Linear Parallels

MonokerOS includes a full project management layer inspired by modern PM tools like Jira and Linear. This is not an afterthought -- it is central to the platform's thesis that AI agents need structured work tracking to be productive.

### Project Management Features

| Jira / Linear | MonokerOS | Notes |
|---|---|---|
| **Projects** | **Projects** | Named containers for related work, with assigned teams and members |
| **Kanban board** | **Kanban view** | Drag-and-drop task board with status columns |
| **Gantt chart** | **Gantt view** | Timeline visualization of tasks and phases |
| **List view** | **List view** | Tabular task listing with sorting and filtering |
| **Backlog** | **Queue view** | Prioritized backlog with triage workflow |
| **Sprints** | **SDLC Phases** | Configurable phases per project (not fixed sprints) -- e.g., intake, discovery, PRD, kickoff, design, development, testing, deployment, handoff |
| **Status workflow** | **TaskStatus enum** | `backlog` -> `todo` -> `in_progress` -> `in_review` -> `awaiting_acceptance` -> `done` |
| **Priority levels** | **TaskPriority enum** | `critical`, `high`, `medium`, `low`, `none` |
| **Assignees** | **assigneeIds** | Tasks assigned to specific agents (multiple assignees supported) |
| **Labels / Components** | **Task types** | Configurable task categorization |
| **Dependencies** | **Task dependencies** | Tasks can declare dependencies on other tasks |
| **Acceptance criteria** | **Human acceptance** | `HumanAcceptanceStatus`: `pending` -> `accepted` / `rejected` |

### SDLC Gate Workflow

MonokerOS extends the Jira/Linear model with SDLC gates -- approval checkpoints between project phases that ensure quality and human oversight:

```mermaid
stateDiagram-v2
    direction LR

    state "Phase: Discovery" as disc
    state "Gate: Discovery->PRD" as g1
    state "Phase: PRD Proposal" as prd
    state "Gate: PRD->Design" as g2
    state "Phase: Design" as design
    state "Gate: Design->Dev" as g3
    state "Phase: Development" as dev

    [*] --> disc
    disc --> g1: Phase complete

    state g1 {
        [*] --> pending
        pending --> awaiting_approval: Submit for review
        awaiting_approval --> approved: Approver accepts
        awaiting_approval --> rejected: Approver rejects
        rejected --> awaiting_approval: Resubmit
    }

    g1 --> prd: approved
    prd --> g2: Phase complete
    g2 --> design: approved
    design --> g3: Phase complete
    g3 --> dev: approved
```

Each gate has a designated approver (configurable per phase, with a default approver as fallback). Gate statuses are:
- `pending` -- Phase work not yet submitted
- `awaiting_approval` -- Submitted for review
- `approved` -- Gate passed, next phase unlocked
- `rejected` -- Sent back for rework
- `bypassed` -- Skipped (admin override)

### Cross-Validation

A feature unique to MonokerOS: multiple agents can independently work on the same task, and their outputs are compared for consensus. This borrows from the software engineering concept of code review but applies it to AI-generated work:

```mermaid
graph TB
    TASK["Task: API Schema Design"]
    A1["Agent: Neo<br/>(primary)"]
    A2["Agent: Krennic<br/>(validator)"]
    CMP["Comparison Engine"]
    RESULT{Consensus?}
    MATCH["Matched<br/>confidence: high"]
    DISC["Discrepancy<br/>escalate to human"]

    TASK --> A1 & A2
    A1 & A2 --> CMP
    CMP --> RESULT
    RESULT -->|>80% agreement| MATCH
    RESULT -->|<80% agreement| DISC

```

The `ConsensusState` enum tracks the cross-validation lifecycle: `executing` -> `comparing` -> `matched` / `discrepancy` -> `retrying` / `escalated` -> `resolved`.

---

## Where the Inspirations Converge

The power of MonokerOS comes from combining these three domains into something none of them offers alone:

```mermaid
graph TB
    subgraph Problem["The Problem"]
        P1["Kubernetes orchestrates containers,<br/>not intelligent agents"]
        P2["OpenClaw builds individual agents,<br/>not teams with project structure"]
        P3["Jira manages human work,<br/>not AI agent work"]
    end

    subgraph Solution["MonokerOS: The Convergence"]
        S1["Kubernetes-grade orchestration<br/>for AI agent lifecycles"]
        S2["OpenClaw-quality agent intelligence<br/>with tool use and memory"]
        S3["Jira-class project management<br/>purpose-built for AI teams"]
    end

    P1 --> S1
    P2 --> S2
    P3 --> S3

    S1 & S2 & S3 --> OS["An Operating System<br/>for AI Agent Teams"]

```

### The "OS" Vision

MonokerOS positions itself as an operating system -- not a heavyweight framework, but a **lean, minimal, yet featureful** platform that provides the core primitives for running AI agent organizations:

| OS Primitive | MonokerOS Implementation | Inspiration Source |
|---|---|---|
| Process management | Agent daemon lifecycle (spawn, monitor, restart, kill) | Kubernetes + OpenClaw |
| Filesystem | Hierarchical drives with ACLs and category scoping | Kubernetes PVs + traditional OS |
| IPC | WebSocket chat with NDJSON streaming and room-scoped events | OpenClaw + traditional OS |
| Scheduler | Mono dispatcher routes requests; reconciler manages desired state | Kubernetes scheduler |
| User management | Workspace-scoped RBAC with JWT + API keys | Kubernetes RBAC |
| Package management | YAML manifests with `apply` / `export` | Kubernetes + Helm |
| Init system | Reconciler watches database, ensures daemons match desired state | Kubernetes controller manager |
| Logging | Per-agent daemon logs with rotation | Kubernetes container logging |
| Audit trail | Audit log for all mutations (who, what, when) | Enterprise compliance |

### Compatibility and Extensibility

MonokerOS is designed to integrate with existing stacks rather than replace them:

- **31+ AI providers** via the OpenAI-compatible API pattern -- use any model from any provider
- **MCP server** with 9 tool categories -- integrate with Claude, Cursor, Windsurf, or any MCP-compatible client
- **REST API** with workspace-scoped routes -- build custom integrations or alternative frontends
- **YAML manifests** as import/export format -- version control your workspace configuration in Git
- **Industry presets** for 15 verticals (5 at launch) -- not just software development

The platform supports the full spectrum from fully supervised (human approves every action) to fully autonomous (agents operate independently within configured boundaries), with SDLC gates providing structured checkpoints regardless of autonomy level.

---

## Related Pages

- [System Architecture](overview.md) -- Technical architecture details
- [Monorepo Structure](monorepo.md) -- Package organization and tooling
- [Workspaces](../core-concepts/workspaces.md) -- The Kubernetes namespace equivalent
- [Agents](../core-concepts/agents.md) -- The Kubernetes pod equivalent
- [Teams](../core-concepts/teams.md) -- The Kubernetes deployment equivalent
- [Drives](../core-concepts/drives.md) -- The Kubernetes PersistentVolume equivalent
- [Projects & Tasks](../core-concepts/projects.md) -- Project management layer
