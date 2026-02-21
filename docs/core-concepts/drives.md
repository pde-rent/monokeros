# Drives

**Drives** are the file storage system in MonokerOS -- the equivalent of Kubernetes PersistentVolumes, shared network drives, or cloud storage. Every entity in MonokerOS (agents, teams, projects, and the workspace itself) can have its own drive, creating a hierarchical file system where knowledge, deliverables, and configuration files live.

---

## What Is a Drive

A drive is a scoped file storage area attached to an entity. Drives contain files and directories that agents can read from and write to. They serve as the persistent memory layer for the AI workforce.

```mermaid
graph TB
    subgraph WS["Workspace: Acme Corp"]
        direction TB

        WDrive["Workspace Drive<br/><i>Global shared files</i>"]

        subgraph Teams["Team Drives"]
            TD1["Design Team Drive"]
            TD2["Development Team Drive"]
            TD3["QA Team Drive"]
        end

        subgraph Members["Member Drives"]
            MD1["sarah-chen<br/>(Personal)"]
            MD2["alex-park<br/>(Personal)"]
            MD3["jordan-lee<br/>(Personal)"]
        end

        subgraph Projects["Project Drives"]
            PD1["acme-redesign<br/>(Project files)"]
            PD2["mobile-app<br/>(Project files)"]
        end
    end

```

---

## Drive Types

MonokerOS defines four drive types, each scoped to a different entity:

| Type | Enum | Owner | Purpose |
|------|------|-------|---------|
| **Member Drive** | `member` | Individual [agent](./agents.md) | Personal workspace. System files, working documents, private notes. |
| **Team Drive** | `team` | [Team](./teams.md) | Shared team files. Style guides, templates, collaborative docs. |
| **Project Drive** | `project` | [Project](./projects.md) | Project deliverables, specs, assets, and documentation. |
| **Workspace Drive** | `workspace` | [Workspace](./workspaces.md) | Global shared resources. Company-wide policies, knowledge base. |

### Drive Hierarchy

```mermaid
flowchart TB
    Workspace["Workspace Drive<br/>(Global)"]

    Team1["Team: Design<br/>Drive"]
    Team2["Team: Development<br/>Drive"]

    Member1["sarah-chen<br/>Personal Drive"]
    Member2["alex-park<br/>Personal Drive"]
    Member3["jordan-lee<br/>Personal Drive"]
    Member4["dev-agent-01<br/>Personal Drive"]

    Project1["Project:<br/>acme-redesign Drive"]

    Workspace ---|"Workspace-wide"| Team1
    Workspace ---|"Workspace-wide"| Team2

    Team1 ---|"Team scope"| Member1
    Team1 ---|"Team scope"| Member2
    Team2 ---|"Team scope"| Member3
    Team2 ---|"Team scope"| Member4

    Team1 ---|"Assigned"| Project1
    Team2 ---|"Assigned"| Project1

```

---

## Drive Data Structures

### FileEntry

Every file and directory in a drive is represented as a `FileEntry`:

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique file identifier |
| `name` | `string` | File or directory name |
| `path` | `string` | Full path from the drive root |
| `type` | `FileEntryType` | `file` or `directory` |
| `size` | `number` | File size in bytes |
| `mimeType` | `string` | MIME type (e.g., `text/markdown`, `application/json`) |
| `modifiedAt` | `string` | ISO 8601 last modification timestamp |
| `children` | `FileEntry[]` | Nested files (directories only) |

### Drive Structures

Each drive type has a corresponding data structure:

```typescript
// Member Drive
interface MemberDrive {
  memberId: string;
  memberName: string;
  rootPath: string;
  files: FileEntry[];
}

// Team Drive
interface TeamDrive {
  id: string;
  name: string;
  teamId: string;
  rootPath: string;
  files: FileEntry[];
}

// Project Drive
interface ProjectDrive {
  id: string;
  name: string;
  projectId: string;
  rootPath: string;
  files: FileEntry[];
}

// Workspace Drive
interface WorkspaceDrive {
  id: string;
  name: string;
  rootPath: string;
  files: FileEntry[];
}
```

### DriveListing

The `DriveListing` response aggregates all drives in a workspace:

```typescript
interface DriveListing {
  teamDrives: TeamDrive[];
  memberDrives: MemberDrive[];
  projectDrives: ProjectDrive[];
  workspaceDrive: WorkspaceDrive | null;
}
```

---

## System Files

System files are special files within member drives that define an [agent's](./agents.md) identity and behavior. They are **protected** -- they cannot be renamed or deleted through the file API.

| File | Purpose | Used By |
|------|---------|---------|
| `SOUL.md` | Core personality and system prompt. Defines the agent's persona, tone, expertise boundaries, and behavioral rules. | OpenClaw (system prompt assembly) |
| `IDENTITY.md` | Structured identity document: name, role, specialization, background narrative. | OpenClaw, UI (agent profile) |
| `SKILLS.md` | Enumerated capabilities and tools the agent can use. | OpenClaw (tool permissions) |
| `FOUNDATION.md` | Foundational knowledge about the workspace, projects, and norms. | OpenClaw (context) |
| `AGENTS.md` | Team roster with all agents, roles, and specializations. | OpenClaw (inter-agent awareness) |
| `MONOKEROS.md` | Platform-level instructions injected by MonokerOS. | OpenClaw (platform context) |
| `config.toml` | Machine-readable configuration: model settings, runtime parameters. | OpenClaw (configuration) |
| `avatar.svg` | Agent's visual avatar (SVG format). | UI (agent display) |
| `avatar.png` | Agent's visual avatar (PNG format). | UI (agent display) |

### Protected Directories

| Directory | Purpose |
|-----------|---------|
| `KNOWLEDGE/` | Contains domain knowledge documents that the agent can reference during conversations. Cannot be renamed or deleted. |

### How System Files Flow into Agent Behavior

```mermaid
flowchart LR
    subgraph MemberDrive["Member Drive"]
        Soul["SOUL.md"]
        Identity["IDENTITY.md"]
        Skills["SKILLS.md"]
        Foundation["FOUNDATION.md"]
        Monokeros["MONOKEROS.md"]
        Config["config.toml"]
        KnowledgeDir["KNOWLEDGE/<br/>*.md files"]
    end

    subgraph Service["OpenClaw Service"]
        PromptBuilder["Prompt<br/>Builder"]
        ToolResolver["Tool<br/>Resolver"]
        ConfigLoader["Config<br/>Loader"]
    end

    Soul --> PromptBuilder
    Identity --> PromptBuilder
    Foundation --> PromptBuilder
    Monokeros --> PromptBuilder
    KnowledgeDir --> PromptBuilder
    Skills --> ToolResolver
    Config --> ConfigLoader

    PromptBuilder --> LLM["LLM API"]
    ToolResolver --> LLM
    ConfigLoader --> LLM

```

---

## File Operations

Drives support standard CRUD operations through the file API:

### Create

| Operation | Endpoint | Parameters |
|-----------|----------|------------|
| Create file | `POST /api/files/:category/:ownerId/file` | `?dir=` (parent path), body: `{ name, extension?, content? }` |
| Create folder | `POST /api/files/:category/:ownerId/folder` | `?dir=` (parent path), body: `{ name }` |

### Read

| Operation | Endpoint | Parameters |
|-----------|----------|------------|
| List all drives | `GET /api/files/workspaces` | -- |
| Get team file tree | `GET /api/files/teams/:teamId` | -- |
| Get agent file tree | `GET /api/files/agents/:agentId` | -- |
| Read file content | `GET /api/files/teams/:teamId/file` | `?path=` |
| Read file content | `GET /api/files/agents/:agentId/file` | `?path=` |

### Update

| Operation | Endpoint | Parameters |
|-----------|----------|------------|
| Update content | `PATCH /api/files/:category/:ownerId/content` | `?path=`, body: `{ content }` |
| Rename | `PATCH /api/files/:category/:ownerId/rename` | `?path=`, body: `{ newName }` |

### Delete

Files can be deleted through the API unless they are system files or protected directories.

---

## File Access Patterns

Different entities have different access scopes:

```mermaid
flowchart TB
    subgraph Agent["Agent: sarah-chen"]
        AgentAccess["Can access:"]
    end

    PersonalDrive["Own Member Drive<br/>(read/write)"]
    TeamDrive2["Team Drive<br/>(read/write)"]
    ProjectDrive2["Assigned Project Drives<br/>(read/write)"]
    WorkspaceDrive2["Workspace Drive<br/>(read)"]
    OtherAgent["Other Agent's Drive<br/>(no access)"]
    OtherTeam["Other Team's Drive<br/>(no access)"]

    Agent -->|"Full access"| PersonalDrive
    Agent -->|"Team member"| TeamDrive2
    Agent -->|"Project assigned"| ProjectDrive2
    Agent -->|"Read only"| WorkspaceDrive2
    Agent -.-x|"Blocked"| OtherAgent
    Agent -.-x|"Blocked"| OtherTeam

    linkStyle 4 stroke:#ef4444,stroke-dasharray:5 5
    linkStyle 5 stroke:#ef4444,stroke-dasharray:5 5

```

### Access Control List (ACL)

Drive manifests support fine-grained access control through ACL entries:

| Field | Type | Description |
|-------|------|-------------|
| `principal` | `string` | Agent name, team name, or role identifier |
| `access` | `DriveAccessLevel` | `read`, `write`, or `admin` |

Access levels:

| Level | Permissions |
|-------|-------------|
| `read` | View file tree, read file content |
| `write` | All read permissions plus create, update, rename, delete |
| `admin` | All write permissions plus manage ACL, delete drive |

---

## Knowledge System

The **knowledge system** is built on top of drives. It enables agents to search and reference documents across the workspace, with results scoped by relevance.

### Knowledge Search

Search spans four categories:

| Category | Scope | Description |
|----------|-------|-------------|
| `teams` | Team drives | Search across team shared files |
| `members` | Member drives | Search across agent personal files |
| `projects` | Project drives | Search across project deliverables |
| `workspace` | Workspace drive | Search global shared resources |

Search results are scored by relevance and return:

```typescript
interface KnowledgeSearchResult {
  category: KnowledgeSearchCategory;
  ownerId: string;
  path: string;
  fileName: string;
  scope: KnowledgeSearchScope;
  scopeLabel: string;
  snippet: string;
  score: number;
}
```

### Knowledge Constraints

| Constraint | Value |
|------------|-------|
| Maximum search results | 20 per query |
| Maximum file size | 512 KB |
| Knowledge directory | `KNOWLEDGE/` (protected, cannot be renamed or deleted) |

---

## File Preview

The MonokerOS UI provides rich file preview capabilities:

| File Type | Preview Mode | Description |
|-----------|-------------|-------------|
| Markdown (`.md`) | Rendered HTML | Full markdown rendering with syntax highlighting for code blocks |
| Code files (`.ts`, `.js`, `.py`, etc.) | Code editor | Syntax-highlighted code viewer with line numbers |
| CSV (`.csv`) | Table view | Structured table rendering with sortable columns |
| TOML (`.toml`) | Code editor | Syntax-highlighted configuration viewer |
| JSON (`.json`) | Code editor | Pretty-printed JSON with syntax highlighting |
| SVG (`.svg`) | Image preview | Rendered SVG visual |
| PNG/JPG | Image preview | Image display |
| Plain text (`.txt`) | Text view | Simple text rendering |

---

## Storage Layout on Disk

The physical storage layout maps drive types to the file system:

```
apps/api/data/
+-- agents/                          # Member drives
|   +-- sarah-chen/
|   |   +-- SOUL.md
|   |   +-- IDENTITY.md
|   |   +-- SKILLS.md
|   |   +-- FOUNDATION.md
|   |   +-- MONOKEROS.md
|   |   +-- config.toml
|   |   +-- avatar.svg
|   |   +-- KNOWLEDGE/
|   |   |   +-- ux-principles.md
|   |   |   +-- accessibility-guide.md
|   |   +-- working-files/
|   |       +-- wireframe-draft.md
|   +-- alex-park/
|       +-- SOUL.md
|       +-- ...
+-- workspaces/                      # Team drives
    +-- team-design/
    |   +-- style-guide.md
    |   +-- component-library.md
    |   +-- templates/
    +-- team-development/
        +-- coding-standards.md
        +-- architecture-decisions/
```

---

## Drive Manifest

Drives can be defined declaratively:

```yaml
apiVersion: v1
kind: Drive
metadata:
  name: design-team-drive
  labels:
    team: ui-ux-design
spec:
  type: team
  displayName: "Design Team Drive"
  capacity:
    maxSizeMb: 200
  protectedPaths:
    - "style-guide.md"
    - "component-library/"
  acl:
    - principal: sarah-chen
      access: admin
    - principal: ui-ux-design
      access: write
    - principal: development
      access: read
```

### Manifest Fields

| Field | Description |
|-------|-------------|
| `type` | Drive type: `member`, `team`, `project`, or `workspace` |
| `displayName` | Human-readable drive name |
| `capacity.maxSizeMb` | Storage limit in megabytes (default: 500) |
| `protectedPaths` | Paths that cannot be deleted or renamed (in addition to system files) |
| `acl` | Access control list defining who can read/write/admin the drive |

---

## Related Pages

- [Agents](./agents.md) -- Agents and their personal drives with system files
- [Teams](./teams.md) -- Teams and their shared drives
- [Projects & Tasks](./projects.md) -- Projects and their deliverable storage
- [Workspaces](./workspaces.md) -- The top-level container with workspace drives
