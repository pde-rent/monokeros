# Project Management

MonokerOS includes a built-in project management system with four view modes, task dependencies, SDLC gates, and cross-validation consensus.

---

## Creating a Project

1. Navigate to the **Projects** tab in the top navigation.
2. Click the **New Project** floating action button.

<!-- TODO: screenshot — projects page with FAB -->

### Project Form Fields

| Field | Required | Description |
|---|---|---|
| **Name** | Yes | Display name (e.g., "Website Redesign") |
| **Slug** | Yes | URL-friendly identifier (auto-generated from name) |
| **Description** | No | What the project is about |
| **Color** | No | Pick from 6 presets for visual identification |
| **Types** | No | Categorization tags (web, mobile, saas, api, desktop) |
| **Teams** | No | Assign teams to the project |
| **Agents** | No | Assign individual agents |
| **Humans** | No | Assign human supervisors |

Click **Create** to add the project.

---

## View Modes

Projects support four view modes, accessible from the top of any project page:

### Kanban Board

Columns represent task statuses. Drag and drop task cards between columns to change their status.

Default columns: **Backlog**, **Todo**, **In Progress**, **In Review**, **Awaiting Acceptance**, **Done**.

<!-- TODO: screenshot — kanban board with tasks in various columns, showing drag indicator -->

Each task card shows:
- Priority indicator (colored dot: red = critical, orange = high, yellow = medium, blue = low)
- Task title
- Assignee avatars (up to 3, with "+N" overflow)
- Team badge with color
- Cross-validation confidence (if applicable)

### Gantt Chart

Timeline view showing tasks as horizontal bars across a date range. Phase milestones are shown as markers. Task dependencies are drawn as connecting lines.

<!-- TODO: screenshot — Gantt chart with task bars and dependency arrows -->

### List View

Sortable table with columns: title, status, priority, assignees, team, phase. Click column headers to sort. Use the filter panel to narrow results.

### Agent Queue

Shows tasks grouped by assigned agent, ordered by priority. Useful for seeing each agent's backlog and workload distribution.

---

## Creating Tasks

1. Open a project view (any view mode).
2. Click the **New Task** floating action button.

### Task Form Fields

| Field | Required | Description |
|---|---|---|
| **Title** | Yes | What needs to be done |
| **Description** | No | Detailed requirements (supports Markdown) |
| **Priority** | Yes | Critical, High, Medium, Low, or None |
| **Team** | Yes | Which team owns this task |
| **Phase** | No | Project phase (from project configuration) |
| **Assignees** | No | Select one or more agents |
| **Offloadable** | No | Whether the agent can delegate to humans |

<!-- TODO: screenshot — task creation form -->

---

## Task Status Workflow

Tasks move through a six-stage pipeline:

```
Backlog → Todo → In Progress → In Review → Awaiting Acceptance → Done
```

| Status | What it means |
|---|---|
| **Backlog** | Captured but not yet planned |
| **Todo** | Planned, ready to be picked up |
| **In Progress** | Agent is actively working on it |
| **In Review** | Work completed, under peer review |
| **Awaiting Acceptance** | Requires human approval before closing |
| **Done** | Completed and accepted |

Change task status by dragging cards on the kanban board, or by clicking a task and updating its status in the detail panel.

---

## Task Details

Click any task to open the task detail panel on the right side:

- **Status badge** and **priority dot**
- **Assignees** with avatar links
- **Team** with color indicator
- **Phase** information
- **Dependencies** (tasks this one blocks or is blocked by)
- **Cross-validation** results (consensus state, confidence score)
- **Human acceptance** status (if the task requires approval)
- **Thinking thread** showing the agent's reasoning process

---

## SDLC Gates

Projects can define phase gates -- human approval checkpoints between phases. When a project reaches a gate:

1. The gate status changes to **Awaiting Approval**.
2. The designated approver receives a notification.
3. The approver reviews the phase deliverables and either **Approves** (unlocks the next phase) or **Rejects** (sends work back for revision).

Gate statuses: `pending` → `awaiting_approval` → `approved` / `rejected` / `bypassed`.

---

## Cross-Validation

Assign the same task to multiple agents. Each works independently. When all finish, MonokerOS compares their outputs and scores agreement:

| Confidence | Score | Action |
|---|---|---|
| **High** | > 90% agreement | Auto-approve |
| **Medium** | 70-90% | Lead agent resolves differences |
| **Low** | < 70% | Escalate to human supervisor |

Cross-validation results are visible in the task detail panel.

---

## Filtering and Search

The filter panel (left side, collapsible) lets you:

- **Search** by task title or description
- **Filter by status** (backlog, in progress, done, etc.)
- **Filter by priority** (critical, high, medium, low)
- **Filter by team** assignment
- **Filter by assignee**

Filters apply across all view modes.

---

## Related

- [Managing Agents](./managing-agents.md) -- Assign agents to projects and tasks
- [Core Concepts: Projects](../core-concepts/projects.md) -- Detailed reference
