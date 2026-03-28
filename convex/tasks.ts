import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { resolveAuth, requirePermission } from "./lib/auth";
import { assertOwnership, buildPatch } from "./lib/crud";
import { notifyHumans } from "./lib/notify";
import { slugify } from "./lib/utils";
import { taskStatus } from "./schema";

export const list = query({
  args: {
    workspaceId: v.id("workspaces"),
    projectId: v.optional(v.id("projects")),
    status: v.optional(v.string()),
    search: v.optional(v.string()),
    machineToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });
    requirePermission(auth, "tasks:read");

    if (args.search) {
      return ctx.db
        .query("tasks")
        .withSearchIndex("search_title", (q) =>
          q.search("title", args.search!).eq("workspaceId", auth.workspaceId),
        )
        .take(100);
    }

    if (args.projectId && args.status) {
      return ctx.db
        .query("tasks")
        .withIndex("by_workspace_project_status", (q) =>
          q
            .eq("workspaceId", auth.workspaceId)
            .eq("projectId", args.projectId!)
            .eq("status", args.status as any),
        )
        .collect();
    }

    if (args.projectId) {
      return ctx.db
        .query("tasks")
        .withIndex("by_workspace_project", (q) =>
          q.eq("workspaceId", auth.workspaceId).eq("projectId", args.projectId!),
        )
        .collect();
    }

    if (args.status) {
      return ctx.db
        .query("tasks")
        .withIndex("by_workspace_status", (q) =>
          q.eq("workspaceId", auth.workspaceId).eq("status", args.status as any),
        )
        .collect();
    }

    return ctx.db
      .query("tasks")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", auth.workspaceId))
      .collect();
  },
});

export const get = query({
  args: { workspaceId: v.id("workspaces"), taskId: v.id("tasks"), machineToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });
    requirePermission(auth, "tasks:read");
    return assertOwnership(ctx, args.taskId, auth, "Task");
  },
});

export const create = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    title: v.string(),
    description: v.string(),
    type: v.optional(v.string()),
    projectId: v.optional(v.id("projects")),
    parentId: v.optional(v.id("tasks")),
    priority: v.optional(v.string()),
    assigneeIds: v.optional(v.array(v.string())),
    teamId: v.string(),
    phase: v.optional(v.string()),
    dependencies: v.optional(v.array(v.string())),
    offloadable: v.optional(v.boolean()),
    requiresHumanAcceptance: v.optional(v.boolean()),
    machineToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });
    requirePermission(auth, "tasks:write");

    const now = new Date().toISOString();

    // Generate slug from title, add suffix if collision
    let slug = slugify(args.title);
    const existing = await ctx.db
      .query("tasks")
      .withIndex("by_workspace_slug", (q) =>
        q.eq("workspaceId", auth.workspaceId).eq("slug", slug),
      )
      .first();
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const taskId = await ctx.db.insert("tasks", {
      workspaceId: auth.workspaceId,
      title: args.title,
      slug,
      description: args.description,
      type: args.type ?? null,
      projectId: args.projectId ?? null,
      parentId: args.parentId ?? null,
      status: "backlog",
      priority: (args.priority as any) ?? "medium",
      assigneeIds: args.assigneeIds ?? [],
      teamId: args.teamId,
      phase: args.phase ?? "",
      dependencies: args.dependencies ?? [],
      offloadable: args.offloadable ?? false,
      crossValidation: null,
      requiresHumanAcceptance: args.requiresHumanAcceptance ?? false,
      humanAcceptance: null,
      acceptanceCriteria: [],
      inputs: [],
      outputs: [],
      conversationId: null,
      commentCount: 0,
      updatedAt: now,
    });

    // Notify assignees
    if (args.assigneeIds?.length) {
      for (const assigneeId of args.assigneeIds) {
        await ctx.runMutation(internal.notifications.create, {
          workspaceId: auth.workspaceId,
          recipientId: assigneeId,
          type: "task_assigned",
          title: "Task assigned",
          body: `You were assigned to "${args.title}".`,
          entityType: "task",
          entityId: taskId as string,
          actorId: auth.memberId as string,
        });
      }
    }

    return taskId;
  },
});

const UPDATE_FIELDS = [
  "title", "slug", "description", "type", "priority", "phase", "assigneeIds",
  "parentId", "dependencies", "offloadable", "requiresHumanAcceptance", "crossValidation",
  "humanAcceptance", "acceptanceCriteria", "inputs", "outputs", "conversationId",
] as const;

export const update = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    taskId: v.id("tasks"),
    title: v.optional(v.string()),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    type: v.optional(v.union(v.string(), v.null())),
    parentId: v.optional(v.union(v.id("tasks"), v.null())),
    priority: v.optional(v.string()),
    phase: v.optional(v.string()),
    assigneeIds: v.optional(v.array(v.string())),
    dependencies: v.optional(v.array(v.string())),
    offloadable: v.optional(v.boolean()),
    requiresHumanAcceptance: v.optional(v.boolean()),
    crossValidation: v.optional(v.any()),
    humanAcceptance: v.optional(v.any()),
    acceptanceCriteria: v.optional(v.any()),
    inputs: v.optional(v.any()),
    outputs: v.optional(v.any()),
    conversationId: v.optional(v.union(v.id("conversations"), v.null())),
    machineToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });
    requirePermission(auth, "tasks:write");
    await assertOwnership(ctx, args.taskId, auth, "Task");

    await ctx.db.patch(
      args.taskId,
      buildPatch(args, UPDATE_FIELDS, { updatedAt: new Date().toISOString() }),
    );
    return args.taskId;
  },
});

export const move = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    taskId: v.id("tasks"),
    status: taskStatus,
    machineToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });
    requirePermission(auth, "tasks:write");

    const task = await assertOwnership(ctx, args.taskId, auth, "Task");

    // If moving to done and requires human acceptance, intercept
    if (
      args.status === "done" &&
      task.requiresHumanAcceptance &&
      task.humanAcceptance?.status !== "accepted"
    ) {
      await ctx.db.patch(args.taskId, {
        status: "awaiting_acceptance",
        humanAcceptance: {
          status: "pending",
          reviewerId: null,
          feedback: null,
          reviewedAt: null,
        },
        updatedAt: new Date().toISOString(),
      });

      await notifyHumans(ctx, auth.workspaceId, {
        type: "human_acceptance_required",
        title: "Acceptance required",
        body: `${task.title} is awaiting your acceptance.`,
        entityType: "task",
        entityId: args.taskId as string,
        actorId: auth.memberId as string,
      });

      return args.taskId;
    }

    await ctx.db.patch(args.taskId, {
      status: args.status,
      updatedAt: new Date().toISOString(),
    });

    // Notify on completion
    if (args.status === "done") {
      await notifyHumans(ctx, auth.workspaceId, {
        type: "task_completed",
        title: "Task completed",
        body: `${task.title} has been completed.`,
        entityType: "task",
        entityId: args.taskId as string,
        actorId: auth.memberId as string,
      });
    }

    return args.taskId;
  },
});

export const submitAcceptance = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    taskId: v.id("tasks"),
    action: v.union(v.literal("accept"), v.literal("reject")),
    feedback: v.optional(v.string()),
    machineToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });

    const task = await assertOwnership(ctx, args.taskId, auth, "Task");

    if (task.status !== "awaiting_acceptance") {
      throw new Error("Task is not awaiting acceptance");
    }

    const now = new Date().toISOString();
    const accepted = args.action === "accept";

    await ctx.db.patch(args.taskId, {
      status: accepted ? "done" : "in_review",
      humanAcceptance: {
        status: accepted ? "accepted" : "rejected",
        reviewerId: auth.memberId as string,
        feedback: args.feedback ?? null,
        reviewedAt: now,
      },
      updatedAt: now,
    });

    // Notify assignees
    for (const assigneeId of task.assigneeIds) {
      await ctx.runMutation(internal.notifications.create, {
        workspaceId: auth.workspaceId,
        recipientId: assigneeId,
        type: "human_acceptance_resolved",
        title: accepted ? "Task accepted" : "Task rejected",
        body: `${task.title} was ${accepted ? "accepted" : "rejected"}${args.feedback ? `: ${args.feedback}` : ""}.`,
        entityType: "task",
        entityId: args.taskId as string,
        actorId: auth.memberId as string,
      });
    }

    return args.taskId;
  },
});

export const assign = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    taskId: v.id("tasks"),
    assigneeIds: v.array(v.string()),
    machineToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });
    requirePermission(auth, "tasks:write");

    const task = await assertOwnership(ctx, args.taskId, auth, "Task");

    // Find newly assigned members
    const newAssignees = args.assigneeIds.filter((id) => !task.assigneeIds.includes(id));

    await ctx.db.patch(args.taskId, {
      assigneeIds: args.assigneeIds,
      updatedAt: new Date().toISOString(),
    });

    // Notify new assignees
    for (const assigneeId of newAssignees) {
      await ctx.runMutation(internal.notifications.create, {
        workspaceId: auth.workspaceId,
        recipientId: assigneeId,
        type: "task_assigned",
        title: "Task assigned",
        body: `You were assigned to "${task.title}".`,
        entityType: "task",
        entityId: args.taskId as string,
        actorId: auth.memberId as string,
      });
    }

    return args.taskId;
  },
});

// ── Atomic array operations (avoid read-modify-write races) ──────────────────

export const setParent = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    taskId: v.id("tasks"),
    parentId: v.union(v.id("tasks"), v.null()),
    machineToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });
    requirePermission(auth, "tasks:write");
    await assertOwnership(ctx, args.taskId, auth, "Task");

    if (args.parentId) {
      await assertOwnership(ctx, args.parentId, auth, "Parent task");
      if (args.parentId === args.taskId) {
        throw new Error("A task cannot be its own parent");
      }
    }

    await ctx.db.patch(args.taskId, {
      parentId: args.parentId,
      updatedAt: new Date().toISOString(),
    });
    return args.taskId;
  },
});

export const addDependency = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    taskId: v.id("tasks"),
    dependencyId: v.string(),
    machineToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });
    requirePermission(auth, "tasks:write");
    const task = await assertOwnership(ctx, args.taskId, auth, "Task");

    if (task.dependencies.includes(args.dependencyId)) {
      return args.taskId; // idempotent
    }

    await ctx.db.patch(args.taskId, {
      dependencies: [...task.dependencies, args.dependencyId],
      updatedAt: new Date().toISOString(),
    });
    return args.taskId;
  },
});

export const removeDependency = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    taskId: v.id("tasks"),
    dependencyId: v.string(),
    machineToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });
    requirePermission(auth, "tasks:write");
    const task = await assertOwnership(ctx, args.taskId, auth, "Task");

    await ctx.db.patch(args.taskId, {
      dependencies: task.dependencies.filter((id: string) => id !== args.dependencyId),
      updatedAt: new Date().toISOString(),
    });
    return args.taskId;
  },
});

export const addArtifact = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    taskId: v.id("tasks"),
    field: v.union(v.literal("inputs"), v.literal("outputs")),
    artifact: v.object({
      type: v.union(v.literal("file"), v.literal("url"), v.literal("git_ref")),
      label: v.string(),
      path: v.optional(v.union(v.string(), v.null())),
      url: v.optional(v.union(v.string(), v.null())),
    }),
    machineToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });
    requirePermission(auth, "tasks:write");
    const task = await assertOwnership(ctx, args.taskId, auth, "Task");

    const newArtifact = {
      id: `art_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      type: args.artifact.type,
      label: args.artifact.label,
      path: args.artifact.path ?? null,
      url: args.artifact.url ?? null,
      gitRef: null,
    };

    await ctx.db.patch(args.taskId, {
      [args.field]: [...task[args.field], newArtifact],
      updatedAt: new Date().toISOString(),
    });
    return args.taskId;
  },
});

export const removeArtifact = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    taskId: v.id("tasks"),
    field: v.union(v.literal("inputs"), v.literal("outputs")),
    artifactId: v.string(),
    machineToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });
    requirePermission(auth, "tasks:write");
    const task = await assertOwnership(ctx, args.taskId, auth, "Task");

    await ctx.db.patch(args.taskId, {
      [args.field]: task[args.field].filter((a: any) => a.id !== args.artifactId),
      updatedAt: new Date().toISOString(),
    });
    return args.taskId;
  },
});
