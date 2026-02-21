# MonokerOS - UI Specification

## Overview

The UI consists of three interconnected views within a shared application shell. All views share a common navigation, status bar, and detail panel system.

---

## Application Shell

### Top Navigation Bar (48px height)
- **Left**: MonokerOS logo + wordmark
- **Center**: 3 view tabs - `Diagram` | `Work Management` | `Console`
- **Right**: Search (Cmd+K), notifications bell, settings gear

### Status Bar (28px, bottom-fixed)
- **Left**: Agent counters - `12 Active | 4 Idle | 2 Blocked`
- **Center**: Active project count, current phase
- **Right**: WebSocket connection status indicator (green dot = connected)

### Detail Panel (right slide-in, 400px width)
- Triggered by clicking any agent/team/human node
- Shows contextual details based on entity type
- Close button + click-outside-to-close
- Sections: Identity, Current Work, Stats, Actions

---

## View 1: Agency Diagram (React Flow)

### Custom Node Types

#### Team Group Node
- Container node using React Flow group mechanism
- Colored left border matching team color
- Header: team name, agent count, expand/collapse toggle
- Contains Lead + Agent nodes when expanded
- Collapsed: shows team summary stats

#### Lead Agent Node (180x120px)
- Crown icon distinguishing from regular agents
- Status dot (top-right corner)
- Agent name, role
- Current project/task pill
- Stats: tasks completed, avg agreement score

#### Agent Node (160x100px)
- Status dot with pulse animation when `working`
- Agent name, specialization
- Project assignment pill (project-colored)
- Compact: fewer stats than Lead node

#### Human Node (160x80px)
- Purple accent border
- Human name, role title
- "Supervises: N teams" badge
- Click opens detail panel

### Custom Edge Types

| Edge Type | Style | Visibility | Purpose |
|-----------|-------|-----------|---------|
| `reporting` | Smoothstep, solid gray | Workforce + Management | Lead to Agent hierarchy |
| `crossTeam` | Bezier, dashed blue | All views | Lead-to-Lead collaboration |
| `projectAssignment` | Straight, project-colored | Project view only | Agent-to-project assignment |
| `activeWork` | Smoothstep, animated dot | Workforce view | Currently active task flow |
| `supervision` | Bezier, solid purple | Management view only | Human-to-Lead oversight |

### Filter Panel (left sidebar, 240px, collapsible)
- **View Mode Switcher**: Radio buttons - Workforce / Management / Project
- **Team Filter**: Checkboxes for each of 6 teams
- **Status Filter**: Checkboxes for agent statuses
- **Project Filter**: Dropdown select (Project view only)
- **Edge Toggles**: Individual visibility toggles per edge type

### Sub-Views
1. **Workforce**: All agents visible, status-colored nodes, activeWork edges
2. **Management**: Hierarchy layout, supervision edges, humans prominently placed
3. **Project**: Project-assignment edges, color-coded by project, non-assigned agents dimmed

### Interactions
- **Click node body** -> Open detail panel (right sidebar)
- **Click agent name text** -> Navigate to Console with that agent
- **Right-click node** -> Context menu (View Details, Open Console, Assign Task)
- **Hover node** -> Tooltip with quick stats
- **Zoom/Pan** -> Standard React Flow controls
- **Minimap** -> Bottom-right corner, shows viewport position
- **Controls** -> Top-right: zoom in/out, fit view, lock layout

---

## View 2: Work Management (Kanban Board)

### Board Layout
- **Tabs**: One tab per project + "All Projects" aggregate tab
- **5 Columns**: Backlog | To Do | In Progress | In Review | Done
- **Column header**: Status name, card count, collapse toggle

### Issue Cards (within columns)
- **Header row**: Priority dot (red/orange/yellow/blue/gray) + Issue title
- **Body**: Assignee (AgentLink component), Team badge
- **Footer**: Cross-validation status indicator, comment count
- **Hover**: Subtle elevation, border highlight
- **Click**: Opens Issue Detail Overlay

### Cross-Validation Status on Cards
- Icon: Two overlapping circles
- Colors: Green (HIGH, >90%), Yellow (MEDIUM, 70-90%), Red (LOW, <70%), Gray (not started)
- Tooltip shows agreement score percentage

### Drag and Drop
- Powered by `@dnd-kit/core`
- Visual drop zone indicators
- Cards can be dragged between columns
- Drag ghost shows card preview
- Drop triggers status update via API + WebSocket broadcast

### Issue Detail Overlay (640px wide modal)
- **Header**: Issue ID, title (editable), close button
- **Sidebar** (within modal): Status selector, Priority selector, Assignee (AgentLink), Team badge, Project, Phase
- **Main content**:
  - Description (markdown rendered)
  - Cross-validation section: Shows each agent's output, agreement score, synthesis result
  - Activity feed: Status changes, comments, assignment changes (chronological)
- **Actions**: Add comment, change status, reassign

### Permissions
- **Leads**: Create issues, edit project configs, manage priorities
- **Agents**: Create issues, update status on assigned issues only

---

## View 3: Console (Chat Interface)

### Terminal Aesthetic
- Monospace font (JetBrains Mono or similar)
- Dark background (#0d1117)
- Subtle scan-line effect (optional, togglable)

### Message Layout
- **User messages**: Right-aligned, blue background (#1f6feb), rounded corners
- **Agent messages**: Left-aligned, dark surface (#161b22), rounded corners
- **System messages**: Centered, muted text, no background
- **Timestamps**: Subtle, shown on hover or every 5 minutes

### Streaming Display
- Agent responses stream in character-by-character
- Typing indicator: three animated dots before stream starts
- Cursor blink at end of streaming message

### Inline References
- `#issueId` (e.g., `#PROJ-123`) - Highlighted, clickable -> opens Issue Detail
- `@agentName` (e.g., `@dev-lead`) - Highlighted, clickable -> navigates to agent

### Split Screen
- Default: Single console, full width
- Split: Up to 2 consoles side by side
- Draggable divider between panes
- Maximize button on each pane (goes full viewport)
- Tab bar at top of each pane for switching between open sessions

### Agent Context Sidebar (240px, collapsible, right side)
- **Identity**: Avatar, name, role, team, status
- **Current Task**: Task title, project, progress indicator
- **Backlog**: Next 3 queued tasks
- **Recent Activity**: Last 5 actions (task completions, reviews, messages)
- **Actions**: "View in Diagram" button, "Assign Task" button

### Slash Commands
- `/help` - Show available commands
- `/clear` - Clear console history
- `/status` - Show agent's current status and workload
- `/assign [issueId]` - Assign issue to current agent
- `/review [issueId]` - Request cross-validation review

---

## Cross-View Navigation

### AgentLink Component
- Used in: Issue cards (assignee), Console messages (@mentions), Detail panel
- Display: Avatar + name, colored by team
- Click: Opens agent in Diagram view (highlights node, pans to it)
- Shift+Click: Opens agent in Console view

### IssueRef Component
- Used in: Console messages (#references), Activity feeds
- Display: `#PROJ-123` with priority color underline
- Click: Opens Issue Detail Overlay in Work Management view

### Navigation Targets
| From | Action | Target |
|------|--------|--------|
| Diagram: click agent name | -> | Console with agent |
| Board: click assignee | -> | Diagram highlights agent |
| Console: click @agent | -> | Diagram highlights agent |
| Console: click #issue | -> | Board issue detail overlay |
| Detail Panel: "View in Diagram" | -> | Diagram centers on entity |
| Detail Panel: "Open Console" | -> | Console with agent |
