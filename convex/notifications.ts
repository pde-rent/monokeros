import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { resolveAuth } from "./lib/auth";

export const list = query({
  args: { workspaceId: v.id("workspaces"), machineToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });

    return ctx.db
      .query("notifications")
      .withIndex("by_recipient_workspace", (q) =>
        q.eq("recipientId", auth.memberId as string).eq("workspaceId", auth.workspaceId),
      )
      .order("desc")
      .take(50);
  },
});

export const counts = query({
  args: { workspaceId: v.id("workspaces"), machineToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_recipient_workspace_unread", (q) =>
        q
          .eq("recipientId", auth.memberId as string)
          .eq("workspaceId", auth.workspaceId)
          .eq("read", false),
      )
      .collect();

    const buckets = { chat: 0, files: 0, org: 0, projects: 0 };
    for (const n of unread) {
      if (n.type === "chat_message") buckets.chat++;
      else if (n.type === "file_modified") buckets.files++;
      else if (n.type === "member_added" || n.type === "member_removed") buckets.org++;
      else buckets.projects++;
    }

    return { total: unread.length, ...buckets };
  },
});

export const markRead = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    notificationId: v.id("notifications"),
    machineToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });

    const notif = await ctx.db.get(args.notificationId);
    if (
      !notif ||
      notif.workspaceId !== auth.workspaceId ||
      notif.recipientId !== (auth.memberId as string)
    ) {
      throw new Error("Notification not found");
    }

    await ctx.db.patch(args.notificationId, { read: true });
  },
});

export const markAllRead = mutation({
  args: { workspaceId: v.id("workspaces"), machineToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_recipient_workspace_unread", (q) =>
        q
          .eq("recipientId", auth.memberId as string)
          .eq("workspaceId", auth.workspaceId)
          .eq("read", false),
      )
      .collect();

    for (const n of unread) {
      await ctx.db.patch(n._id, { read: true });
    }

    return { marked: unread.length };
  },
});

/** Internal: create a notification (called by other mutations). */
export const create = internalMutation({
  args: {
    workspaceId: v.id("workspaces"),
    recipientId: v.string(),
    type: v.union(
      v.literal("task_completed"),
      v.literal("chat_message"),
      v.literal("file_modified"),
      v.literal("member_added"),
      v.literal("member_removed"),
      v.literal("task_assigned"),
      v.literal("human_acceptance_required"),
      v.literal("human_acceptance_resolved"),
      v.literal("gate_approval_request"),
    ),
    title: v.string(),
    body: v.string(),
    entityType: v.union(v.string(), v.null()),
    entityId: v.union(v.string(), v.null()),
    actorId: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("notifications", {
      workspaceId: args.workspaceId,
      recipientId: args.recipientId,
      type: args.type,
      title: args.title,
      body: args.body,
      read: false,
      entityType: args.entityType,
      entityId: args.entityId,
      actorId: args.actorId,
    });
  },
});

/** Internal: create notifications for multiple recipients. */
export const createForMany = internalMutation({
  args: {
    workspaceId: v.id("workspaces"),
    recipientIds: v.array(v.string()),
    type: v.union(
      v.literal("task_completed"),
      v.literal("chat_message"),
      v.literal("file_modified"),
      v.literal("member_added"),
      v.literal("member_removed"),
      v.literal("task_assigned"),
      v.literal("human_acceptance_required"),
      v.literal("human_acceptance_resolved"),
      v.literal("gate_approval_request"),
    ),
    title: v.string(),
    body: v.string(),
    entityType: v.union(v.string(), v.null()),
    entityId: v.union(v.string(), v.null()),
    actorId: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const ids = [];
    for (const recipientId of args.recipientIds) {
      const id = await ctx.db.insert("notifications", {
        workspaceId: args.workspaceId,
        recipientId,
        type: args.type,
        title: args.title,
        body: args.body,
        read: false,
        entityType: args.entityType,
        entityId: args.entityId,
        actorId: args.actorId,
      });
      ids.push(id);
    }
    return ids;
  },
});
