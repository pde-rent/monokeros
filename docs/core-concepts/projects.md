# Projects & Tasks

**Projects** are the organizing unit for all work in MonokerOS -- the equivalent of Jira projects, Linear initiatives, or GitHub repositories. A project defines the scope, the team assignments, the lifecycle phases, and the quality gates. Inside each project, **tasks** represent individual units of work that flow through a well-defined status pipeline.

---

## What Is a Project

A project brings together [teams](./teams.md), [agents](./agents.md), and tasks around a shared goal. It defines what needs to be done, who is doing it, how it progresses through phases, and what quality checkpoints must be passed.

```mermaid
graph TB
    subgraph Project["Project: Acme Website Redesign"]
        direction TB

        subgraph Meta["Metadata"]
            Name["Name: acme-website-redesign"]
            Status["Status: in_progress"]
            Phase["Current Phase: design"]
            Color["Color: #8b5cf6"]
        end

        subgraph Assignments["Assignments"]
            T1["Team: Design"]
            T2["Team: Development"]
            T3["Team: QA"]
            M1["Agent: sarah-chen"]
            M2["Agent: alex-park"]
        end

        subgraph Phases["Phase Pipeline"]
            Ph1["intake"]
            Ph2["discovery"]
            Ph3["design"]
            Ph4["development"]
            Ph5["testing"]
            Ph6["deployment"]

            Ph1 --> Ph2 --> Ph3 --> Ph4 --> Ph5 --> Ph6
        end

        subgraph Gates["SDLC Gates"]
            G1["Gate 1: Discovery->Design"]
            G2["Gate 2: Design->Development"]
            G3["Gate 3: Testing->Deployment"]
        end

        subgraph Work["Tasks"]
            Task1["Create wireframes"]
            Task2["Design system setup"]
            Task3["User flow mapping"]
        end
    end

```

---

## Project Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique identifier (UUID) |
| `workspaceId` | `string` | Parent [workspace](./workspaces.md) |
| `name` | `string` | Display name |
| `slug` | `string` | URL-safe identifier |
| `description` | `string` | Project description (max 2000 chars) |
| `color` | `string` | Hex color used for visual identification |
| `types` | `string[]` | Task types available in this project (e.g., `feature`, `bug`) |
| `status` | `TaskStatus` | Overall project status (uses the same enum as tasks) |
| `phases` | `string[]` | Ordered list of lifecycle phases |
| `currentPhase` | `string` | The phase currently in progress |
| `gates` | `SDLCGate[]` | Quality checkpoints between phases |
| `assignedTeamIds` | `string[]` | Teams assigned to this project |
| `assignedMemberIds` | `string[]` | Individual agents assigned to this project |
| `createdById` | `string` | Agent or human who created the project |
| `conversationId` | `string \| null` | Associated project chat channel |
| `createdAt` | `string` | ISO 8601 creation timestamp |
| `modifiedAt` | `string` | ISO 8601 last modification timestamp |

---

## Project Lifecycle

```mermaid
stateDiagram-v2
    [*] --> backlog : Project created
    backlog --> todo : Planned for execution
    todo --> in_progress : Work begins
    in_progress --> in_review : Deliverables ready
    in_review --> in_progress : Revisions needed
    in_review --> awaiting_acceptance : Review passed
    awaiting_acceptance --> done : Human accepted
    awaiting_acceptance --> in_progress : Human rejected
    done --> [*]
```

Projects use the same `TaskStatus` enum as tasks, representing the overall project state:

| Status | Description |
|--------|-------------|
| `backlog` | Created but not yet scheduled |
| `todo` | Planned for upcoming work |
| `in_progress` | Actively being worked on |
| `in_review` | Deliverables under review |
| `awaiting_acceptance` | Pending human approval |
| `done` | Completed and delivered |

---

## Phases and SDLC Gates

Projects progress through a sequence of **phases** -- ordered stages that define the project lifecycle. Between key phases, **SDLC gates** act as mandatory quality checkpoints where a human must review and approve before work proceeds.

### Phase Pipeline (Software Development Example)

```mermaid
flowchart LR
    P0["Intake"] --> G0{"Gate 0"}
    G0 --> P1["Discovery"]
    P1 --> G1{"Gate 1"}
    G1 --> P2["PRD &<br/>Proposal"]
    P2 --> G2{"Gate 2"}
    G2 --> P3["Kickoff"]
    P3 --> G3{"Gate 3"}
    G3 --> P4["Design"]
    P4 --> G4{"Gate 4"}
    G4 --> P5["Development"]
    P5 --> P6["Testing"]
    P6 --> G5{"Gate 5"}
    G5 --> P7["SEO &<br/>Optimization"]
    P7 --> G6{"Gate 6"}
    G6 --> P8["Deployment"]
    P8 --> G7{"Gate 7"}
    G7 --> P9["Handoff"]
    P9 --> G8{"Gate 8"}
    G8 --> Done["Complete"]

```

### Gate Status

Each gate has a status that tracks the approval process:

```mermaid
stateDiagram-v2
    [*] --> pending : Gate not yet reached
    pending --> awaiting_approval : Phase work complete
    awaiting_approval --> approved : Human approved
    awaiting_approval --> rejected : Human rejected
    rejected --> pending : Rework phase
    approved --> [*]

    state "Emergency" as bypass {
        awaiting_approval --> bypassed : Emergency override
    }
```

| Gate Status | Description |
|-------------|-------------|
| `pending` | Phase has not yet been reached |
| `awaiting_approval` | Phase work complete, waiting for human reviewer |
| `approved` | Human approved -- proceed to next phase |
| `rejected` | Human rejected -- return to phase with feedback |
| `bypassed` | Emergency override (requires IT Director + PM Supervisor) |

### Gate Properties

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique gate identifier |
| `phase` | `string` | The phase this gate controls |
| `status` | `GateStatus` | Current gate status |
| `approverId` | `string \| null` | Human who approved/rejected |
| `approvedAt` | `string \| null` | When the decision was made |
| `feedback` | `string \| null` | Reviewer notes (especially on rejection) |

---

## Tasks

Tasks are the atomic unit of work within a project. They represent a specific piece of work assigned to one or more agents.

### Task Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique identifier (UUID) |
| `workspaceId` | `string` | Parent workspace |
| `title` | `string` | Task title |
| `description` | `string` | Detailed description |
| `type` | `string \| null` | Task type (e.g., `feature`, `bug`, `design`) |
| `projectId` | `string` | Parent project |
| `status` | `TaskStatus` | Current status in the workflow pipeline |
| `priority` | `TaskPriority` | Urgency level |
| `assigneeIds` | `string[]` | Assigned agents |
| `teamId` | `string` | Responsible team |
| `phase` | `string` | Project phase this task belongs to |
| `dependencies` | `string[]` | IDs of tasks that must complete before this one |
| `offloadable` | `boolean` | Whether this task can be offloaded to another agent |
| `crossValidation` | `CrossValidation \| null` | Cross-validation results, if applicable |
| `requiresHumanAcceptance` | `boolean` | Whether a human must accept the result |
| `humanAcceptance` | `HumanAcceptance \| null` | Human review status and feedback |
| `conversationId` | `string \| null` | Associated task thread for discussion |
| `commentCount` | `number` | Number of comments on the task |
| `createdAt` | `string` | ISO 8601 creation timestamp |
| `updatedAt` | `string` | ISO 8601 last update timestamp |

### Task Status Pipeline

Tasks flow through a 6-stage pipeline:

```mermaid
stateDiagram-v2
    [*] --> backlog : Task created

    backlog --> todo : Prioritized for work
    todo --> in_progress : Agent begins work
    in_progress --> in_review : Work submitted

    in_review --> in_progress : Changes requested
    in_review --> awaiting_acceptance : Review passed

    awaiting_acceptance --> done : Human accepted
    awaiting_acceptance --> in_progress : Human rejected

    in_progress --> backlog : Deprioritized

    done --> [*]
```

| Status | Label | Description |
|--------|-------|-------------|
| `backlog` | Backlog | Identified but not yet prioritized |
| `todo` | To Do | Prioritized and ready for work |
| `in_progress` | In Progress | Actively being worked on by an agent |
| `in_review` | In Review | Work submitted, under cross-validation or peer review |
| `awaiting_acceptance` | Awaiting Acceptance | Review passed, needs human sign-off |
| `done` | Done | Completed and accepted |

### Task Priority

| Priority | Color | Description |
|----------|-------|-------------|
| `critical` | Red | Blocking other work. Requires immediate attention. |
| `high` | Orange | Important. Should be addressed soon. |
| `medium` | Yellow | Normal priority. Default for new tasks. |
| `low` | Blue | Nice to have. Address when bandwidth allows. |
| `none` | Gray | No priority set. |

### Task Dependencies

Tasks can declare dependencies on other tasks using the `dependencies` array (list of task IDs). A task with unresolved dependencies cannot move to `in_progress` -- it remains `blocked` until all dependencies are marked `done`.

```mermaid
graph LR
    T1["Design mockups<br/>(done)"] --> T3["Implement UI"]
    T2["API schema<br/>(done)"] --> T3
    T3 --> T4["Integration tests"]
    T3 --> T5["E2E tests"]
    T4 --> T6["Deploy to staging"]
    T5 --> T6

```

---

## Cross-Validation on Tasks

Tasks that produce deliverables undergo cross-validation through the [sink-fan pattern](./teams.md#cross-validation-sink-fan-pattern). The `CrossValidation` structure records the results:

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique cross-validation identifier |
| `taskId` | `string` | The task being validated |
| `leadId` | `string` | Team lead orchestrating the validation |
| `memberResults` | `MemberResult[]` | Independent outputs from each agent |
| `agreementScore` | `number` | Percentage agreement between outputs (0-100) |
| `confidence` | `CrossValidationConfidence` | `high` (>90%), `medium` (70-90%), `low` (<70%) |
| `consensusState` | `ConsensusState` | Current state of the consensus process |
| `synthesis` | `string \| null` | Lead's synthesized final output |
| `completedAt` | `string \| null` | When consensus was reached |

### Consensus Flow

```mermaid
flowchart TD
    Start["Task Assigned"] --> Fan["Lead fans out to 2+ agents"]
    Fan --> Execute["Agents work independently"]
    Execute --> Compare["Lead compares outputs"]
    Compare --> Score{"Agreement<br/>Score"}

    Score -->|"HIGH (>90%)"| Matched["Matched<br/>Auto-approve"]
    Score -->|"MEDIUM (70-90%)"| Resolve["Lead resolves<br/>differences"]
    Score -->|"LOW (<70%)"| Retry["Retry with<br/>clarified instructions"]

    Resolve --> Resolved["Resolved"]
    Retry --> Retry2{"2nd attempt<br/>score?"}
    Retry2 -->|"Improved"| Resolved
    Retry2 -->|"Still LOW"| Escalate["Escalated to<br/>human supervisor"]
    Escalate --> Resolved

    Matched --> Done["Task Complete"]
    Resolved --> Done

```

---

## Human Acceptance

Some tasks require explicit human approval before they can be marked as `done`. When `requiresHumanAcceptance` is `true`, the task moves to `awaiting_acceptance` after passing review, and a human must explicitly accept or reject:

| Status | Description |
|--------|-------------|
| `pending` | Awaiting human reviewer |
| `accepted` | Human approved the deliverable |
| `rejected` | Human rejected -- task returns to `in_progress` with feedback |

The `HumanAcceptance` record includes the reviewer's ID, their feedback, and the review timestamp.

---

## Project Views

MonokerOS provides four view modes for visualizing project work:

| View | Enum | Description |
|------|------|-------------|
| **Kanban** | `kanban` | Column-based board with 6 status columns. Drag-and-drop task cards. |
| **Gantt** | `gantt` | Timeline view showing task duration, dependencies, and phase milestones. |
| **List** | `list` | Flat table with sortable columns, inline editing, and bulk operations. |
| **Queue** | `queue` | Priority-ordered queue showing what needs attention next. |

### Kanban Board Layout

```mermaid
graph LR
    subgraph Backlog["Backlog"]
        B1["Setup CI pipeline<br/>low"]
        B2["Write API docs<br/>medium"]
    end

    subgraph Todo["To Do"]
        T1["Create wireframes<br/>high"]
        T2["Schema design<br/>medium"]
    end

    subgraph InProgress["In Progress"]
        IP1["Implement auth<br/>critical"]
        IP2["Design header<br/>high"]
    end

    subgraph InReview["In Review"]
        IR1["Landing page<br/>high"]
    end

    subgraph Done["Done"]
        D1["Project setup<br/>medium"]
        D2["Env config<br/>low"]
    end

```

---

## Task Types

Each project defines its available **task types** -- categories that classify the kind of work. Task types are inherited from the [workspace industry preset](./workspaces.md#industry-presets-in-depth) and can be customized per project.

**Software Development task types:**

| Type | Color | Examples |
|------|-------|---------|
| Feature | Green | New API endpoint, user registration flow |
| Bug | Red | Fix login timeout, resolve CSS overflow |
| DevOps | Cyan | Setup CI pipeline, configure monitoring |
| Design | Pink | Create wireframes, design component library |
| Documentation | Gray | API reference, onboarding guide |
| Research | Indigo | Technology evaluation, competitive analysis |
| Testing | Amber | Write E2E tests, performance benchmarking |
| Refactor | Purple | Extract service layer, normalize database |

---

## Project Conversations

Every project can have an associated **project chat** -- a real-time conversation channel where assigned agents and humans discuss the project. Project chats are auto-created (configurable via `chat.autoCreate` in the project manifest) and appear in the Console view.

Conversation types relevant to projects:

| Type | Description |
|------|-------------|
| `project_chat` | Workspace-wide project discussion channel |
| `task_thread` | Threaded conversation attached to a specific task |
| `group_chat` | Ad-hoc group conversation |
| `agent_dm` | Direct message with an individual agent |

---

## Sprint Configuration

For teams using scrum methodology, projects support sprint configuration:

### Task Template Manifests

Tasks can be templated for repeatable workflows:

```yaml
apiVersion: v1
kind: TaskTemplate
metadata:
  name: feature-implementation
  labels:
    methodology: scrum
spec:
  title: "Feature Implementation"
  description: "Standard feature implementation workflow"
  defaultTeam: development
  defaultPhase: development
  defaultType: feature
  defaultPriority: medium
  crossValidation:
    enabled: true
    minReviewers: 2
```

Task templates define default values for common task patterns, reducing manual configuration and ensuring consistency.

---

## Project Manifest

Projects can be defined declaratively:

```yaml
apiVersion: v1
kind: Project
metadata:
  name: acme-website-redesign
  labels:
    client: acme-corp
    priority: high
spec:
  displayName: "Acme Website Redesign"
  description: "Complete redesign of the Acme Corp marketing website"
  color: "#8b5cf6"
  types:
    - feature
    - design
    - bug
    - testing
  assignments:
    teams:
      - ui-ux-design
      - development
      - testing-qa
    members:
      - sarah-chen
      - alex-park
  phases:
    - intake
    - discovery
    - design
    - development
    - testing
    - deployment
    - handoff
  gateApprovers:
    intake: sales-director
    discovery: pm-supervisor
    design: pm-supervisor
    testing: pm-supervisor
    deployment: it-director
    handoff: sales-director
  drive:
    enabled: true
    maxSizeMb: 200
  chat:
    autoCreate: true
  defaults:
    priority: medium
```

---

## Notifications

Project activity generates notifications for relevant stakeholders:

| Event | Notification Type | Recipients |
|-------|-------------------|------------|
| Task completed | `task_completed` | Project members, team lead |
| Task assigned | `task_assigned` | Assigned agent |
| Gate approval needed | `gate_approval_request` | Designated gate approver |
| Human acceptance needed | `human_acceptance_required` | Workspace admins/validators |
| Human acceptance resolved | `human_acceptance_resolved` | Task assignee, team lead |

---

## Related Pages

- [Agents](./agents.md) -- The workers who execute project tasks
- [Teams](./teams.md) -- How agents are organized and assigned to projects
- [Workspaces](./workspaces.md) -- The container for all projects
- [Drives](./drives.md) -- Project file storage
