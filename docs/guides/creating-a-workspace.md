# Creating a Workspace

A workspace is the top-level organizational unit in MonokerOS -- the equivalent of a Kubernetes namespace. It contains your agents, teams, projects, drives, and all workspace-level configuration.

---

## From the Workspace Selector

After signing in, you land on the workspace selector page. If you have no workspaces yet, you will see an empty state with a **Create Workspace** button.

<!-- TODO: screenshot — workspace selector page with "Create Workspace" button -->
<!-- ![Workspace selector](../assets/screenshots/workspace-selector.png) -->

Click **Create Workspace** to open the creation dialog.

---

## Workspace Creation Form

The creation dialog has the following fields:

### 1. Logo & Color

Upload a custom logo or leave it blank -- MonokerOS will display the first letter of the workspace name on a colored background. Pick a brand color from the six presets or use the color picker.

<!-- TODO: screenshot — logo upload and color picker section of the form -->

### 2. Name & Slug

Enter a display name (e.g., "Acme Agency"). The slug is auto-generated from the name (e.g., `acme-agency`) and becomes part of the URL: `localhost:3000/acme-agency/org`. You can edit the slug manually.

### 3. Description

Optional free-text description of what the workspace is for.

### 4. Telegram Integration

Optional. If you have a Telegram bot token, enter it here to enable the Telegram channel for your agents. This can also be configured later.

### 5. Start from Template

Choose a pre-built template or start with a blank workspace:

- **Blank workspace** -- Empty workspace, you add agents and teams manually
- **Web Development Agency** -- 8 teams, 24+ agents (frontend, backend, design, QA, DevOps, etc.)
- **Mobile Development Agency** -- 6 teams, 18+ agents
- **Law Firm** -- 5 teams, 15+ agents (litigation, compliance, research, etc.)
- **Article Writing Studio** -- 4 teams, 12+ agents (editorial, content, research, etc.)

<!-- TODO: screenshot — template selection list in the creation form -->

> [!TIP]
> Templates are the fastest way to get started. They pre-populate agents with names, titles, specializations, skills, and team assignments. You can modify everything after creation.

### 6. Create

Click **Create Workspace**. You will be redirected to the org chart view of your new workspace.

---

## After Creation

Once inside your workspace:

1. **Org chart** (`/org`) shows all agents and teams. If you used a template, you will see a populated organization chart with team groups and agent nodes.
2. **Start agents** by clicking an agent node, then clicking **Start** in the detail panel to spin up their Docker container.
3. **Chat** with running agents by opening a conversation from the Chat tab or from the agent detail panel.

See [Managing Agents](./managing-agents.md) for details on starting and configuring agents.

---

## Editing a Workspace

From the workspace selector page, hover over a workspace card and click the **pencil icon** to open the edit dialog. You can change the name, slug, description, color, logo, and Telegram configuration.

From inside a workspace, open **Settings** (gear icon in the top-right of the navigation bar) to access workspace configuration.

---

## Deleting a Workspace

From the workspace selector page, open the edit dialog and click **Delete Workspace**. A confirmation dialog will appear. This action is irreversible -- all agents, teams, projects, tasks, files, and conversations in the workspace will be permanently deleted.

> [!WARNING]
> Deleting a workspace also stops and removes all running agent containers associated with it.

---

## Related

- [Managing Agents](./managing-agents.md) -- Create and configure agents within your workspace
- [Configuring AI Providers](./configuring-providers.md) -- Set up LLM providers for your workspace
- [Core Concepts: Workspaces](../core-concepts/workspaces.md) -- Detailed reference
