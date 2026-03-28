# Wiki

The Wiki provides a collaborative documentation space for each workspace. Pages are written in Markdown and rendered using the same pipeline as chat messages, so all formatting features -- syntax highlighting, LaTeX math, Mermaid diagrams, and @mentions -- work out of the box.

## Overview

The Wiki is accessible via a dedicated tab in the top navigation bar. It presents a 3-pane layout: a navigation sidebar on the left, the page content in the center, and a collapsible table of contents on the right.

Wiki pages are stored as files in the workspace drive with a `WIKI/` path prefix. This means they participate in the same file system, permissions model, and search infrastructure as all other workspace files.

## Storage

Wiki pages are regular file entries in the Convex `files` table with:

| Field | Value |
|-------|-------|
| `driveType` | `"workspace"` |
| `driveOwnerId` | `"workspace"` |
| `path` | `WIKI/{page-path}` (e.g., `WIKI/index`, `WIKI/architecture/overview`) |
| `mimeType` | `text/markdown` |
| `textContent` | The raw Markdown source |

The `WIKI/` prefix is stripped when displayed in the UI. A page at path `WIKI/getting-started` appears as `getting-started` in the sidebar and URL.

## Convex Functions

Four Convex functions power the wiki:

### `wiki.nav`

Returns the navigation tree for the sidebar. Queries all files in the workspace drive with the `WIKI/` prefix and maps them to navigation items with `id`, `name`, `path`, and `type`.

**Args**: `workspaceId`
**Permission**: `files:read`

### `wiki.page`

Returns a single page by path. Looks up the file by its full `WIKI/{path}` in the `by_drive_path` index. Returns the file ID, name, display path, text content, and modification timestamp. The content is rendered to HTML on the client side using the shared markdown pipeline.

**Args**: `workspaceId`, `path`
**Permission**: `files:read`

### `wiki.raw`

Returns the raw Markdown source for a page. Used when entering edit mode so the user sees the unrendered markdown.

**Args**: `workspaceId`, `path`
**Permission**: `files:read`

### `wiki.save`

Creates or updates a wiki page. If a file already exists at the given path, it patches the content, size, and modification time. Otherwise, it inserts a new file entry.

**Args**: `workspaceId`, `path`, `content`, `title` (optional)
**Permission**: `files:write`

## Markdown Pipeline

Wiki pages are rendered using the same pipeline as chat messages (`packages/renderer`). Supported features:

- **Prism syntax highlighting** -- fenced code blocks with language IDs
- **LaTeX math** -- inline `$...$` and display `$$...$$` blocks
- **Mermaid diagrams** -- `mermaid` code blocks rendered as SVG
- **@mentions** -- `@agent-name`, `#project-slug`, `~task-id`, `:file-name`
- **Heading IDs** -- automatic anchor IDs for all headings (used by table of contents)
- Standard Markdown: bold, italic, links, images, tables, lists, blockquotes

## Layout

The wiki uses a 3-pane resizable layout built with `react-resizable-panels`:

```
+----------------+----------------------------+------------------+
|                |                            |                  |
|   Navigation   |       Page Content         |  On This Page    |
|    Sidebar     |                            |   (Table of      |
|                |                            |    Contents)     |
|  - New Page    |   [Edit]                   |                  |
|  - Section 1   |                            |  - Heading 1     |
|    - Page A    |   # Page Title             |    - Sub 1.1     |
|    - Page B    |                            |    - Sub 1.2     |
|  - Section 2   |   Content here...          |  - Heading 2     |
|    - Page C    |                            |                  |
|                |   [< Prev]     [Next >]    |                  |
+----------------+----------------------------+------------------+
```

### Navigation Sidebar (left)

- "New Page" button at the top
- Sections with collapsible page lists
- Active page highlighted
- Collapsible via the panel system

### Content Area (center)

- Rendered HTML in read mode with an Edit button
- Raw Markdown textarea in edit mode with Save/Cancel buttons
- Previous/Next page navigation links at the bottom
- Max width of `max-w-3xl` (768px) centered in the panel

### Table of Contents (right)

- Extracted from page headings via `extractHeadings()`
- Active heading tracked via `IntersectionObserver`
- Click to smooth-scroll to heading
- Indentation based on heading level (h2 = 0px, h3 = 8px, h4 = 16px, etc.)
- Starts collapsed by default

## Edit Mode

Clicking the Edit button switches the content area to a raw Markdown editor:

1. The `wiki.raw` query fetches the page source
2. A full-height `<textarea>` with monospace font displays the content
3. Save calls `wiki.save` mutation, then exits edit mode
4. Convex reactivity automatically re-renders the page without a manual refetch
5. Cancel discards changes and returns to read mode

## Creating Pages

New pages can be created via:

1. The "New Page" button in the sidebar -- prompts for a name, generates a URL-safe path, and opens the editor with a template
2. The "Create First Page" button shown in the empty state when no wiki pages exist

Page paths are generated by lowercasing the name, replacing spaces with hyphens, and stripping non-alphanumeric characters.

## Pop-out Window

The wiki supports pop-out into a separate browser window via `usePopoutPortal`. The pop-out window includes all three panes (sidebar, content, TOC) in a fixed layout (sidebar 220px, TOC 200px, content fills remaining space). The pop-out button is in the sidebar header.

## Page Navigation

Pages within the navigation tree support sequential browsing:

- **Previous/Next links** appear at the bottom of each page
- Pages are ordered by their position in the flattened navigation tree (`flattenNavPages`)
- The current page index determines which previous/next pages to show
- Changing pages scrolls the content area to the top and resets edit mode

## Component Location

The wiki page component is at `apps/web/src/components/wiki/wiki-page.tsx`. The route is `apps/web/src/app/[workspace]/(dashboard)/wiki/`.
