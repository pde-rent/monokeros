# Managing Agents

Agents are the core units of work in MonokerOS. Each agent is an AI-powered team member that runs in its own Docker container with a full Ubuntu desktop, browser, and OpenClaw runtime.

---

## Creating an Agent

### From the Org Chart

1. Navigate to the **Org** tab in the top navigation.
2. Click the **New Agent** floating action button (bottom-right corner).

<!-- TODO: screenshot — org chart with the "New Agent" FAB highlighted -->

### Agent Creation Form

The creation dialog has the following fields:

**Identity:**

- **Name** -- The agent's display name. Click the refresh button to randomly generate a name. Click the user icon to re-roll name, gender, and avatar together.
- **Avatar** -- Auto-generated from a random user API. Upload a custom image or re-roll.
- **Title** -- Job title (e.g., "Senior Frontend Developer", "QA Lead").
- **Specialization** -- Area of expertise (e.g., "React, TypeScript, UI/UX").

**Personality:**

- **Soul** -- A free-text description of the agent's character, values, and communication style. This becomes the agent's SOUL.md file, which is injected into its system prompt.
- **Skills** -- Tag-based input. Type a skill and press Enter to add it. Each agent should have at least one skill.

**Organization:**

- **Team** -- Select which team this agent belongs to. Required.
- **Gender** -- Used for avatar generation. Optional.

**Model Configuration** (collapsible section):

- **Provider** -- Override the workspace default provider for this specific agent.
- **Model** -- Override the model name.
- **API Key** -- Provide a dedicated API key for this agent.
- **Temperature** -- Control response creativity (0.0 = deterministic, 2.0 = maximum creativity).
- **Max Tokens** -- Limit response length.

<!-- TODO: screenshot — agent creation form with fields filled in -->

> [!TIP]
> You do not need to configure a model for every agent. Agents inherit the workspace's default provider and model unless overridden.

Click **Create** to add the agent to the workspace. The agent will appear in the org chart under its assigned team.

---

## Starting an Agent

Creating an agent defines it in the database. To make it operational, you need to start its Docker container.

1. Click the agent's node in the org chart (or find the agent in any list view).
2. The **member detail panel** opens on the right side.
3. Click **Start** to provision and spin up the agent's container.

<!-- TODO: screenshot — member detail panel with the "Start" button highlighted -->

When the agent starts, the Container Service:

1. Generates workspace files (SOUL.md, AGENTS.md, TOOLS.md, USER.md)
2. Creates a Docker container from the `monokeros/openclaw-desktop` image
3. Mounts the agent's data directory and MCP tools
4. Starts the container and waits for the OpenClaw runtime to be ready

The agent's status will change from **offline** to **idle** once it is ready to receive messages.

> [!NOTE]
> First-time starts take longer because the container needs to initialize. Subsequent starts are faster.

---

## Stopping an Agent

1. Open the agent's detail panel.
2. Click **Stop**.

The container is stopped and removed. The agent's data directory is preserved, so workspace files are retained across restarts.

---

## Viewing Agent Details

Click any agent node in the org chart to open the detail panel. The panel has two tabs:

### Info Tab

- **Team** -- The agent's team assignment with team color.
- **Current Task** -- What the agent is currently working on (if any).
- **Queued Tasks** -- Up to 3 upcoming tasks in the agent's backlog.
- **Soul** -- The agent's personality description.
- **Skills** -- List of skills as badges.
- **Memory** -- Any long-term memory entries.
- **Stats** -- Tasks completed, average agreement score, active projects.

### Desktop Tab

- Shows the agent's live desktop via noVNC (if the agent is running).
- Green indicator dot when connected.
- See [Using the Desktop Viewer](./desktop-viewer.md) for details.

### Navigation Actions

Six action buttons at the bottom of the detail panel:

| Action | What it does |
|---|---|
| **Org** | Highlights the agent's team in the org chart |
| **Tasks** | Opens a task view filtered to this agent's assignments |
| **Projects** | Shows projects this agent is assigned to |
| **Chat** | Opens or creates a direct conversation with this agent |
| **Files** | Opens the agent's personal file drive |
| **Box** | Opens the agent's desktop in the Desktop Viewer |

---

## Agent Status Indicators

Agents display their current status throughout the UI:

| Status | Indicator | Meaning |
|---|---|---|
| **Idle** | Green dot | Running, waiting for work |
| **Working** | Blue dot | Actively processing a task or message |
| **Reviewing** | Yellow dot | Reviewing work (cross-validation) |
| **Blocked** | Red dot | Waiting on a dependency or approval |
| **Offline** | Gray dot | Container not running |

---

## Related

- [Chatting with Agents](./chatting-with-agents.md) -- Send messages and receive streaming responses
- [Using the Desktop Viewer](./desktop-viewer.md) -- Watch agents work in real time
- [Configuring AI Providers](./configuring-providers.md) -- Set up per-agent model overrides
- [Core Concepts: Agents](../core-concepts/agents.md) -- Detailed reference
