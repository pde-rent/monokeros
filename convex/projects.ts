import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { resolveAuth, requirePermission } from "./lib/auth";
import { assertOwnership, buildPatch } from "./lib/crud";
import { notifyHumans } from "./lib/notify";

export const list = query({
  args: {
    workspaceId: v.id("workspaces"),
    status: v.optional(v.string()),
    search: v.optional(v.string()),
    machineToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });
    requirePermission(auth, "projects:read");

    if (args.search) {
      return ctx.db
        .query("projects")
        .withSearchIndex("search_name", (q) =>
          q.search("name", args.search!).eq("workspaceId", auth.workspaceId),
        )
        .take(50);
    }

    if (args.status) {
      return ctx.db
        .query("projects")
        .withIndex("by_workspace_status", (q) =>
          q.eq("workspaceId", auth.workspaceId).eq("status", args.status as any),
        )
        .collect();
    }

    return ctx.db
      .query("projects")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", auth.workspaceId))
      .collect();
  },
});

export const get = query({
  args: {
    workspaceId: v.id("workspaces"),
    projectId: v.optional(v.id("projects")),
    slug: v.optional(v.string()),
    machineToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });
    requirePermission(auth, "projects:read");

    if (args.projectId) {
      return assertOwnership(ctx, args.projectId, auth, "Project");
    }

    if (args.slug) {
      return ctx.db
        .query("projects")
        .withIndex("by_workspace_slug", (q) =>
          q.eq("workspaceId", auth.workspaceId).eq("slug", args.slug!),
        )
        .first();
    }

    throw new Error("Either projectId or slug required");
  },
});

export const create = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    name: v.string(),
    slug: v.string(),
    description: v.string(),
    color: v.string(),
    types: v.array(v.string()),
    phases: v.array(v.string()),
    assignedTeamIds: v.array(v.string()),
    assignedMemberIds: v.array(v.string()),
    machineToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });
    requirePermission(auth, "projects:write");

    // Check slug uniqueness
    const existing = await ctx.db
      .query("projects")
      .withIndex("by_workspace_slug", (q) =>
        q.eq("workspaceId", auth.workspaceId).eq("slug", args.slug),
      )
      .first();
    if (existing) throw new Error("Project slug already taken");

    const now = new Date().toISOString();
    const currentPhase = args.phases[0] ?? "intake";

    // Generate gates for each phase
    const gates = args.phases.map((phase, i) => ({
      id: `gate_${Date.now()}_${i}`,
      phase,
      status: "pending" as const,
      approverId: null,
      approvedAt: null,
      feedback: null,
    }));

    return ctx.db.insert("projects", {
      workspaceId: auth.workspaceId,
      name: args.name,
      slug: args.slug,
      description: args.description,
      color: args.color,
      types: args.types,
      status: "backlog",
      phases: args.phases,
      currentPhase,
      gates,
      assignedTeamIds: args.assignedTeamIds,
      assignedMemberIds: args.assignedMemberIds,
      gitRepo: null,
      definitionOfDone: [],
      createdById: auth.memberId as string,
      modifiedAt: now,
      conversationId: null,
      createdAt: now,
    });
  },
});

const UPDATE_FIELDS = [
  "name", "description", "color", "types", "status", "currentPhase",
  "assignedTeamIds", "assignedMemberIds", "definitionOfDone", "gitRepo", "conversationId",
] as const;

export const update = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    types: v.optional(v.array(v.string())),
    status: v.optional(v.string()),
    currentPhase: v.optional(v.string()),
    assignedTeamIds: v.optional(v.array(v.string())),
    assignedMemberIds: v.optional(v.array(v.string())),
    definitionOfDone: v.optional(
      v.array(
        v.object({
          id: v.string(),
          description: v.string(),
          required: v.boolean(),
        }),
      ),
    ),
    gitRepo: v.optional(
      v.union(
        v.object({
          url: v.string(),
          defaultBranch: v.string(),
          provider: v.union(v.string(), v.null()),
        }),
        v.null(),
      ),
    ),
    conversationId: v.optional(v.union(v.id("conversations"), v.null())),
    machineToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });
    requirePermission(auth, "projects:write");
    await assertOwnership(ctx, args.projectId, auth, "Project");

    await ctx.db.patch(
      args.projectId,
      buildPatch(args, UPDATE_FIELDS, { modifiedAt: new Date().toISOString() }),
    );
    return args.projectId;
  },
});

export const updateGate = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
    gateId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("awaiting_approval"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("bypassed"),
    ),
    feedback: v.optional(v.string()),
    machineToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });
    requirePermission(auth, "projects:write");

    const project = await assertOwnership(ctx, args.projectId, auth, "Project");

    const gateIdx = project.gates.findIndex((g: any) => g.id === args.gateId);
    if (gateIdx === -1) throw new Error("Gate not found");

    const updatedGates = [...project.gates];
    updatedGates[gateIdx] = {
      ...updatedGates[gateIdx],
      status: args.status,
      approverId:
        args.status === "approved" || args.status === "rejected"
          ? (auth.memberId as string)
          : updatedGates[gateIdx].approverId,
      approvedAt: args.status === "approved" ? new Date().toISOString() : null,
      feedback: args.feedback ?? updatedGates[gateIdx].feedback,
    };

    await ctx.db.patch(args.projectId, {
      gates: updatedGates,
      modifiedAt: new Date().toISOString(),
    });

    // If gate was set to awaiting_approval, notify humans
    if (args.status === "awaiting_approval") {
      await notifyHumans(ctx, auth.workspaceId, {
        type: "gate_approval_request",
        title: "Gate approval needed",
        body: `${project.name} ${updatedGates[gateIdx].phase} gate is awaiting approval.`,
        entityType: "project",
        entityId: args.projectId as string,
        actorId: auth.memberId as string,
      });
    }

    return args.projectId;
  },
});
