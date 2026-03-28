import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { resolveAuth, resolveEmail, requirePermission } from "./lib/auth";
import { generateAvatar } from "./lib/avatar";

export const list = query({
  args: { machineToken: v.optional(v.string()) },
  handler: async (ctx) => {
    const resolved = await resolveEmail(ctx);
    if (!resolved) return [];

    // Find member by email
    const member = await ctx.db
      .query("members")
      .withIndex("by_email", (q) => q.eq("email", resolved.email))
      .first();
    if (!member) return [];

    // Find all workspace memberships
    const memberships = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_member", (q) => q.eq("memberId", member._id))
      .collect();

    const workspaces = [];
    for (const m of memberships) {
      const ws = await ctx.db.get(m.workspaceId);
      if (ws) workspaces.push({ ...ws, role: m.role });
    }
    return workspaces;
  },
});

export const getBySlug = query({
  args: { slug: v.string(), machineToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    return ctx.db
      .query("workspaces")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    displayName: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    industry: v.string(),
    industrySubtype: v.optional(v.string()),
    machineToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const resolved = await resolveEmail(ctx);
    if (!resolved) throw new Error("Not authenticated");

    // Check slug uniqueness
    const existing = await ctx.db
      .query("workspaces")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (existing) throw new Error("Workspace slug already taken");

    const wsId = await ctx.db.insert("workspaces", {
      name: args.name,
      displayName: args.displayName,
      slug: args.slug,
      description: args.description ?? "",
      industry: args.industry as any,
      industrySubtype: args.industrySubtype ?? null,
      status: "active",
      branding: { logo: null, color: "#6366f1" },
      taskTypes: [],
      providers: [],
      defaultProviderId: "zai",
      archivedAt: null,
    });

    // Find or create member for this email
    let member = await ctx.db
      .query("members")
      .withIndex("by_email", (q) => q.eq("email", resolved.email))
      .first();

    if (!member) {
      // First workspace creation — create the human member
      const memberId = await ctx.db.insert("members", {
        workspaceId: wsId,
        name: resolved.email.split("@")[0],
        type: "human",
        title: "Admin",
        specialization: "",
        teamId: null,
        isLead: false,
        system: false,
        status: "idle",
        currentTaskId: null,
        currentProjectId: null,
        avatarUrl: null,
        gender: 1,
        identity: null,
        stats: { tasksCompleted: 0, avgAgreementScore: 0, activeProjects: 0 },
        email: resolved.email,
        passwordHash: null,
        supervisedTeamIds: [],
        modelConfig: null,
      });
      member = await ctx.db.get(memberId);
    }

    // Add creator as admin
    await ctx.db.insert("workspaceMembers", {
      workspaceId: wsId,
      memberId: member!._id,
      role: "admin",
      joinedAt: new Date().toISOString(),
    });

    // Create system agents (Mono + Keros) — use ZeroClaw (headless, lightweight)
    const monoId = await ctx.db.insert("members", {
      workspaceId: wsId,
      name: "Mono",
      type: "agent",
      title: "Dispatcher",
      specialization: "Workspace Orchestration",
      teamId: null,
      isLead: false,
      system: true,
      status: "idle",
      currentTaskId: null,
      currentProjectId: null,
      avatarUrl: null,
      gender: 1,
      identity: {
        soul: "Calm, precise workspace orchestrator who routes conversations to the right teams and helps configure the workspace.",
        skills: ["workspace orchestration", "team routing", "org design"],
        memory: [],
      },
      stats: { tasksCompleted: 0, avgAgreementScore: 0, activeProjects: 0 },
      email: null,
      passwordHash: null,
      supervisedTeamIds: [],
      permissions: ["members:read", "teams:read", "projects:read", "tasks:read", "conversations:read", "files:read"],
      modelConfig: null,
      runtime: "zeroclaw",
      desktop: false,
    });

    const kerosId = await ctx.db.insert("members", {
      workspaceId: wsId,
      name: "Keros",
      type: "agent",
      title: "Project Manager",
      specialization: "Project Lifecycle Management",
      teamId: null,
      isLead: false,
      system: true,
      status: "idle",
      currentTaskId: null,
      currentProjectId: null,
      avatarUrl: null,
      gender: 1,
      identity: {
        soul: "Strategic project orchestrator who decomposes user intent into actionable projects, tasks, and team assignments.",
        skills: ["project planning", "WBS decomposition", "task management", "team assignment"],
        memory: [],
      },
      stats: { tasksCompleted: 0, avgAgreementScore: 0, activeProjects: 0 },
      email: null,
      passwordHash: null,
      supervisedTeamIds: [],
      permissions: ["members:read", "teams:read", "projects:read", "projects:write", "tasks:read", "tasks:write", "conversations:read", "files:read", "files:write"],
      modelConfig: null,
      runtime: "zeroclaw",
      desktop: false,
    });

    // Generate avatars for system agents
    const monoAvatar = generateAvatar({ seed: monoId, gender: 1 });
    const kerosAvatar = generateAvatar({ seed: kerosId, gender: 1 });
    await ctx.db.patch(monoId, { avatarUrl: monoAvatar });
    await ctx.db.patch(kerosId, { avatarUrl: kerosAvatar });

    const now = new Date().toISOString();

    // Create API keys for system agents
    for (const [agentId, agentName] of [
      [monoId, "Mono"],
      [kerosId, "Keros"],
    ] as const) {
      const rawKey = `mk_dev_${agentId}`;
      await ctx.db.insert("apiKeys", {
        key: rawKey,
        prefix: rawKey.substring(0, 11),
        memberId: agentId,
        workspaceId: wsId,
        name: `${agentName} API Key`,
        permissions: ["*"],
        lastUsedAt: null,
        expiresAt: null,
        revoked: false,
      });
    }

    // Create system agent conversations
    for (const [agentId, agentName] of [
      [monoId, "Mono"],
      [kerosId, "Keros"],
    ] as const) {
      await ctx.db.insert("conversations", {
        workspaceId: wsId,
        createdBy: agentId as string,
        title: agentName,
        type: "agent_dm",
        projectId: null,
        taskId: null,
        participantIds: [agentId as string],
        lastMessageAt: now,
        messageCount: 0,
      });
    }

    // Schedule container auto-start for system agents
    await ctx.scheduler.runAfter(0, internal.members.startContainerInternal, {
      workspaceId: wsId,
      memberId: monoId,
    });
    await ctx.scheduler.runAfter(0, internal.members.startContainerInternal, {
      workspaceId: wsId,
      memberId: kerosId,
    });

    return wsId;
  },
});

export const remove = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    confirmName: v.string(),
    machineToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });
    requirePermission(auth, "workspace:admin");

    const workspace = await ctx.db.get(auth.workspaceId);
    if (!workspace) throw new Error("Workspace not found");
    if (workspace.name !== args.confirmName) {
      throw new Error("Confirmation name does not match");
    }

    // Cascade delete all workspace data
    const tables = [
      "members",
      "teams",
      "projects",
      "tasks",
      "conversations",
      "notifications",
      "workspaceMembers",
      "agentRuntimes",
    ] as const;

    for (const table of tables) {
      const items = await (ctx.db.query(table) as any)
        .withIndex("by_workspace", (q: any) => q.eq("workspaceId", auth.workspaceId))
        .collect();
      for (const item of items) {
        // Delete messages for conversations
        if (table === "conversations") {
          const messages = await ctx.db
            .query("messages")
            .withIndex("by_conversation", (q) => q.eq("conversationId", item._id as any))
            .collect();
          for (const msg of messages) {
            await ctx.db.delete(msg._id);
          }
        }
        await ctx.db.delete(item._id);
      }
    }

    // Delete API keys
    const apiKeys = await ctx.db.query("apiKeys").collect();
    for (const key of apiKeys) {
      if (key.workspaceId === auth.workspaceId) {
        await ctx.db.delete(key._id);
      }
    }

    // Delete files
    const files = await ctx.db
      .query("files")
      .withIndex("by_workspace_drive", (q) => q.eq("workspaceId", auth.workspaceId))
      .collect();
    for (const f of files) {
      await ctx.db.delete(f._id);
    }

    // Delete activities
    const activities = await ctx.db
      .query("activities")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", auth.workspaceId))
      .collect();
    for (const a of activities) {
      await ctx.db.delete(a._id);
    }

    await ctx.db.delete(auth.workspaceId);
  },
});

export const getConfig = query({
  args: { workspaceId: v.id("workspaces"), machineToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });
    return ctx.db.get(auth.workspaceId);
  },
});

export const updateConfig = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    displayName: v.optional(v.string()),
    description: v.optional(v.string()),
    industry: v.optional(v.string()),
    industrySubtype: v.optional(v.string()),
    branding: v.optional(
      v.object({
        logo: v.union(v.string(), v.null()),
        color: v.string(),
      }),
    ),
    taskTypes: v.optional(
      v.array(v.object({ name: v.string(), label: v.string(), color: v.string() })),
    ),
    machineToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });
    requirePermission(auth, "workspace:admin");

    const updates: Record<string, any> = {};
    if (args.displayName !== undefined) updates.displayName = args.displayName;
    if (args.description !== undefined) updates.description = args.description;
    if (args.industry !== undefined) updates.industry = args.industry;
    if (args.industrySubtype !== undefined) updates.industrySubtype = args.industrySubtype;
    if (args.branding !== undefined) updates.branding = args.branding;
    if (args.taskTypes !== undefined) updates.taskTypes = args.taskTypes;

    await ctx.db.patch(auth.workspaceId, updates);
    return auth.workspaceId;
  },
});

export const listProviders = query({
  args: { workspaceId: v.id("workspaces"), machineToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });
    const ws = await ctx.db.get(auth.workspaceId);
    if (!ws) throw new Error("Workspace not found");

    // Mask API keys
    return ws.providers.map((p) => ({
      ...p,
      apiKey: p.apiKey ? `${p.apiKey.substring(0, 8)}...` : "",
    }));
  },
});

export const addProvider = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    provider: v.string(),
    baseUrl: v.string(),
    apiKey: v.string(),
    defaultModel: v.string(),
    label: v.optional(v.string()),
    machineToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });
    requirePermission(auth, "workspace:admin");

    const ws = await ctx.db.get(auth.workspaceId);
    if (!ws) throw new Error("Workspace not found");

    // Check duplicate
    if (ws.providers.some((p) => p.provider === args.provider)) {
      throw new Error("Provider already configured");
    }

    const newProvider = {
      provider: args.provider,
      baseUrl: args.baseUrl,
      apiKey: args.apiKey,
      defaultModel: args.defaultModel,
      label: args.label,
    };

    await ctx.db.patch(auth.workspaceId, {
      providers: [...ws.providers, newProvider],
    });

    // Set as default if first provider
    if (ws.providers.length === 0) {
      await ctx.db.patch(auth.workspaceId, {
        defaultProviderId: args.provider,
      });
    }
  },
});

export const updateProvider = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    provider: v.string(),
    baseUrl: v.optional(v.string()),
    apiKey: v.optional(v.string()),
    defaultModel: v.optional(v.string()),
    label: v.optional(v.string()),
    machineToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });
    requirePermission(auth, "workspace:admin");

    const ws = await ctx.db.get(auth.workspaceId);
    if (!ws) throw new Error("Workspace not found");

    const idx = ws.providers.findIndex((p) => p.provider === args.provider);
    if (idx === -1) throw new Error("Provider not found");

    const updated = [...ws.providers];
    updated[idx] = {
      ...updated[idx],
      ...(args.baseUrl !== undefined && { baseUrl: args.baseUrl }),
      ...(args.apiKey !== undefined && { apiKey: args.apiKey }),
      ...(args.defaultModel !== undefined && {
        defaultModel: args.defaultModel,
      }),
      ...(args.label !== undefined && { label: args.label }),
    };

    await ctx.db.patch(auth.workspaceId, { providers: updated });
  },
});

export const removeProvider = mutation({
  args: { workspaceId: v.id("workspaces"), provider: v.string(), machineToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });
    requirePermission(auth, "workspace:admin");

    const ws = await ctx.db.get(auth.workspaceId);
    if (!ws) throw new Error("Workspace not found");

    const updated = ws.providers.filter((p) => p.provider !== args.provider);
    const patches: Record<string, any> = { providers: updated };

    // If we removed the default, pick the first remaining or clear
    if (ws.defaultProviderId === args.provider) {
      patches.defaultProviderId = updated.length > 0 ? updated[0].provider : "";
    }

    await ctx.db.patch(auth.workspaceId, patches);
  },
});

export const setDefaultProvider = mutation({
  args: { workspaceId: v.id("workspaces"), provider: v.string(), machineToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });
    requirePermission(auth, "workspace:admin");

    const ws = await ctx.db.get(auth.workspaceId);
    if (!ws) throw new Error("Workspace not found");

    if (!ws.providers.some((p) => p.provider === args.provider)) {
      throw new Error("Provider not configured");
    }

    await ctx.db.patch(auth.workspaceId, {
      defaultProviderId: args.provider,
    });
  },
});

/** Dev-only: ensure system agents have conversations and API keys. */
export const fixSystemAgents = mutation({
  args: { workspaceId: v.id("workspaces"), machineToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const ws = await ctx.db.get(args.workspaceId);
    if (!ws) throw new Error("Workspace not found");

    const allMembers = await ctx.db
      .query("members")
      .withIndex("by_workspace", (q: any) => q.eq("workspaceId", args.workspaceId))
      .collect();

    const systemAgents = allMembers.filter((m: any) => m.system && m.type === "agent");
    const now = new Date().toISOString();
    let created = { conversations: 0, apiKeys: 0 };

    for (const agent of systemAgents) {
      // Check if conversation exists
      const existingConv = await ctx.db
        .query("conversations")
        .withIndex("by_workspace", (q: any) => q.eq("workspaceId", args.workspaceId))
        .collect();
      const hasConv = existingConv.some(
        (c: any) => c.type === "agent_dm" && c.participantIds?.includes(agent._id),
      );
      if (!hasConv) {
        await ctx.db.insert("conversations", {
          workspaceId: args.workspaceId,
          createdBy: agent._id as string,
          title: agent.name,
          type: "agent_dm",
          projectId: null,
          taskId: null,
          participantIds: [agent._id as string],
          lastMessageAt: now,
          messageCount: 0,
        });
        created.conversations++;
      }

      // Check if API key exists
      const existingKeys = await ctx.db.query("apiKeys").collect();
      const hasKey = existingKeys.some(
        (k: any) => k.memberId === agent._id && k.workspaceId === args.workspaceId,
      );
      if (!hasKey) {
        const rawKey = `mk_dev_${agent._id}`;
        await ctx.db.insert("apiKeys", {
          key: rawKey,
          prefix: rawKey.substring(0, 11),
          memberId: agent._id,
          workspaceId: args.workspaceId,
          name: `${agent.name} API Key`,
          permissions: ["*"],
          lastUsedAt: null,
          expiresAt: null,
          revoked: false,
        });
        created.apiKeys++;
      }
    }

    return { systemAgents: systemAgents.map((a: any) => a.name), created };
  },
});
