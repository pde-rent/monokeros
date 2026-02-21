# MonokerOS Workspace Architecture v3 — Final

> "The Kubernetes of Agent Orchestration"

## 1. Executive Summary

Transform MonokerOS from a single-workspace prototype into a **config-first, multi-tenant agent orchestration platform**. Every entity — workspaces, orgs, teams, agents, projects, and drives — is defined declaratively via versioned YAML manifests that serve as an **import/export serialization format**, while **SQLite is the runtime source of truth**.

### Core Principles

- **API-first**: All CRUD goes through the REST API. SQLite is the source of truth.
- **Declarative config**: YAML manifests are the import/export format — `apply` reads YAML and calls the API, `export` writes YAML from the API.
- **Composable**: Individual resources (agents, teams) are self-contained and portable across workspaces.
- **Minimal**: Only configurable fields live in manifests; dynamic state (tasks, messages, health) is runtime-only.
- **Versionable**: Every manifest is git-friendly and diffable.
- **Single type source**: Zod schemas generate both TypeScript types and JSON Schema for YAML IDE validation.

### Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Source of truth | **SQLite** (not YAML on disk) | Transactions, querying, concurrent access, pagination |
| YAML role | **Import/export format** | Avoids race conditions, partial writes, no-transaction problems |
| Reconciler watches | **Database** (not filesystem) | Reliable change detection, atomic operations |
| Chat storage | **SQLite primary** + async encrypted JSONL export | Sub-ms writes, ACID, pagination, search on metadata |
| Tasks in manifests? | **No** — runtime-only in SQLite | Tasks are ephemeral state, not configuration |
| Agent daemon IPC | **Unix domain sockets** (not TCP ports) | Eliminates port conflicts across workspaces |
| Agent import | **Independent copies** (not shared registry) | Simpler, no cross-workspace coupling |
| Org structure | **Flexible** — departments, squads, task forces | Supports matrix orgs. **Optional** — flat team model works without it |
| Primary keys | **16-char hex ID** + unique `name` secondary key | Renames don't cascade; human-readable names for YAML/API; compact IDs |
| Phases & team types | **String-based** (not enums) | Industry-aware, configurable per workspace |

### Naming Decisions

| Term | Usage | Notes |
|------|-------|-------|
| **Org** | Organizational topology resource | Not "Orga" — English-standard |
| **Permission** | Granular action strings (`members:read`, `tasks:write`) | **Unchanged** — these ARE permissions, not roles |
| **WorkspaceRole** | RBAC level (`admin`, `validator`, `viewer`) | Already exists as enum |
| **Roles** page | Frontend page at `/{workspace}/roles` | UI label for access management (was `/permissions` route) |
| `agent.title` | Agent's job title ("Dev Lead") | Not `role` — avoids collision with RBAC `role` |

---

## 2. Design Decisions & Trade-offs

### 2.1 API-first, not filesystem-first

Kubernetes uses etcd (a database) as its source of truth, not YAML files. `kubectl apply` is a thin client that POSTs to the API server. The correct architecture:

```
SQLite (source of truth) ← API (primary interface) ← YAML (import/export format)
                          ↓
                     Reconciler (watches DB, manages agent daemons)
```

### 2.2 Encrypted chat storage — threat model

**What the encryption protects against:**
- Direct database file theft (without the workspace master key, content is unreadable)
- Backup/export file compromise (JSONL exports are encrypted)
- Unauthorized drive browsing (agents can only decrypt conversations they're participants in)
- Removed participants (after key rotation, revoked participants cannot decrypt new messages)

**What the encryption does NOT protect against:**
- A compromised API server (the server holds the workspace master key and can decrypt everything transiently)
- Memory inspection of the running API process
- Admin with access to the workspace master key

**This is encryption-at-rest with key-based access control, not end-to-end encryption.** The server must decrypt transiently for agent processing. The security boundary is the workspace master key — without it, no content can be read from disk or backups.

### 2.3 Workspace master key lifecycle

```
Generation:   crypto.randomBytes(32) during workspace creation
Storage:      File at data/workspaces/{name}/.master-key (chmod 600)
              NOT inside SQLite — avoids circular dependency
Rotation:     New key generated → re-encrypt all member_keypairs.private_key_encrypted
              → old key kept in .master-key.prev for rollback
Backup:       If master key is lost, all encrypted chat history is UNRECOVERABLE
              Mitigated by: escrow key (optional), documented backup procedures
Distribution: Loaded into API memory on workspace load, never transmitted
```

### 2.4 Phases and team types — string-based, not enums

The existing `ProjectPhase` numeric enum and `TeamType` enum are software-dev-specific. With multi-industry support, both become **workspace-configurable strings**:

- `ProjectPhase` enum → `string` type. Ordering derived from position in the project's `phases: string[]` array.
- `TeamType` enum → `string` type. Colors come from each team's own `color` field, not a global constant map.
- Existing `PROJECT_PHASE_LABELS`, `TEAM_COLORS`, `TEAM_LABELS` constants → **deprecated**. Replaced by industry preset configs.
- Migration: existing numeric phase values mapped to `software_development` preset strings.

### 2.5 Tasks are runtime state, not configuration

Tasks are created, assigned, completed, archived. They live in SQLite only. For predefined task patterns, use **TaskTemplate** manifests.

### 2.6 Permission type stays, page renames to "Roles"

The `Permission` type (`'members:read' | 'tasks:write' | ...`) lists granular actions — these ARE permissions in RBAC terminology. The `@Permissions()` decorator and `PermissionsGuard` keep their names. Only the frontend route and page title change: `/permissions` → `/roles` with display name "Roles & Access".

---

## 3. Resource Model

### 3.1 Manifest Convention

```yaml
apiVersion: monokeros/v1
kind: <ResourceKind>
metadata:
  name: <unique-within-namespace>     # kebab-case, max 63 chars
  namespace: <workspace-name>         # omitted for Workspace resources
  labels: {}                          # optional, for filtering
  annotations: {}                     # optional, for tooling
spec:
  # User-defined desired state
```

**Multi-document YAML** supported (`---` separators). Apply ordering by kind priority:
```
Workspace → Agent → Team → Project → Drive → TaskTemplate → Org
```
Agents before Teams because Teams reference agents as `lead`/`members`. Org last because it references all other resources.

`status` is **never** in YAML files — runtime-only, managed by reconciler, exposed via API.

### 3.2 Workspace

```yaml
apiVersion: monokeros/v1
kind: Workspace
metadata:
  name: acme-corp                      # This IS the slug (max 63 chars)
spec:
  displayName: "Acme Corporation"
  description: "Product development workspace"
  industry: software_development
  industrySubtype: web                 # validated against industry's subtypes

  branding:
    logo: null
    color: "#6366f1"

  encryption:
    algorithm: aes-256-gcm
    escrowEnabled: false               # admin audit access to encrypted chats

  storage:
    driver: filesystem
    basePath: ./data

  defaults:
    model: glm-5
    provider:
      baseUrl: https://api.z.ai/api/coding/paas/v4
    agent:
      autonomy: supervised
      maxToolRounds: 5
      lifecycle: active                # active | standby | dormant
      timeouts:
        llm: 120000
        health: 2000
        startup: 15000
```

### 3.3 Org (Optional — Organizational Topology)

A workspace with only Teams and Agents (no Org resource) works fine — the reconciler derives a flat org automatically. The Org resource is for cross-functional structures. **Singleton per workspace** — at most one Org resource named `default`.

```yaml
apiVersion: monokeros/v1
kind: Org
metadata:
  name: default
  namespace: acme-corp
spec:
  directors:
    - member: panos
      title: CEO
      oversees: [product, content]
    - member: paul
      title: CTO
      oversees: [engineering, research]

  structure:
    - name: engineering
      type: department
      lead: paul
      teams: [development, devops, testing-qa]

    - name: product
      type: department
      lead: panos
      teams: [product-management, seo-marketing, documentation]

    # Cross-functional squad
    - name: payments-squad
      type: squad
      lead: neo
      members:
        - from: development
          agents: [krennic]
        - from: ui-ux-design
          agents: [draper]
      project: meridian-storefront

    # Temporary task force
    - name: incident-response
      type: taskforce
      lead: han
      members:
        - from: devops
          agents: [clu, smith]
        - from: development
          agents: [elliot]
      expiresAt: "2026-04-01"

  reporting:
    chain: [member, lead, director]    # ordered array, not freeform string
    escalation:
      - from: lead
        to: director
        trigger: blocked               # blocked | timeout | manual
```

### 3.4 Team

```yaml
apiVersion: monokeros/v1
kind: Team
metadata:
  name: development
  namespace: acme-corp
spec:
  displayName: "Development"
  type: engineering                    # industry-aware string (not enum)
  color: "#10b981"
  lead: neo                            # Team is authoritative for lead assignment
  members: [flynn, krennic, elliot]
  drive:
    capacity: 10Gi
    protected: [/templates]
```

### 3.5 Agent

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
  title: "Dev Lead"                    # NOT "role" — avoids RBAC collision
  specialization: "Architecture"

  identity:                            # Portable section
    soulRef: ./souls/neo.md            # External file reference
    # OR inline: soul: |
    skills:
      - system-architecture
      - code-review
      - technical-mentoring
      - api-design
    memory: []

  model:                               # Override workspace defaults
    name: glm-5
    provider:
      baseUrl: https://api.z.ai/api/coding/paas/v4

  daemon:
    autonomy: supervised
    maxToolRounds: 5

  drives:                              # Docker-volume-style mounts
    - name: personal
      source: members/neo
      readOnly: false
    - name: team
      source: teams/development
      readOnly: false
    - name: shared
      source: workspace
      readOnly: true
```

### 3.6 Project

```yaml
apiVersion: monokeros/v1
kind: Project
metadata:
  name: meridian-storefront
  namespace: acme-corp
spec:
  displayName: "Meridian Storefront"
  description: "E-commerce platform for Meridian brand"
  color: "#6366f1"
  types: [web]

  assignments:
    teams: [development, ui-ux-design, testing-qa]
    members: [neo, edna]

  phases: [intake, discovery, prd-proposal, kickoff, design, development, testing, deployment, handoff]
  gateApprovers:
    default: panos
    overrides:
      development: paul
      deployment: paul

  drive:
    capacity: 50Gi
    protected: [/deliverables, /contracts]

  chat:
    enabled: true
    encrypted: true
```

### 3.7 TaskTemplate (optional)

```yaml
apiVersion: monokeros/v1
kind: TaskTemplate
metadata:
  name: api-schema-review
  namespace: acme-corp
spec:
  title: "API Schema Review"
  description: |
    Review and validate the API schema design.
  defaultTeam: development
  defaultPhase: development
  defaultPriority: high
  crossValidation:
    enabled: true
    minAgreement: 80
```

### 3.8 Drive

```yaml
apiVersion: monokeros/v1
kind: Drive
metadata:
  name: shared-templates
  namespace: acme-corp
spec:
  type: workspace
  displayName: "Shared Templates"
  capacity: 5Gi
  protected: [/]
  acl:
    - principal: role:admin
      access: [read, write, delete]
    - principal: role:lead
      access: [read, write]
    - principal: role:member
      access: [read]
```

---

## 4. Technical Architecture

### 4.1 Data Flow

```
                 ┌────────-─────┐
                 │    Web UI    │
                 └──────┬───────┘
                        │ HTTP + WS
                        ▼
                 ┌──────────-───┐
  YAML ──apply──▶│   REST API   │──export──▶ YAML
                 │   (NestJS)   │
                 └──────┬───────┘
                        │ read/write
                        ▼
                 ┌─────────-────┐
                 │   SQLite     │  Source of truth
                 │  (bun:sqlite)│  registry.db + per-workspace .db
                 └──────┬───────┘
                        │ poll/watch
                        ▼
                 ┌──────────-───┐
                 │  Reconciler  │  Manages agent daemons, drives, health
                 └──────┬───────┘
                        │ IPC (Unix domain sockets)
                        ▼
                 ┌─────────-────┐
                 │ Agent Daemons│  Bun processes with LLM access (ZeroClaw instances)
                 └─────────-────┘
```

### 4.2 Directory Structure

```
data/
├── registry.db                         # Global: workspace list, user memberships
└── workspaces/
    └── {workspace-name}/
        ├── .master-key                 # Workspace encryption master key (chmod 600)
        ├── .master-key.prev            # Previous master key (for rotation rollback)
        ├── workspace.db                # All runtime state for this workspace
        ├── runtime/
        │   └── agents/
        │       └── {agent-name}/
        │           ├── config.toml     # Generated by reconciler
        │           ├── SOUL.md         # From agent identity
        │           ├── IDENTITY.md     # From agent metadata
        │           ├── FOUNDATION.md   # From workspace config
        │           ├── AGENTS.md       # From org + teams
        │           ├── SKILLS.md       # From agent skills
        │           ├── daemon.sock     # Unix domain socket
        │           ├── daemon.log      # Stdout/stderr (rotated)
        │           └── memory/
        │               └── memory.db
        └── drives/
            ├── members/{agent-name}/
            ├── teams/{team-name}/
            ├── projects/{project-name}/
            ├── shared/
            │   └── chats/              # System-protected
            │       └── {conv-id}.jsonl # Encrypted backup/export
            └── custom/{drive-name}/
```

### 4.3 Database Schema

**Global registry** (`data/registry.db`):
```sql
CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,                  -- 16-char hex (8 bytes, e.g. 'a1b2c3d4e5f67890')
  name TEXT UNIQUE NOT NULL,            -- kebab-case slug, max 63 chars
  display_name TEXT NOT NULL,
  industry TEXT NOT NULL,
  industry_subtype TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- active | paused | archived
  created_at TEXT NOT NULL,
  archived_at TEXT
);

CREATE TABLE users (
  id TEXT PRIMARY KEY,                  -- 16-char hex
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE workspace_members (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  role TEXT NOT NULL,                   -- admin | validator | viewer
  joined_at TEXT NOT NULL,
  PRIMARY KEY (workspace_id, user_id)
);
```

**Per-workspace** (`data/workspaces/{name}/workspace.db`):
```sql
-- ── Config tables (populated by API/apply, read by reconciler) ──

CREATE TABLE agents (
  id TEXT PRIMARY KEY,                  -- 16-char hex (internal)
  name TEXT UNIQUE NOT NULL,            -- kebab-case (used in YAML/API)
  display_name TEXT NOT NULL,
  title TEXT NOT NULL,                  -- job title (was "role")
  specialization TEXT NOT NULL,
  identity_soul TEXT,
  identity_soul_ref TEXT,
  identity_skills TEXT NOT NULL,        -- JSON array
  identity_memory TEXT NOT NULL DEFAULT '[]',
  model_name TEXT,
  model_provider_url TEXT,
  daemon_autonomy TEXT DEFAULT 'supervised',
  daemon_max_tool_rounds INTEGER DEFAULT 5,
  generation INTEGER NOT NULL DEFAULT 1, -- optimistic concurrency
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Normalized: agent drive mounts (queryable)
CREATE TABLE agent_drives (
  agent_id TEXT NOT NULL REFERENCES agents(id),
  drive_name TEXT NOT NULL,
  source TEXT NOT NULL,
  read_only BOOLEAN DEFAULT false,
  PRIMARY KEY (agent_id, drive_name)
);

CREATE TABLE teams (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  type TEXT NOT NULL,                   -- industry-aware string
  color TEXT NOT NULL,
  lead_agent_id TEXT NOT NULL REFERENCES agents(id),
  drive_capacity TEXT,
  drive_protected TEXT DEFAULT '[]',
  generation INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Normalized: team membership (queryable)
CREATE TABLE team_members (
  team_id TEXT NOT NULL REFERENCES teams(id),
  agent_id TEXT NOT NULL REFERENCES agents(id),
  PRIMARY KEY (team_id, agent_id)
);

CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  types TEXT NOT NULL,                  -- JSON array of strings
  phases TEXT NOT NULL,                 -- JSON array of phase strings (ordered)
  gate_approvers TEXT NOT NULL,         -- JSON {default, overrides}
  drive_capacity TEXT,
  drive_protected TEXT DEFAULT '[]',
  chat_enabled BOOLEAN DEFAULT true,
  chat_encrypted BOOLEAN DEFAULT true,
  generation INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Normalized: project assignments
CREATE TABLE project_teams (
  project_id TEXT NOT NULL REFERENCES projects(id),
  team_id TEXT NOT NULL REFERENCES teams(id),
  PRIMARY KEY (project_id, team_id)
);

CREATE TABLE project_members (
  project_id TEXT NOT NULL REFERENCES projects(id),
  agent_id TEXT NOT NULL REFERENCES agents(id),
  PRIMARY KEY (project_id, agent_id)
);

-- Org structure (optional)
CREATE TABLE org_structure (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,                   -- department | squad | taskforce
  lead_member TEXT NOT NULL,
  teams TEXT,                           -- JSON array (for departments)
  members TEXT,                         -- JSON array of {from, agents}
  project_name TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE org_directors (
  id TEXT PRIMARY KEY,
  member_name TEXT NOT NULL,            -- human member name
  title TEXT NOT NULL,
  oversees TEXT NOT NULL                -- JSON array of structure names
);

-- ── Runtime tables (managed by API, not from manifests) ──

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  project_id TEXT NOT NULL REFERENCES projects(id),
  team_id TEXT NOT NULL REFERENCES teams(id),
  phase TEXT NOT NULL,                  -- validated against project.phases
  status TEXT NOT NULL DEFAULT 'backlog',
  priority TEXT NOT NULL DEFAULT 'medium',
  assignee_ids TEXT NOT NULL DEFAULT '[]',
  dependencies TEXT NOT NULL DEFAULT '[]',
  offloadable BOOLEAN DEFAULT false,
  cross_validation TEXT,
  comment_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL,                   -- agent_dm | project_chat | group_chat
  project_id TEXT,
  created_by TEXT,                      -- participant ID who created it
  message_count INTEGER DEFAULT 0,
  last_message_at TEXT,
  created_at TEXT NOT NULL
);

-- Normalized: conversation participants
CREATE TABLE conversation_participants (
  conversation_id TEXT NOT NULL REFERENCES conversations(id),
  participant_id TEXT NOT NULL,         -- prefixed: "user:{id}" or "agent:{name}"
  joined_at TEXT NOT NULL,
  left_at TEXT,                         -- set when removed
  PRIMARY KEY (conversation_id, participant_id)
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id),
  sender_id TEXT NOT NULL,              -- prefixed: "user:{id}" or "agent:{name}"
  role TEXT NOT NULL,                   -- user | agent | system
  content_encrypted TEXT NOT NULL,      -- AES-256-GCM ciphertext (base64)
  content_iv TEXT NOT NULL,             -- IV (base64)
  key_version INTEGER NOT NULL DEFAULT 1, -- which conversation key version
  references_json TEXT DEFAULT '[]',    -- unencrypted metadata
  attachments_json TEXT DEFAULT '[]',   -- unencrypted metadata
  timestamp TEXT NOT NULL
);

-- Conversation encryption keys (versioned)
CREATE TABLE conversation_keys (
  conversation_id TEXT NOT NULL,
  participant_id TEXT NOT NULL,
  key_version INTEGER NOT NULL,
  encrypted_key TEXT NOT NULL,          -- conv key encrypted with participant's public key
  granted_at TEXT NOT NULL,
  revoked_at TEXT,
  PRIMARY KEY (conversation_id, participant_id, key_version)
);

CREATE TABLE member_keypairs (
  member_id TEXT PRIMARY KEY,           -- prefixed: "user:{id}" or "agent:{name}"
  public_key TEXT NOT NULL,
  private_key_encrypted TEXT NOT NULL   -- encrypted with workspace master key
);

-- Agent runtime status
CREATE TABLE agent_status (
  agent_id TEXT PRIMARY KEY REFERENCES agents(id),
  status TEXT NOT NULL DEFAULT 'stopped',
  -- stopped | pending | provisioning | starting | running | stopping | draining | error
  socket_path TEXT,
  pid INTEGER,
  last_health_check TEXT,
  error TEXT,
  retry_count INTEGER DEFAULT 0,
  next_retry_at TEXT,
  lifecycle TEXT DEFAULT 'active'       -- active | standby | dormant
);

-- SDLC gates
CREATE TABLE project_gates (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  phase TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  approver_id TEXT,
  approved_at TEXT,
  feedback TEXT
);

-- Schema migrations
CREATE TABLE schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL,
  checksum TEXT
);

-- Audit log
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,                 -- create | update | delete | login | export | import
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  resource_name TEXT,
  details TEXT                          -- JSON diff or description
);

-- ── Indexes ──

CREATE INDEX idx_messages_conv_ts ON messages(conversation_id, timestamp);
CREATE INDEX idx_messages_key_ver ON messages(conversation_id, key_version);
CREATE INDEX idx_tasks_project ON tasks(project_id, status);
CREATE INDEX idx_tasks_team ON tasks(team_id);
CREATE INDEX idx_audit_timestamp ON audit_log(timestamp);
CREATE INDEX idx_audit_actor ON audit_log(actor_id);
CREATE INDEX idx_conversations_project ON conversations(project_id);
CREATE INDEX idx_conv_keys_participant ON conversation_keys(participant_id);
CREATE INDEX idx_conv_participants_pid ON conversation_participants(participant_id);
CREATE INDEX idx_agent_drives_source ON agent_drives(source);
```

### 4.4 Reconciler Service

Watches the **database** and ensures agent daemons match desired state.

**Agent status state machine:**
```
stopped → pending → provisioning → starting → running
                                                 ↓ (health check passes)
                                              [healthy operational loop]
                                                 ↓ (lifecycle → standby)
                                              stopping → draining → stopped
                                                 ↓ (crash/failure)
                                              error(retryCount, nextRetryAt)
                                                 ↓ (retry)
                                              pending (back to start)
```

**Triggers:**
- On startup: full reconciliation of all active workspaces
- On DB change: incremental (agent created/updated/deleted)
- Periodic: health checks every 30s, status sync
- Lazy loading: paused/dormant workspaces only reconciled when accessed

**Failure handling:**
- Invalid agent config → reject change, emit error event, keep current running state
- Agent daemon crash → auto-restart with exponential backoff (1s → 2s → 4s → 8s, max 5 retries)
- Reconciler crash → agents continue running with last config; full reconcile on restart
- SQLite corruption → workspace enters read-only mode; manifests (YAML export) can rebuild

### 4.5 Encrypted Chat

**Key hierarchy:**
```
Workspace master key (.master-key file, chmod 600)
    └── encrypts member_keypairs.private_key_encrypted

Per-conversation symmetric key (AES-256-GCM, versioned)
    └── encrypted per-participant with their public key
    └── stored in conversation_keys (with key_version)
    └── new version on participant removal (key rotation)
```

**Participant removal (atomic in single SQLite transaction):**
```sql
BEGIN;
  -- 1. Mark participant as removed
  UPDATE conversation_participants SET left_at = ? WHERE conversation_id = ? AND participant_id = ?;
  -- 2. Revoke old key version for removed participant
  UPDATE conversation_keys SET revoked_at = ? WHERE conversation_id = ? AND participant_id = ? AND key_version = ?;
  -- 3. Insert new key version for all remaining participants
  INSERT INTO conversation_keys (conversation_id, participant_id, key_version, encrypted_key, granted_at)
    VALUES (?, ?, new_version, ?, ?); -- one per remaining participant
COMMIT;
```

Messages record `key_version` so historical messages remain decryptable with old keys by non-revoked participants.

**Optional escrow:** If `encryption.escrowEnabled`, every conversation key version is additionally encrypted for the workspace escrow public key.

### 4.6 Multi-Tenancy & URL Routing

**Frontend (Next.js 15):**
```
app/
├── login/page.tsx
├── workspaces/
│   ├── page.tsx                        # Launchpad (list + create/edit/pause/delete)
│   └── new/
│       └── page.tsx                    # Creation wizard (4 steps)
├── [workspace]/
│   ├── layout.tsx                      # Workspace context + sidebar
│   ├── page.tsx                        # Dashboard (agent health, activity, progress)
│   ├── org/page.tsx                    # Org chart (optional, matrix-aware)
│   ├── projects/
│   │   ├── page.tsx                    # Project list
│   │   └── [project]/
│   │       ├── page.tsx                # Default view (kanban)
│   │       ├── kanban/page.tsx
│   │       ├── gantt/page.tsx
│   │       ├── list/page.tsx
│   │       └── queue/page.tsx
│   ├── chat/
│   │   ├── page.tsx                    # Conversation list
│   │   └── [conversation]/page.tsx     # Chat view
│   ├── files/page.tsx                  # Drive explorer (view mode toggle)
│   ├── roles/page.tsx                  # Roles & access management
│   └── settings/page.tsx               # Workspace settings
```

**Workspace launchpad (`/workspaces`):**
- Grid of workspace cards with name, industry icon, status badge (active/paused)
- Each card has a three-dot menu: **Settings** (modal), **Pause/Resume** (confirmation), **Delete** (type `metadata.name` to confirm)
- "Create workspace" button → wizard
- Delete confirmation: type the workspace `name` (slug), not the display name. Shows: "This workspace will be archived for 90 days before permanent deletion."

**Workspace switcher:** Top-nav shows current workspace name with a dropdown for quick switching. "View all" links to launchpad.

**Workspace creation wizard (4 steps):**
1. **Branding**: Name (becomes slug), display name, logo, primary color
2. **Industry**: Select from `WorkspaceIndustry` → subtypes (shows preview of default teams/phases)
3. **Customize**: Editable checklist of default teams (toggle, rename, recolor). Toggle: "Generate default agents" (on by default). Phase list (reorder, add, remove).
4. **Review & Create**: Summary of what will be provisioned, confirm.

**Legacy route redirects:** Old `chat/[agentIds]` routes redirect to `chat/{conversationId}` by participant lookup.

**API routing (workspace-scoped):**
```
POST   /api/auth/login
GET    /api/auth/me

CRUD   /api/workspaces
POST   /api/workspaces/:name/pause
POST   /api/workspaces/:name/resume

GET    /api/workspaces/:name/org
PUT    /api/workspaces/:name/org

CRUD   /api/workspaces/:name/teams
CRUD   /api/workspaces/:name/agents
POST   /api/workspaces/:name/agents/import
POST   /api/workspaces/:name/agents/:name/export

CRUD   /api/workspaces/:name/projects
CRUD   /api/workspaces/:name/tasks

CRUD   /api/workspaces/:name/conversations
POST   /api/workspaces/:name/conversations/:id/messages
POST   /api/workspaces/:name/conversations/:id/participants

GET    /api/workspaces/:name/files/drives
CRUD   /api/workspaces/:name/files/:category/:owner

POST   /api/workspaces/:name/apply       # multi-doc YAML import
GET    /api/workspaces/:name/export       # full YAML export
```

**Optimistic concurrency:** `PATCH` endpoints require `generation` in request body. Server returns `409 Conflict` with current resource if generation mismatch.

**Auth:** Short-lived access tokens (15 min) + refresh tokens. JWT payload: `{ sub: userId, email, name }`. Workspace role checked server-side per request (cached 1 min).

### 4.7 Agent Import/Export

**Export** produces portable YAML (no namespace, no workspace-specific fields):
```yaml
apiVersion: monokeros/v1
kind: Agent
metadata:
  name: neo
  labels:
    origin: acme-corp
    exportedAt: "2026-02-19"
spec:
  displayName: "Neo"
  title: "Dev Lead"
  specialization: "Architecture"
  identity:
    soul: |
      You are Neo, the Development Lead...
    skills: [system-architecture, code-review, technical-mentoring, api-design]
    memory: []
  model:
    name: glm-5
  daemon:
    autonomy: supervised
    maxToolRounds: 5
```

Import creates an **independent copy** in the target workspace. Origin label tracks provenance.

---

## 5. Workspace Industry Presets

### 5.1 Initial release: 5 industries + Custom

| Industry | Subtypes | Rationale |
|----------|----------|-----------|
| **Software Development** | Web, Mobile, Web3, AI/ML, Gaming, Embedded, Desktop | Existing, already built |
| **Marketing & Communications** | Digital, Advertising, PR, Growth | High AI-agent demand |
| **Creative & Design** | Branding, UX/Product, Content Production, Web Design | Natural agent fit |
| **Management Consulting** | Strategy, Operations, Technology, Organizational | Proves cross-industry flexibility |
| **Custom / Blank** | — | Users define own teams and phases |

**Deferred to post-launch** (9 additional industries ready in constants but hidden behind feature flag):
Legal, Financial Services, Recruitment & HR, Compliance & Risk, Translation & Localization, Supply Chain & Logistics, Data & Analytics, Healthcare & Life Sciences, Real Estate, Education & Training.

### 5.2 Industry Enum & Config

```typescript
export enum WorkspaceIndustry {
  SOFTWARE_DEVELOPMENT = 'software_development',
  MARKETING_COMMUNICATIONS = 'marketing_communications',
  CREATIVE_DESIGN = 'creative_design',
  MANAGEMENT_CONSULTING = 'management_consulting',
  CUSTOM = 'custom',
  // Deferred:
  LEGAL = 'legal',
  FINANCIAL_SERVICES = 'financial_services',
  RECRUITMENT_HR = 'recruitment_hr',
  COMPLIANCE_RISK = 'compliance_risk',
  TRANSLATION_LOCALIZATION = 'translation_localization',
  SUPPLY_CHAIN_LOGISTICS = 'supply_chain_logistics',
  DATA_ANALYTICS = 'data_analytics',
  HEALTHCARE_LIFE_SCIENCES = 'healthcare_life_sciences',
  REAL_ESTATE = 'real_estate',
  EDUCATION_TRAINING = 'education_training',
}

// Valid subtypes per industry (for Zod refinement validation)
export const INDUSTRY_SUBTYPES: Record<WorkspaceIndustry, string[]> = {
  [WorkspaceIndustry.SOFTWARE_DEVELOPMENT]: ['web', 'mobile', 'web3', 'ai_ml', 'gaming', 'embedded', 'desktop'],
  [WorkspaceIndustry.MARKETING_COMMUNICATIONS]: ['digital_marketing', 'advertising', 'pr_comms', 'growth'],
  // ...
  [WorkspaceIndustry.CUSTOM]: [],
};
```

Each industry in `WORKSPACE_INDUSTRIES` constant provides: `label`, `description`, `icon`, `subtypes`, `defaultTeams`, `defaultPhases`.

---

## 6. Zod Schema Definitions

### 6.1 Package structure

```
packages/types/src/
├── index.ts
├── enums.ts                            # + WorkspaceIndustry
├── models.ts                           # Runtime models (Permission stays)
├── validation.ts                       # API DTOs
├── ws.ts
├── zeroclaw.ts                         # Updated: socketPath, new statuses
└── manifests/
    ├── index.ts
    ├── common.ts                       # metadataSchema, manifestBase()
    ├── workspace.manifest.ts
    ├── org.manifest.ts
    ├── team.manifest.ts
    ├── agent.manifest.ts
    ├── project.manifest.ts
    ├── task-template.manifest.ts
    ├── drive.manifest.ts
    └── generate-schemas.ts             # bun run generate-schemas
```

### 6.2 Key schemas

```typescript
// common.ts
const nameRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

export const metadataSchema = z.object({
  name: z.string().regex(nameRegex).max(63),
  namespace: z.string().regex(nameRegex).max(63).optional(),
  labels: z.record(z.string(), z.string()).optional(),
  annotations: z.record(z.string(), z.string()).optional(),
});

export const manifestBase = <K extends string>(kind: K) =>
  z.object({
    apiVersion: z.literal('monokeros/v1'),
    kind: z.literal(kind),
    metadata: metadataSchema,
  });

// agent.manifest.ts
export const agentManifestSchema = manifestBase('Agent').extend({
  spec: z.object({
    displayName: z.string(),
    title: z.string(),                  // job title (not "role")
    specialization: z.string(),
    identity: z.object({
      soul: z.string().optional(),
      soulRef: z.string().optional(),
      skills: z.array(z.string()).min(1),
      memory: z.array(z.string()).default([]),
    }).refine(d => d.soul || d.soulRef, { message: 'Either soul or soulRef required' }),
    model: z.object({
      name: z.string().default('glm-5'),
      provider: z.object({ baseUrl: z.string().url() }).optional(),
    }).optional(),
    daemon: z.object({
      autonomy: z.enum(['supervised', 'autonomous']).default('supervised'),
      maxToolRounds: z.number().int().min(1).max(20).default(5),
    }).optional(),
    drives: z.array(z.object({
      name: z.string(),
      source: z.string(),
      readOnly: z.boolean().default(false),
    })).optional(),
  }),
});

// workspace.manifest.ts — industrySubtype validation
export const workspaceManifestSchema = manifestBase('Workspace').extend({
  spec: z.object({
    displayName: z.string(),
    description: z.string().optional(),
    industry: z.nativeEnum(WorkspaceIndustry),
    industrySubtype: z.string().optional(),
    branding: z.object({ /* ... */ }).optional(),
    encryption: z.object({ /* ... */ }).optional(),
    storage: z.object({ /* ... */ }).optional(),
    defaults: z.object({ /* ... */ }).optional(),
  }).refine(d => {
    if (!d.industrySubtype) return true;
    return INDUSTRY_SUBTYPES[d.industry]?.includes(d.industrySubtype);
  }, { message: 'industrySubtype must be valid for the selected industry' }),
});
```

### 6.3 JSON Schema generation

```typescript
// generate-schemas.ts — bun run generate-schemas
import { z } from 'zod/v4';
import * as schemas from './index';

const dir = './schemas';
Bun.mkdirSync(dir, { recursive: true });

for (const [name, schema] of Object.entries(schemas.manifests)) {
  const jsonSchema = z.toJSONSchema(schema, { target: 'draft-2020-12' });
  Bun.write(`${dir}/${name}.v1.schema.json`, JSON.stringify(jsonSchema, null, 2));
}
```

---

## 7. Migration Plan

### Phase 1 — Persistence & Foundation
1. Replace `MockStore` with SQLite (`bun:sqlite`, WAL mode, busy_timeout 30s)
2. Schema migrations system (`schema_migrations` table + numbered SQL files)
3. **Breaking**: `ProjectPhase` enum → `string` type. Migration function maps numeric values to `software_development` preset strings.
4. **Breaking**: `TeamType` enum → `string` type. Deprecate `TEAM_COLORS`, `TEAM_LABELS` constants. Teams carry own `color`.
4b. **Breaking**: `ProjectType` enum → `string` type. Same pattern — project types become workspace-configurable strings derived from industry subtypes. Existing values (`web`, `mobile`, etc.) map directly to `software_development` subtypes.
5. **Breaking**: `Member.role` → `Member.title` for agent job title (to avoid RBAC collision).
6. `Workspace` model expansion (add industry, branding, encryption, defaults, status fields).
7. `ZeroClawStatus` expansion (add pending, provisioning, stopping, draining states). `AgentRuntime.port` → `AgentRuntime.socketPath`.
8. Add `WorkspaceIndustry` enum + industry presets to `@monokeros/constants`.
9. Frontend: rename `/permissions` route to `/roles` (page title: "Roles & Access"). `Permission` type unchanged.
10. Frontend: rename `/orga` route to `/org`. Component renames accordingly.
11. Deprecate `ZEROCLAW_BASE_PORT` constant.

### Phase 2 — Multi-Tenancy
1. Global `registry.db` for workspace list + user memberships
2. Workspace CRUD endpoints
3. Post-login workspace launchpad (list, create, edit, pause, delete with confirmation)
4. Workspace creation wizard (4 steps: Branding → Industry → Customize → Review)
5. Frontend `[workspace]` dynamic routing. Create `useWorkspaceRoutes()` hook.
6. Workspace switcher dropdown in top-nav.
7. JWT → short-lived (15 min) + refresh tokens. Server-side workspace auth check per request.
8. Legacy route redirects (old flat paths → workspace-scoped paths).

### Phase 3 — Config-First
1. Define all manifest Zod schemas in `packages/types/src/manifests/`
2. Generate JSON Schema files (versioned: `agent.v1.schema.json`)
3. `POST /api/workspaces/:name/apply` — parse multi-doc YAML, validate, upsert (kind-priority ordering)
4. `GET /api/workspaces/:name/export` — dump all resources as multi-doc YAML
5. Reconciler service: watches DB, manages agent daemons via Unix domain sockets
6. Agent daemon file generation from DB state
7. Agent lifecycle management (active/standby/dormant)
8. Optimistic concurrency on all config-resource PATCH endpoints (`generation` field, 409 on conflict)

### Phase 4 — Org + Import/Export + Encrypted Chat
1. Org resource with flexible structure (departments, squads, task forces)
2. Matrix-aware org chart visualization (React Flow)
3. Agent export/import (independent copies with origin tracking)
4. Encrypted chat: master key lifecycle, member keypairs, per-conversation keys (versioned)
5. Key distribution, rotation (atomic transaction), and revocation
6. Async JSONL backup export to drives
7. Audit logging (`audit_log` table)

### CLI — Deferred
The web UI and `apply`/`export` API endpoints cover all workflows. A standalone `monokeros` CLI tool is deferred to a future phase. For power users: `curl -X POST .../apply -d @workspace.yaml`.

---

## 8. Observability

- Agent daemon logs: `runtime/agents/{name}/daemon.log` with rotation
- `GET /api/workspaces/:name/agents/:name/logs` endpoint
- Structured JSON logging from API and reconciler
- Workspace dashboard: agent statuses, drive usage, recent activity, project progress
- Audit log for all mutations (who, what, when)
- Health checks: reconciler polls every 30s, updates `agent_status`

---

## 9. Future Phases

- **Workspace invitations**: Email/link-based invite flow
- **SSO/SAML**: Auto-join based on email domain
- **GitOps**: Git repo → webhook → `apply`
- **Agent shared registry**: Cross-workspace agent marketplace
- **Workspace templates**: Pre-built configs beyond industry presets
- **Billing/quotas**: Drive capacity enforcement, rate limiting
- **Schema evolution**: `SchemaRegistry` for v1 → v2 migration
- **FTS5 search**: Full-text search index for chat metadata (not encrypted content)
- **CLI tool**: `monokeros init`, `apply`, `export`
- **Remaining 9 industries**: Behind feature flag, ready in constants
