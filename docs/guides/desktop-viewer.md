# Using the Desktop Viewer

The Desktop Viewer lets you observe your agents working in real time. Each agent runs in its own Docker container with a full Ubuntu desktop -- the viewer streams that desktop to your browser via noVNC.

---

## Opening the Desktop Viewer

There are three ways to access an agent's desktop:

### From the Boxes Tab

1. Navigate to the **Boxes** tab in the top navigation.
2. Select an agent from the left panel.
3. The desktop appears in the main area.

<!-- TODO: screenshot — Boxes tab with agent list on left and desktop viewer on right -->

### From the Agent Detail Panel

1. Click an agent in the org chart or any list view.
2. In the detail panel, click the **Desktop** tab.
3. The desktop streams inline in the panel.

### From the Navigation Actions

Click the **Box** action button in the agent's detail panel to open the desktop in the Boxes tab.

---

## Desktop States

### Agent Not Running

If the agent's container is not started, the viewer shows:

- A desktop icon
- The message "[Agent name] is not running."
- A **Start Agent** button

Click **Start Agent** to provision and spin up the container. The viewer will automatically connect once the container is ready.

<!-- TODO: screenshot — "not running" state with Start button -->

### Connecting

While the desktop initializes, you will see:

- A spinner
- "Connecting to desktop..." or "Desktop starting up..."

This typically takes a few seconds after the container starts.

### Live Desktop

Once connected, you see the agent's full Ubuntu desktop in real time:

- **OpenBox** window manager with taskbar
- **Chrome** browser (the agent's primary tool)
- Any applications the agent is using
- File manager, terminal, and other desktop tools

<!-- TODO: GIF — live desktop showing agent browsing and performing tasks -->

---

## Desktop Header

The header bar above the desktop shows:

| Element | Description |
|---|---|
| **Agent name** | With desktop icon |
| **Green pulse dot** | Indicates live connection |
| **Mode label** | "Interactive" or "View Only" |
| **Window count** | Number of open windows |
| **CPU %** | Container CPU usage |
| **Memory MB** | Container memory usage |
| **Last updated** | Timestamp of last stats refresh |

Stats refresh every 10 seconds.

---

## Interactive vs. View-Only Mode

By default, the desktop viewer is **view-only** -- you can watch but not interact. This is a security measure to prevent accidental interference with agent work.

### Taking Control

Click the **Take Control** button (cursor icon) to switch to interactive mode. In interactive mode, you can:

- Move the mouse cursor
- Click on elements
- Type on the keyboard
- Interact with applications

### Releasing Control

Click **Release** (eye icon) to return to view-only mode.

> [!NOTE]
> Interactive mode requires admin-level workspace permissions. Viewer-role users can only observe.

---

## Pop-Out Window

Click the **pop-out icon** to open the desktop viewer in a separate floating window (900x720). This lets you monitor the agent while working in other parts of MonokerOS.

---

## What You Can Observe

When an agent is working, you can see it:

- **Browsing the web** in Chrome (searching, reading documentation, visiting URLs)
- **Writing code** in a text editor or terminal
- **Using tools** -- file operations, terminal commands, application interactions
- **Reading files** from its drives
- **Navigating** between applications and tabs

The desktop viewer gives you full visibility into what the agent is doing, which is especially useful for debugging, quality assurance, and understanding how agents approach tasks.

---

## Related

- [Managing Agents](./managing-agents.md) -- Start and stop agent containers
- [Chatting with Agents](./chatting-with-agents.md) -- Communicate with agents while watching them work
- [Features: Desktop Viewer](../features/desktop-viewer.md) -- Technical reference
