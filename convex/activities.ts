import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { resolveAuth } from "./lib/auth";

/** Workspace activity feed with actor + entity enrichment. */
export const feed = query({
  args: {
    workspaceId: v.id("workspaces"),
    limit: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId });

    const activities = await ctx.db
      .query("activities")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", auth.workspaceId))
      .order("desc")
      .take(args.limit ?? 50);

    // Enrich with actor names
    const enriched = [];
    for (const activity of activities) {
      let actorName = "Unknown";
      // Try to find actor as member
      const members = await ctx.db
        .query("members")
        .withIndex("by_workspace", (q) => q.eq("workspaceId", auth.workspaceId))
        .collect();
      const actor = members.find(
        (m) => (m._id as string) === activity.actorId || m.legacyId === activity.actorId,
      );
      if (actor) actorName = actor.name;

      enriched.push({
        ...activity,
        actorName,
      });
    }

    return enriched;
  },
});

/** Internal: log an activity entry (called by other mutations). */
export const log = internalMutation({
  args: {
    workspaceId: v.id("workspaces"),
    actorId: v.string(),
    action: v.string(),
    entityType: v.string(),
    entityId: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("activities", {
      workspaceId: args.workspaceId,
      actorId: args.actorId,
      action: args.action,
      entityType: args.entityType,
      entityId: args.entityId,
      metadata: args.metadata,
    });
  },
});
