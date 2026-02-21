# Article Writing Workspace Demo

## Overview

This demo shows the Keros (Project Manager) system agent working alongside Mono (Dispatcher) to autonomously plan and scaffold work based on user intent.

**Key principle**: The user doesn't explicitly say "create a project" or "create tasks." They describe what they want, and the system figures out the rest.

## Setup

### Option A: Use the Article Writing template (quick start)

```bash
# Create workspace from template
curl -X POST http://localhost:3001/api/templates/article-writing/apply \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{
    "slug": "article-studio",
    "displayName": "My Article Studio"
  }'
```

### Option B: Start from a blank workspace (recommended for demo)

1. Create a blank workspace with CUSTOM industry
2. Open Mono's conversation
3. Describe your article writing needs — Mono will design the workspace on-the-fly:
   - "I want to set up a content production team for writing tech articles"
   - Mono creates teams, agents, and workspace config based on your description
   - More flexible than templates — Mono designs based on your specific needs

## Demo Flow

### 1. Trigger project creation via natural conversation

Open Mono's conversation and say something like:

> "Write about today's 3 most viral tech topics"

**Expected behavior:**
- Mono recognizes this as project-level work (not a simple question)
- Mono uses `delegate_to_keros` to pass the intent to Keros
- In the UI, you'll see the "Delegating to Keros" tool chip

### 2. Keros autonomously plans the work

In Keros's conversation, the delegated message appears. Keros then:

1. **Lists existing projects** (`list_projects`) to check for matches
2. **Decides to create new projects** — one per topic (or a single umbrella project)
3. **Creates projects** with appropriate phases
4. **Writes WBS/PRD** to each project drive (`file_write`)
5. **Lists teams** (`list_teams`) to understand available workforce
6. **Creates tasks** assigned to appropriate teams:
   - Trend Identification team: identify the 3 viral topics
   - Deep Research team: investigate each topic
   - Content Structuring team: outline articles
   - Copywriting team: write drafts
   - SEO team: optimize for search
   - Publishing Ops team: schedule and distribute

### 3. Verify in the UI

- **Projects panel**: New projects visible with phases
- **Tasks board**: Tasks assigned to teams, in BACKLOG status
- **Project drives**: WBS/PRD files written by Keros
- **Team views**: Each team can see their assigned tasks

## Key Behaviors to Observe

1. **Mono never does project work** — only dispatches and delegates
2. **Keros never does domain work** — only creates scaffolding (projects, tasks, plans)
3. **Keros is autonomous** — decides project structure without explicit instructions
4. **System agents are protected** — cannot be deleted (400 on DELETE)
5. **Both daemons start** — Mono and Keros each have their own daemon process

## Debugging

```bash
# Kill all daemons before restarting API
pkill -f "bun run.*daemon.ts"

# Check Keros daemon health
curl http://localhost:4001/health  # (port varies per workspace)

# Verify API keys exist
curl http://localhost:3001/api/workspaces/<slug>/members \
  -H "Authorization: Bearer <token>"
```
