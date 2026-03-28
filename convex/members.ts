import { query, mutation, action, internalMutation, internalAction, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { resolveAuth, requirePermission } from "./lib/auth";
import { assertOwnership, buildPatch } from "./lib/crud";
import { notifyHumans } from "./lib/notify";
import {
  memberType,
  memberGender,
  memberIdentity,
  memberStatus,
  agentModelConfig,
} from "./schema";

// ── Runtime helper ─────────────────────────────────────────────────────────

/** Resolve the agent runtime type, defaulting to "openclaw" for backward compat. */
function memberRuntime(member: any): "zeroclaw" | "openclaw" {
  return member.runtime ?? "openclaw";
}

/** Resolve whether this agent has a desktop. Defaults: openclaw→true, zeroclaw→false. */
function memberDesktop(member: any): boolean {
  if (member.desktop !== undefined && member.desktop !== null) {
    return member.desktop;
  }
  return memberRuntime(member) === "openclaw";
}

// ── Shared helpers for container provisioning ──────────────────────────────

function toProvisionMember(m: any) {
  return {
    id: m._id ?? m.id,
    name: m.name,
    title: m.title ?? "",
    specialization: m.specialization ?? "",
    teamId: m.teamId ?? null,
    isLead: m.isLead ?? false,
    system: m.system ?? false,
    type: m.type ?? "agent",
    identity: m.identity ?? undefined,
    modelConfig: m.modelConfig ?? undefined,
  };
}

function resolveProvider(member: any, workspace: any) {
  const wsProviders = workspace.providers ?? [];
  const memberProviderId = member.modelConfig?.providerId;
  const wsProvider = memberProviderId
    ? wsProviders.find((p: any) => p.provider === memberProviderId)
    : wsProviders.find((p: any) => p.provider === workspace.defaultProviderId);

  const providerId = wsProvider?.provider ?? memberProviderId ?? "custom";

  return {
    providerId,
    baseUrl: wsProvider?.baseUrl ?? process.env.LLM_BASE_URL ?? "",
    model: member.modelConfig?.model ?? wsProvider?.defaultModel ?? process.env.LLM_MODEL ?? "",
    apiKey: member.modelConfig?.apiKeyOverride ?? wsProvider?.apiKey ?? process.env.LLM_API_KEY ?? "",
  };
}

function buildProvision(member: any, allMembers: any[], allTeams: any[], workspace: any) {
  return {
    member: toProvisionMember(member),
    allMembers: allMembers.map(toProvisionMember),
    allTeams: allTeams.map((t: any) => ({
      id: t._id ?? t.id,
      name: t.name,
      leadId: t.leadId ?? null,
    })),
    workspace: {
      slug: workspace.slug,
      displayName: workspace.name ?? workspace.displayName ?? workspace.slug,
      industry: workspace.industry ?? "technology",
    },
    provider: resolveProvider(member, workspace),
    runtimeType: memberRuntime(member),
    desktop: memberDesktop(member),
  };
}

export const list = query({
  args: { workspaceId: v.id("workspaces"), machineToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });
    requirePermission(auth, "members:read");
    return ctx.db
      .query("members")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", auth.workspaceId))
      .collect();
  },
});

export const get = query({
  args: { workspaceId: v.id("workspaces"), memberId: v.id("members"), machineToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });
    requirePermission(auth, "members:read");
    return assertOwnership(ctx, args.memberId, auth, "Member");
  },
});

/** Internal: get member by ID without auth (for system API lookups). */
export const getInternal = internalQuery({
  args: { memberId: v.id("members") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.memberId);
  },
});

export const create = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    name: v.string(),
    type: memberType,
    title: v.string(),
    specialization: v.string(),
    teamId: v.optional(v.id("teams")),
    gender: memberGender,
    identity: v.optional(memberIdentity),
    email: v.optional(v.string()),
    modelConfig: v.optional(agentModelConfig),
    runtime: v.optional(v.union(v.literal("zeroclaw"), v.literal("openclaw"))),
    desktop: v.optional(v.boolean()),
    machineToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });
    requirePermission(auth, "members:write");

    const memberId = await ctx.db.insert("members", {
      workspaceId: auth.workspaceId,
      name: args.name,
      type: args.type,
      title: args.title,
      specialization: args.specialization,
      teamId: args.teamId ?? null,
      isLead: false,
      system: false,
      status: "idle",
      currentTaskId: null,
      currentProjectId: null,
      avatarUrl: null,
      gender: args.gender,
      identity: args.identity ?? null,
      stats: { tasksCompleted: 0, avgAgreementScore: 0, activeProjects: 0 },
      email: args.email ?? null,
      passwordHash: null,
      supervisedTeamIds: [],
      modelConfig: args.modelConfig ?? null,
      runtime: args.runtime,
      desktop: args.desktop,
    });

    // Auto-generate API key for agents
    if (args.type === "agent") {
      const rawKey = `mk_dev_${memberId}`;
      await ctx.db.insert("apiKeys", {
        key: rawKey,
        prefix: rawKey.substring(0, 11),
        memberId,
        workspaceId: auth.workspaceId,
        name: `${args.name} API Key`,
        permissions: [
          "members:read",
          "teams:read",
          "projects:read",
          "tasks:read",
          "tasks:write",
          "conversations:read",
          "conversations:write",
          "files:read",
          "files:write",
        ],
        lastUsedAt: null,
        expiresAt: null,
        revoked: false,
      });
    }

    // Add to team if specified
    if (args.teamId) {
      const team = await ctx.db.get(args.teamId);
      if (team) {
        await ctx.db.patch(args.teamId, {
          memberIds: [...team.memberIds, memberId],
        });
      }
    }

    await notifyHumans(ctx, auth.workspaceId, {
      type: "member_added",
      title: "New member",
      body: `${args.name} has been added to the workspace.`,
      entityType: "member",
      entityId: memberId as string,
      actorId: auth.memberId as string,
    });

    return memberId;
  },
});

const UPDATE_FIELDS = [
  "name", "title", "specialization", "teamId", "gender",
  "identity", "modelConfig", "supervisedTeamIds", "runtime", "desktop",
] as const;

export const update = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    memberId: v.id("members"),
    name: v.optional(v.string()),
    title: v.optional(v.string()),
    specialization: v.optional(v.string()),
    teamId: v.optional(v.union(v.id("teams"), v.null())),
    gender: v.optional(memberGender),
    identity: v.optional(v.union(memberIdentity, v.null())),
    modelConfig: v.optional(v.union(agentModelConfig, v.null())),
    supervisedTeamIds: v.optional(v.array(v.string())),
    runtime: v.optional(v.union(v.literal("zeroclaw"), v.literal("openclaw"))),
    desktop: v.optional(v.boolean()),
    machineToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });
    requirePermission(auth, "members:write");
    const member = await assertOwnership(ctx, args.memberId, auth, "Member");

    await ctx.db.patch(args.memberId, buildPatch(args, UPDATE_FIELDS));

    // Live-update model on running agent container (no restart needed)
    if (args.modelConfig !== undefined && member.type === "agent") {
      const runtime = await ctx.db
        .query("agentRuntimes")
        .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
        .first();
      if (runtime?.status === "running") {
        await ctx.scheduler.runAfter(0, internal.members.updateModelInternal, {
          workspaceId: args.workspaceId,
          memberId: args.memberId,
        });
      }
    }

    return args.memberId;
  },
});

export const updateStatus = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    memberId: v.id("members"),
    status: memberStatus,
    currentTaskId: v.optional(v.union(v.id("tasks"), v.null())),
    currentProjectId: v.optional(v.union(v.id("projects"), v.null())),
    machineToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });
    await assertOwnership(ctx, args.memberId, auth, "Member");

    const patch: Record<string, any> = { status: args.status };
    if (args.currentTaskId !== undefined) patch.currentTaskId = args.currentTaskId;
    if (args.currentProjectId !== undefined) patch.currentProjectId = args.currentProjectId;

    await ctx.db.patch(args.memberId, patch);
  },
});

export const remove = mutation({
  args: { workspaceId: v.id("workspaces"), memberId: v.id("members"), machineToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });
    requirePermission(auth, "members:manage");

    const member = await assertOwnership(ctx, args.memberId, auth, "Member");

    if (member.system) {
      throw new Error("Cannot delete system agents");
    }

    // Remove from team
    if (member.teamId) {
      const team = await ctx.db.get(member.teamId as Id<"teams">);
      if (team) {
        await ctx.db.patch(team._id, {
          memberIds: team.memberIds.filter((id) => id !== args.memberId),
        });
      }
    }

    // Delete API keys
    const apiKeys = await ctx.db
      .query("apiKeys")
      .withIndex("by_workspace_member", (q) =>
        q.eq("workspaceId", auth.workspaceId).eq("memberId", args.memberId),
      )
      .collect();
    for (const key of apiKeys) {
      await ctx.db.delete(key._id);
    }

    // Delete agent runtime
    const runtime = await ctx.db
      .query("agentRuntimes")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .first();
    if (runtime) {
      await ctx.db.delete(runtime._id);
    }

    await ctx.db.delete(args.memberId);

    await notifyHumans(ctx, auth.workspaceId, {
      type: "member_removed",
      title: "Member removed",
      body: `${member.name} has been removed from the workspace.`,
      entityType: "member",
      entityId: args.memberId as string,
      actorId: auth.memberId as string,
    });
  },
});

export const getRuntime = query({
  args: { workspaceId: v.id("workspaces"), memberId: v.id("members"), machineToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });
    requirePermission(auth, "members:read");

    return ctx.db
      .query("agentRuntimes")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .first();
  },
});

export const getDesktop = query({
  args: { workspaceId: v.id("workspaces"), memberId: v.id("members"), machineToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });
    requirePermission(auth, "members:read");

    const runtime = await ctx.db
      .query("agentRuntimes")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .first();

    if (!runtime || !runtime.vncPort) return null;
    return { vncPort: runtime.vncPort, status: runtime.status };
  },
});

/** Upsert agentRuntimes record (internal — called after container start/stop). */
export const upsertRuntime = internalMutation({
  args: {
    memberId: v.id("members"),
    workspaceId: v.id("workspaces"),
    containerId: v.union(v.string(), v.null()),
    vncPort: v.union(v.float64(), v.null()),
    status: v.union(v.literal("stopped"), v.literal("running"), v.literal("error")),
    error: v.optional(v.string()),
    runtimeType: v.optional(v.union(v.literal("zeroclaw"), v.literal("openclaw"))),
    hasDesktop: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("agentRuntimes")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .first();

    const now = new Date().toISOString();

    if (existing) {
      const patch: Record<string, any> = {
        containerId: args.containerId,
        vncPort: args.vncPort,
        status: args.status,
        lastHealthCheck: now,
        error: args.error,
      };
      if (args.runtimeType) {
        patch.runtimeType = args.runtimeType;
      }
      if (args.hasDesktop !== undefined) {
        patch.hasDesktop = args.hasDesktop;
      }
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }

    return ctx.db.insert("agentRuntimes", {
      memberId: args.memberId,
      workspaceId: args.workspaceId,
      containerId: args.containerId,
      containerName: null,
      vncPort: args.vncPort,
      openclawUrl: null,
      gatewayUrl: null,
      runtimeType: args.runtimeType ?? "openclaw",
      hasDesktop: args.hasDesktop,
      status: args.status,
      lastHealthCheck: now,
      error: args.error,
      retryCount: 0,
      nextRetryAt: null,
      lifecycle: "active",
    });
  },
});

/** Update member status field (internal). */
export const updateMemberStatus = internalMutation({
  args: {
    memberId: v.id("members"),
    status: memberStatus,
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.memberId, { status: args.status });
  },
});

/** Internal action to start a container (for scheduler use, no auth check). */
export const startContainerInternal = internalAction({
  args: { workspaceId: v.id("workspaces"), memberId: v.id("members") },
  handler: async (ctx, args) => {
    const containerServiceUrl = process.env.CONTAINER_SERVICE_URL ?? "http://localhost:3002";
    const secret = process.env.CONTAINER_SERVICE_SECRET ?? "";

    try {
      // Fetch provisioning data
      const [member, allMembers, allTeams, workspace] = await Promise.all([
        ctx.runQuery(api.members.get, { workspaceId: args.workspaceId, memberId: args.memberId }),
        ctx.runQuery(api.members.list, { workspaceId: args.workspaceId }),
        ctx.runQuery(api.teams.list, { workspaceId: args.workspaceId }),
        ctx.runQuery(api.workspaces.getConfig, { workspaceId: args.workspaceId }),
      ]);

      if (!member || !workspace) {
        await ctx.runMutation(internal.members.upsertRuntime, {
          memberId: args.memberId,
          workspaceId: args.workspaceId,
          containerId: null,
          vncPort: null,
          status: "error",
          error: "Member or workspace not found",
        });
        return;
      }

      const provision = buildProvision(member, allMembers ?? [], allTeams ?? [], workspace);

      const runtimeType = memberRuntime(member);
      const desktop = memberDesktop(member);

      const res = await fetch(`${containerServiceUrl}/containers/${args.memberId}/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify({ workspaceId: workspace.slug, provision, runtimeType, desktop }),
      });

      if (!res.ok) {
        const text = await res.text();
        await ctx.runMutation(internal.members.upsertRuntime, {
          memberId: args.memberId,
          workspaceId: args.workspaceId,
          containerId: null,
          vncPort: null,
          status: "error",
          error: `Container start failed: ${text}`,
        });
        return;
      }

      const data: { containerId?: string; vncPort?: number; runtimeType?: string } = await res.json();
      await ctx.runMutation(internal.members.upsertRuntime, {
        memberId: args.memberId,
        workspaceId: args.workspaceId,
        containerId: data.containerId ?? null,
        vncPort: data.vncPort ?? null,
        status: "running",
        runtimeType,
        hasDesktop: desktop,
      });
      await ctx.runMutation(internal.members.updateMemberStatus, {
        memberId: args.memberId,
        status: "idle",
      });
    } catch (err: any) {
      await ctx.runMutation(internal.members.upsertRuntime, {
        memberId: args.memberId,
        workspaceId: args.workspaceId,
        containerId: null,
        vncPort: null,
        status: "error",
        error: err?.message ?? "Unknown error starting container",
      });
    }
  },
});

/** Start agent container via external Bun service. */
export const startContainer = action({
  args: { workspaceId: v.id("workspaces"), memberId: v.id("members"), machineToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const containerServiceUrl = process.env.CONTAINER_SERVICE_URL ?? "http://localhost:3002";
    const secret = process.env.CONTAINER_SERVICE_SECRET ?? "";

    // Fetch provisioning data: member, all members, all teams, workspace
    const [member, allMembers, allTeams, workspace] = await Promise.all([
      ctx.runQuery(api.members.get, { workspaceId: args.workspaceId, memberId: args.memberId }),
      ctx.runQuery(api.members.list, { workspaceId: args.workspaceId }),
      ctx.runQuery(api.teams.list, { workspaceId: args.workspaceId }),
      ctx.runQuery(api.workspaces.getConfig, { workspaceId: args.workspaceId }),
    ]);

    if (!member) throw new Error("Member not found");
    if (!workspace) throw new Error("Workspace not found");

    const provision = buildProvision(member, allMembers ?? [], allTeams ?? [], workspace);
    const runtimeType = memberRuntime(member);
    const desktop = memberDesktop(member);

    const res = await fetch(`${containerServiceUrl}/containers/${args.memberId}/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ workspaceId: workspace.slug, provision, runtimeType, desktop }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Container start failed: ${text}`);
    }

    const data: { containerId?: string; vncPort?: number } = await res.json();

    // Persist runtime record so frontend can query status and VNC port
    await ctx.runMutation(internal.members.upsertRuntime, {
      memberId: args.memberId,
      workspaceId: args.workspaceId,
      containerId: data.containerId ?? null,
      vncPort: data.vncPort ?? null,
      status: "running",
      runtimeType,
      hasDesktop: desktop,
    });

    return data;
  },
});

/** Stop agent container via external Bun service. */
export const stopContainer = action({
  args: { workspaceId: v.id("workspaces"), memberId: v.id("members"), machineToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const containerServiceUrl = process.env.CONTAINER_SERVICE_URL ?? "http://localhost:3002";
    const secret = process.env.CONTAINER_SERVICE_SECRET ?? "";

    const res = await fetch(`${containerServiceUrl}/containers/${args.memberId}/stop`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Container stop failed: ${text}`);
    }

    const data = await res.json();

    // Update runtime record to stopped
    await ctx.runMutation(internal.members.upsertRuntime, {
      memberId: args.memberId,
      workspaceId: args.workspaceId,
      containerId: null,
      vncPort: null,
      status: "stopped",
    });

    return data;
  },
});

/** Restart agent container with fresh provisioning data (public, auth-gated). */
export const restartContainer = action({
  args: { workspaceId: v.id("workspaces"), memberId: v.id("members"), machineToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const containerServiceUrl = process.env.CONTAINER_SERVICE_URL ?? "http://localhost:3002";
    const secret = process.env.CONTAINER_SERVICE_SECRET ?? "";

    const [member, allMembers, allTeams, workspace] = await Promise.all([
      ctx.runQuery(api.members.get, { workspaceId: args.workspaceId, memberId: args.memberId }),
      ctx.runQuery(api.members.list, { workspaceId: args.workspaceId }),
      ctx.runQuery(api.teams.list, { workspaceId: args.workspaceId }),
      ctx.runQuery(api.workspaces.getConfig, { workspaceId: args.workspaceId }),
    ]);

    if (!member) throw new Error("Member not found");
    if (!workspace) throw new Error("Workspace not found");

    const provision = buildProvision(member, allMembers ?? [], allTeams ?? [], workspace);
    const runtimeType = memberRuntime(member);
    const desktop = memberDesktop(member);

    const res = await fetch(`${containerServiceUrl}/containers/${args.memberId}/restart`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ workspaceId: workspace.slug, provision, runtimeType, desktop }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Container restart failed: ${text}`);
    }

    const data: { containerId?: string; vncPort?: number } = await res.json();

    await ctx.runMutation(internal.members.upsertRuntime, {
      memberId: args.memberId,
      workspaceId: args.workspaceId,
      containerId: data.containerId ?? null,
      vncPort: data.vncPort ?? null,
      status: "running",
      runtimeType,
      hasDesktop: desktop,
    });

    return data;
  },
});

/** Internal action to restart a container (for scheduler use, no auth check). */
export const restartContainerInternal = internalAction({
  args: { workspaceId: v.id("workspaces"), memberId: v.id("members") },
  handler: async (ctx, args) => {
    const containerServiceUrl = process.env.CONTAINER_SERVICE_URL ?? "http://localhost:3002";
    const secret = process.env.CONTAINER_SERVICE_SECRET ?? "";

    try {
      const [member, allMembers, allTeams, workspace] = await Promise.all([
        ctx.runQuery(api.members.get, { workspaceId: args.workspaceId, memberId: args.memberId }),
        ctx.runQuery(api.members.list, { workspaceId: args.workspaceId }),
        ctx.runQuery(api.teams.list, { workspaceId: args.workspaceId }),
        ctx.runQuery(api.workspaces.getConfig, { workspaceId: args.workspaceId }),
      ]);

      if (!member || !workspace) {
        await ctx.runMutation(internal.members.upsertRuntime, {
          memberId: args.memberId,
          workspaceId: args.workspaceId,
          containerId: null,
          vncPort: null,
          status: "error",
          error: "Member or workspace not found",
        });
        return;
      }

      const provision = buildProvision(member, allMembers ?? [], allTeams ?? [], workspace);
      const runtimeType = memberRuntime(member);
      const desktop = memberDesktop(member);

      const res = await fetch(`${containerServiceUrl}/containers/${args.memberId}/restart`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify({ workspaceId: workspace.slug, provision, runtimeType, desktop }),
      });

      if (!res.ok) {
        const text = await res.text();
        await ctx.runMutation(internal.members.upsertRuntime, {
          memberId: args.memberId,
          workspaceId: args.workspaceId,
          containerId: null,
          vncPort: null,
          status: "error",
          error: `Container restart failed: ${text}`,
        });
        return;
      }

      const data: { containerId?: string; vncPort?: number } = await res.json();
      await ctx.runMutation(internal.members.upsertRuntime, {
        memberId: args.memberId,
        workspaceId: args.workspaceId,
        containerId: data.containerId ?? null,
        vncPort: data.vncPort ?? null,
        status: "running",
        runtimeType,
        hasDesktop: desktop,
      });
    } catch (err: any) {
      await ctx.runMutation(internal.members.upsertRuntime, {
        memberId: args.memberId,
        workspaceId: args.workspaceId,
        containerId: null,
        vncPort: null,
        status: "error",
        error: err?.message ?? "Unknown error restarting container",
      });
    }
  },
});

/** Update model config on a running agent without container restart. */
export const updateModelInternal = internalAction({
  args: { workspaceId: v.id("workspaces"), memberId: v.id("members") },
  handler: async (ctx, args) => {
    const containerServiceUrl = process.env.CONTAINER_SERVICE_URL ?? "http://localhost:3002";
    const secret = process.env.CONTAINER_SERVICE_SECRET ?? "";

    try {
      const [member, workspace] = await Promise.all([
        ctx.runQuery(api.members.get, { workspaceId: args.workspaceId, memberId: args.memberId }),
        ctx.runQuery(api.workspaces.getConfig, { workspaceId: args.workspaceId }),
      ]);

      if (!member || !workspace) return;

      const provider = resolveProvider(member, workspace);

      const runtimeType = memberRuntime(member);

      const res = await fetch(`${containerServiceUrl}/containers/${args.memberId}/model`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify({
          workspaceSlug: workspace.slug,
          provider,
          runtimeType,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error(`[members] Model update failed for ${args.memberId}: ${text}`);
      }
    } catch (err: any) {
      console.error(`[members] Model update error for ${args.memberId}: ${err?.message}`);
    }
  },
});

/** Get the authenticated caller's role in a workspace. */
export const getCallerRole = query({
  args: { workspaceId: v.id("workspaces"), machineToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });
    return auth.role;
  },
});

/** Get container stats via container-service (auth-gated). */
export const getContainerStats = action({
  args: { workspaceId: v.id("workspaces"), memberId: v.id("members"), machineToken: v.optional(v.string()) },
  handler: async (ctx, args): Promise<{ cpuPercent: number; memoryMb: number; windows: string[]; updatedAt: string | null }> => {
    // Verify member belongs to workspace (resolveAuth inside `get` validates JWT)
    const member = await ctx.runQuery(api.members.get, {
      workspaceId: args.workspaceId,
      memberId: args.memberId,
    }) as Record<string, unknown> | null;
    if (!member) throw new Error("Member not found");

    const containerServiceUrl = process.env.CONTAINER_SERVICE_URL ?? "http://localhost:3002";
    const secret = process.env.CONTAINER_SERVICE_SECRET ?? "";

    const res = await fetch(
      `${containerServiceUrl}/containers/${args.memberId}/stats?workspaceId=${args.workspaceId}`,
      {
        headers: secret ? { Authorization: `Bearer ${secret}` } : {},
        signal: AbortSignal.timeout(5_000),
      },
    );

    if (!res.ok) {
      return { cpuPercent: 0, memoryMb: 0, windows: [], updatedAt: null };
    }
    return res.json();
  },
});

/** Create a VNC desktop session with role-based access control. */
export const createDesktopSession = action({
  args: {
    workspaceId: v.id("workspaces"),
    memberId: v.id("members"),
    interactive: v.optional(v.boolean()),
    machineToken: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ wsUrl: string | null; isAdmin: boolean; viewOnly: boolean }> => {
    // Verify member belongs to workspace
    const member = await ctx.runQuery(api.members.get, {
      workspaceId: args.workspaceId,
      memberId: args.memberId,
    }) as Record<string, unknown> | null;
    if (!member) throw new Error("Member not found");

    // Determine caller's role
    const callerRole: string = await ctx.runQuery(api.members.getCallerRole, {
      workspaceId: args.workspaceId,
    }) as string;

    const isAdmin: boolean = callerRole === "admin";
    const interactive: boolean = args.interactive === true && isAdmin;
    const role: string = isAdmin && interactive ? "admin" : "viewer";

    const containerServiceUrl = process.env.CONTAINER_SERVICE_URL ?? "http://localhost:3002";
    const secret = process.env.CONTAINER_SERVICE_SECRET ?? "";

    const res = await fetch(
      `${containerServiceUrl}/containers/${args.memberId}/vnc-session`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
        },
        body: JSON.stringify({
          workspaceId: args.workspaceId as string,
          role,
          interactive,
        }),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Desktop session failed: ${text}`);
    }

    const data: { wsUrl: string | null; viewOnly: boolean } = await res.json();
    return { wsUrl: data.wsUrl, isAdmin, viewOnly: data.viewOnly };
  },
});

/** Reroll agent name (fetches from randomuser.me). */
export const rerollName = action({
  args: { workspaceId: v.id("workspaces"), memberId: v.id("members"), machineToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const member = await ctx.runQuery(api.members.get, {
      workspaceId: args.workspaceId,
      memberId: args.memberId,
    });
    if (!member) throw new Error("Member not found");

    const gender = member.gender === 1 ? "male" : "female";
    const res = await fetch(`https://randomuser.me/api/?gender=${gender}&nat=us&inc=name`);
    const data = await res.json();
    const newName: string = data.results[0].name.first;

    await ctx.runMutation(api.members.update, {
      workspaceId: args.workspaceId,
      memberId: args.memberId,
      name: newName,
    });

    return { name: newName };
  },
});

/** Reroll agent identity (name + gender). */
export const rerollIdentity = action({
  args: { workspaceId: v.id("workspaces"), memberId: v.id("members"), machineToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const newGender = (Math.random() > 0.5 ? 1 : 2) as 1 | 2;
    const genderStr = newGender === 1 ? "male" : "female";

    const res = await fetch(`https://randomuser.me/api/?gender=${genderStr}&nat=us&inc=name`);
    const data = await res.json();
    const newName: string = data.results[0].name.first;

    await ctx.runMutation(api.members.update, {
      workspaceId: args.workspaceId,
      memberId: args.memberId,
      name: newName,
      gender: newGender,
    });

    return { name: newName, gender: newGender };
  },
});
