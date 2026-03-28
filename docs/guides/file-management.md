# File Management

MonokerOS provides a hierarchical file system with four scope levels and three view modes. Agents and humans can create, read, and organize files through scoped drives.

---

## Navigating Drives

Navigate to the **Files** tab in the top navigation. The interface has three panels:

1. **Drive Sidebar** (left) -- Lists all available drives
2. **File Browser** (center) -- Shows files in the selected drive
3. **File Preview** (right) -- Previews the selected file

<!-- TODO: screenshot — files page with three-panel layout, drive sidebar expanded -->

### Drive Types

| Drive | Scope | Who has access |
|---|---|---|
| **Member Drive** | Per-agent or per-human | The individual member |
| **Team Drive** | Per-team | All team members |
| **Project Drive** | Per-project | All project participants |
| **Workspace Drive** | Global | Everyone in the workspace |

Select a drive in the sidebar to browse its contents. Drives are grouped by type (Teams, Members, Projects, Workspace).

---

## View Modes

Switch between three view modes using the icons at the top of the drive sidebar:

### Tree View (default)

Hierarchical folder structure with expandable/collapsible directories. Click a file to select it for preview. Click a folder to expand or collapse it.

### Grid View

Card-based layout with file type icons and thumbnails. Useful for browsing image-heavy drives.

### List View

Table format with columns: name, type, size, and last modified date. Sortable by clicking column headers.

---

## Creating Files and Folders

Click the **floating action button** (bottom-right) to create new items:

- **New File** -- Enter a filename. The file is created in the current directory (or drive root if no directory is selected).
- **New Folder** -- Enter a folder name.

You can also right-click in the file browser to access the context menu with create options.

---

## File Preview

Select a file to open the preview panel on the right side. MonokerOS supports inline preview for:

| File type | Preview |
|---|---|
| Markdown (`.md`) | Rendered HTML with full pipeline (math, diagrams, code, mentions) |
| Code files | Syntax-highlighted source with line numbers |
| Images | Inline display |
| PDFs | Embedded viewer |
| Text files | Plain text display |

<!-- TODO: screenshot — file preview showing a rendered markdown file -->

### Code Editor

For code and text files, the preview includes an editor mode. Click **Edit** to switch from read-only preview to an editable view with syntax highlighting. Click **Save** to persist changes.

---

## File Operations

Right-click any file or folder to open the context menu:

| Action | Description |
|---|---|
| **New File** | Create a new file in this directory |
| **New Folder** | Create a new folder in this directory |
| **Copy** | Copy the file (for pasting elsewhere) |
| **Paste** | Paste a previously copied file |
| **Delete** | Delete the file or folder (with confirmation dialog) |
| **Ask About** | Open a chat conversation referencing this file |

---

## Pop-Out Window

Click the **pop-out icon** in the drive sidebar to open the file browser in a separate floating window. This lets you browse files while working in other parts of the workspace.

---

## Agent File Access

Agents interact with drives through MCP tools:

- `file_read` -- Read file contents from accessible drives
- `file_write` -- Write or update files
- `list_drives` -- List available drives and their contents
- `knowledge_search` -- Search indexed knowledge directories

Each agent can access its own member drive (read/write), its team drive (read/write), project drives for assigned projects (read/write), and the workspace drive (read-only for regular agents, read/write for system agents).

---

## Related

- [Chatting with Agents](./chatting-with-agents.md) -- Reference files in chat with `:filename` mentions
- [Core Concepts: Drives](../core-concepts/drives.md) -- Detailed reference
