# Implementation Plan — OpenClaw Integration, Files, and Monitoring

Cross-validated by three independent review agents. All reviewers reached consensus.

---

## Phase 1: Route Chat Through OpenClaw (Critical Fix)

### 1A. Enable chatCompletions endpoint in openclaw.json

**File**: `services/container-service/src/provision.ts`

In `buildOpenClawConfig()`, add `http.endpoints.chatCompletions.enabled` to the gateway config.
Also fix the `OpenClawConfig` TypeScript interface to properly type `auth.token` and `http.endpoints`.

### 1B. Rewrite stream.ts to route through OpenClaw

**File**: `services/container-service/src/stream.ts`

Changes:
1. Replace `provider.baseUrl/chat/completions` → `rt.openclawUrl/v1/chat/completions`
2. Use `MK_API_KEY` as Bearer token (not the LLM provider key)
3. Send only the user message — OpenClaw manages system prompt + session history
4. Use `user: "conversation:{conversationId}"` for session key derivation (separate sessions per conversation)
5. Set `model: "openclaw"` (OpenClaw routes to its configured model)
6. Add null check for `rt.openclawUrl`
7. Remove dead code: `provider` resolution, `systemPrompt` handling, `history` passthrough
8. Increase timeout from 120s to 300s for agentic tool workflows
9. Extract `usage` from the final SSE chunk and emit as a `usage` NDJSON event
10. After stream completes, call Convex HTTP endpoint to persist the agent's response

### 1C. Add OpenClaw readiness check

**File**: `services/container-service/src/docker.ts`

After `createAndStartContainer()` returns, poll `GET {openclawUrl}/v1/models` (or root) until ready, up to 30s. Prevents race condition where chat arrives before OpenClaw finishes startup.

### 1D. Remove dead state

**File**: `services/container-service/src/docker.ts`

Remove `provider` and `systemPrompt` from `AgentRuntime` — OpenClaw manages both internally. These are no longer needed.

---

## Phase 2: Persist Agent Messages to Convex (Critical Bug Fix)

### Problem
`conversations.storeAgentMessage` (internalMutation) exists but is NEVER called.
Agent responses appear during streaming then vanish on page refresh.

### Solution
The container service persists the message after the SSE stream completes, via a new Convex HTTP endpoint.

### 2A. Add HTTP endpoint for agent message persistence

**File**: `convex/http.ts`

New route: `POST /api/chat/store-message`
Handler validates `MK_API_KEY`, then calls `internal.conversations.storeAgentMessage`.

### 2B. Container service calls Convex after stream

**File**: `services/container-service/src/stream.ts`

After the `for await (parseSSEStream)` loop finishes, fire-and-forget a POST to the Convex HTTP endpoint with:
- `conversationId` (from URL param)
- `memberId` (agentId from request body)
- `content` (accumulated response text)

Also persist on stream error (partial content is better than lost content).

### 2C. Update DaemonEvent type

**File**: `packages/types/src/zeroclaw.ts`

Add `usage` event variant:
```typescript
| { type: "usage"; data: { promptTokens: number; completionTokens: number; totalTokens: number; model?: string } }
```

---

## Phase 3: Agent Workspace Folder Structure & Files

### Architecture Decision: Convex-First
- **Convex `files` table** = single source of truth
- **Host filesystem** = write-through cache for OpenClaw (only workspace/ dir)
- **No filesystem watcher daemon** — rejected as too complex and fragile

### 3A. Provisioning writes to BOTH host filesystem AND Convex

**File**: `services/container-service/src/provision.ts`

After writing SOUL.md, AGENTS.md, TOOLS.md, USER.md to the host filesystem, also upsert them into Convex via the MCP API endpoint (`POST /api/mcp`).

Also create Convex directory entries for `downloads/` and `outputs/` folders in the member drive.

### 3B. Add upsertFile mutation

**File**: `convex/files.ts`

New mutation that creates-or-updates a file by `(driveType, driveOwnerId, path)`.
Used by provisioning to seed the member drive without creating duplicates on re-provision.

### 3C. Add file sync endpoint to container service

**File**: `services/container-service/src/router.ts`

New endpoint: `POST /containers/{agentId}/sync-file`
Body: `{ path: "workspace/SOUL.md", content: "..." }`

Called when a human edits a system file in the frontend — writes the change through to the host filesystem so OpenClaw picks it up.

### 3D. Update TOOLS.md to document folder conventions

**File**: `services/container-service/src/provision.ts`

Add to `buildToolsMd()`:
- `downloads/` — for raw data, API responses, web scrapes, browser downloads
- `outputs/` — for clean deliverables, reports, code artifacts, summaries
- Agents should use `files.create` MCP tool with appropriate `dir` parameter

### Resulting Convex member drive structure:
```
Member Drive ({agentId}):
├── SOUL.md                 # System file (protected)
├── AGENTS.md               # System file (protected)
├── TOOLS.md                # System file (protected)
├── USER.md                 # System file (protected)
├── KNOWLEDGE/              # Protected directory
├── downloads/              # Raw data folder
└── outputs/                # Clean deliverables folder
```

### Host filesystem (cache for OpenClaw):
```
/data/{agentId}/
├── workspace/SOUL.md, AGENTS.md, TOOLS.md, USER.md
├── memory/
├── sessions/
├── chrome-cache/
└── openclaw.json
```

---

## Phase 4: Token Usage & Resource Monitoring Schema

### Schema Design Decision: Separate Tables + Running Totals (Hybrid B+C)

All three reviewers agreed on this approach:
- **`tokenUsage`** table: per-response event log (financial/audit data)
- **`resourceSnapshots`** table: sampled telemetry (60s intervals)
- **Running totals on `members.stats`**: fast dashboard queries without scanning event log
- **Do NOT put CPU/memory on `members`** — blast radius too high (too many reactive subscribers)

### 4A. Add new tables to schema

**File**: `convex/schema.ts`

```typescript
tokenUsage: defineTable({
  workspaceId: v.id("workspaces"),
  memberId: v.id("members"),
  conversationId: v.id("conversations"),
  model: v.string(),
  promptTokens: v.float64(),
  completionTokens: v.float64(),
  totalTokens: v.float64(),
  estimatedCostUsd: v.float64(),
})
  .index("by_member", ["memberId"])
  .index("by_workspace", ["workspaceId"])
  .index("by_conversation", ["conversationId"])

resourceSnapshots: defineTable({
  workspaceId: v.id("workspaces"),
  memberId: v.id("members"),
  cpuPercent: v.float64(),
  memoryMb: v.float64(),
  windowCount: v.float64(),
})
  .index("by_member", ["memberId"])
  .index("by_workspace", ["workspaceId"])
```

### 4B. Extend members.stats with token running totals

**File**: `convex/schema.ts`

```typescript
const memberStats = v.object({
  tasksCompleted: v.float64(),
  avgAgreementScore: v.float64(),
  activeProjects: v.float64(),
  // NEW: token usage running totals
  totalPromptTokens: v.float64(),
  totalCompletionTokens: v.float64(),
  totalTokens: v.float64(),
  totalCostUsd: v.float64(),
});
```

### 4C. Add token recording mutation

**File**: `convex/tokenUsage.ts` (new file)

`recordTokenUsage` internalMutation:
1. Insert `tokenUsage` event row
2. Read current member's `stats`
3. Patch member with incremented totals (atomic — Convex mutations are transactional)

### 4D. Add resource snapshot persistence

**File**: `services/container-service/src/docker.ts`

Every 60s (6th tick of the existing 10s poll), call Convex HTTP endpoint to batch-insert `resourceSnapshots` for all running containers.

**File**: `convex/http.ts`

New route: `POST /api/metrics/resource-snapshots`
Validates `MK_API_KEY`, inserts snapshots for each agent.

### 4E. Token usage capture from stream

**File**: `services/container-service/src/stream.ts`

After OpenClaw SSE stream completes with usage data:
1. Emit `{ type: "usage", data: { promptTokens, completionTokens, totalTokens } }` NDJSON event
2. Call Convex HTTP endpoint to record token usage

### 4F. Model pricing (best-effort)

**File**: `packages/constants/src/model-pricing.ts` (new file, separate from providers.ts)

```typescript
export const MODEL_PRICING: Record<string, { inputPer1M: number; outputPer1M: number }> = {
  "claude-sonnet-4-5-20250929": { inputPer1M: 3.0, outputPer1M: 15.0 },
  "gpt-4o": { inputPer1M: 2.50, outputPer1M: 10.0 },
  // ... best-effort, will go stale
};
```

### 4G. Retention cron

**File**: `convex/crons.ts` (new file)

- Daily: prune `resourceSnapshots` older than 7 days
- Weekly: prune `tokenUsage` older than 90 days

---

## Phase 5: Convex Queries & Frontend Hooks

### 5A. Convex queries

**File**: `convex/tokenUsage.ts`

- `getByMember({ workspaceId, memberId })` — last N token events for detail view
- `getByConversation({ workspaceId, conversationId })` — per-conversation cost

**File**: `convex/members.ts`

- `getResourceHistory({ workspaceId, memberId, limit })` — last N resource snapshots

### 5B. Frontend hooks

**File**: `apps/web/src/hooks/use-queries.ts`

- `useTokenUsage(memberId)` — reactive query on `tokenUsage.getByMember`
- `useResourceHistory(memberId)` — reactive query on `members.getResourceHistory`
- Token running totals come from existing `useMembers()` (already subscribed to `members` table)

### 5C. Update Boxes view

**File**: `apps/web/src/components/boxes/agent-box-list.tsx`
- Add cost badge per agent row (compact: "$0.42")

**File**: `apps/web/src/components/boxes/box-desktop-panel.tsx`
- Add token usage badges in header (next to CPU/memory stats)
- Collapsible stats section below header for detailed breakdown

---

## Implementation Order

1. **Phase 1** (OpenClaw routing) — foundational, everything depends on this
2. **Phase 2** (Message persistence) — critical bug fix
3. **Phase 3** (Folder structure) — agent config files visible in UI
4. **Phase 4** (Schema + monitoring) — new tables, mutations, persistence
5. **Phase 5** (Frontend) — display the data

---

## File Changes Summary

| File | Phase | Change |
|------|-------|--------|
| `services/container-service/src/stream.ts` | 1,2,4 | Rewrite: route through OpenClaw, persist messages, capture usage |
| `services/container-service/src/provision.ts` | 1,3 | Enable chatCompletions, seed Convex files, add folder docs |
| `services/container-service/src/docker.ts` | 1,4 | Readiness check, remove dead state, stats flush |
| `services/container-service/src/router.ts` | 3 | Add sync-file endpoint |
| `convex/schema.ts` | 4 | Add tokenUsage + resourceSnapshots tables, extend memberStats |
| `convex/http.ts` | 2,4 | Add store-message + metrics endpoints |
| `convex/conversations.ts` | — | storeAgentMessage already exists (no change) |
| `convex/files.ts` | 3 | Add upsertFile mutation |
| `convex/tokenUsage.ts` | 4,5 | New file: recordTokenUsage, queries |
| `convex/crons.ts` | 4 | New file: retention pruning |
| `convex/members.ts` | 5 | Add getResourceHistory query, update create defaults |
| `packages/types/src/zeroclaw.ts` | 2 | Add usage event to DaemonEvent |
| `packages/constants/src/model-pricing.ts` | 4 | New file: MODEL_PRICING map |
| `apps/web/src/hooks/use-queries.ts` | 5 | Add useTokenUsage, useResourceHistory hooks |
| `apps/web/src/hooks/use-chat-stream.ts` | 2 | Handle usage event from stream |
| `apps/web/src/components/boxes/agent-box-list.tsx` | 5 | Add cost badge |
| `apps/web/src/components/boxes/box-desktop-panel.tsx` | 5 | Add token usage in header |
