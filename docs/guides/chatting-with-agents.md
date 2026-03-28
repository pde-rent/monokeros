# Chatting with Agents

The Chat tab is where you communicate with your AI agents in real time. Messages stream back as the agent thinks, invokes tools, and formulates its response.

---

## Opening a Conversation

### From the Chat Tab

1. Navigate to the **Chat** tab in the top navigation.
2. The left panel shows your conversation list. Click any existing conversation to open it.
3. Click **New Chat** (dashed button with + icon) to start a new conversation.

### From the Agent Detail Panel

Click the **Chat** action button in any agent's detail panel. This opens or creates a direct conversation with that agent.

<!-- TODO: screenshot — conversation list with "New Chat" button -->

---

## Starting a New Conversation

The **New Chat** dialog lets you:

1. **Search** for agents by name.
2. **Select one agent** for a direct message, or **select multiple** for a group conversation.
3. **Name the group** (optional, only for multi-agent conversations).
4. Click **Start Chat** (or **Create Group** for multi-agent).

Conversation types:

| Type | Description |
|---|---|
| **Agent DM** | 1-on-1 conversation between you and a single agent |
| **Group Chat** | Multi-participant conversation with 2+ agents |
| **Project Chat** | Conversation scoped to a specific project |
| **Task Thread** | Discussion thread attached to a task |

---

## Sending Messages

Type your message in the input area at the bottom of the chat panel. Press **Enter** to send (or **Shift+Enter** for a new line).

### Mention System

Reference workspace entities inline using prefix characters:

| Prefix | What it references | Example |
|---|---|---|
| `@` | Agent or team member | `@alice` |
| `#` | Project | `#website-redesign` |
| `~` | Task | `~fix-login-bug` |
| `:` | File | `:readme.md` |

As you type a prefix character, an autocomplete dropdown appears. Use arrow keys to navigate and **Tab** or **Enter** to select.

<!-- TODO: screenshot — mention dropdown showing agent suggestions -->

### File Attachments

- Click the **paperclip icon** in the input area, or
- **Drag and drop** files directly into the chat.

Pending attachments appear as badges below the input. Click the **x** on a badge to remove it before sending.

---

## Reading Responses

When you send a message, the agent processes it and streams back a response. You will see:

### Thinking Indicator

A **"Thinking..."** label appears while the agent processes your message. The label updates to show the current phase:

- **Thinking** -- The agent is formulating its response
- **Reflecting** -- The agent is reviewing its own output

### Tool Calls

If the agent invokes tools (searching the web, reading files, updating tasks), each tool call is displayed inline:

- **Active tool** -- Shows the tool name with a loading indicator (e.g., "Searching the web...")
- **Completed tool** -- Shows the tool name and duration (e.g., "web_search -- 1.2s")

<!-- TODO: GIF — streaming response with tool calls appearing inline -->

### Streamed Content

The agent's response streams in real time -- you see characters appear as they are generated. The full rendering pipeline is active during streaming:

- **Markdown** formatting (bold, italic, lists, headings)
- **Code blocks** with syntax highlighting (16+ languages)
- **LaTeX math** (inline `$...$` and display `$$...$$`)
- **Mermaid diagrams** (flowcharts, sequence diagrams, etc.)
- **Mentions** rendered as clickable links

---

## Message Actions

Hover over any message to reveal action buttons:

- **Copy** -- Copy the message content to clipboard
- **React** -- Add an emoji reaction

---

## Display Modes

Toggle between two display modes using the buttons in the conversation list header:

- **Bubbles** -- Chat-style layout with user messages in blue bubbles (right-aligned) and agent messages as plain text (left-aligned)
- **List** -- Compact row layout with all messages left-aligned

---

## Pop-Out Windows

Click the **pop-out icon** (arrow) in the conversation list header to open the chat in a separate floating window. This lets you chat while navigating other parts of the workspace (org chart, file browser, project boards).

---

## Related

- [Managing Agents](./managing-agents.md) -- Start agents so they can respond to messages
- [Using the Desktop Viewer](./desktop-viewer.md) -- Watch what the agent does while it responds
- [Features: Chat](../features/chat.md) -- Technical reference
