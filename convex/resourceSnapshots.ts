import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

/** Internal: batch insert resource snapshots for running agents. */
export const batchInsert = internalMutation({
  args: {
    snapshots: v.array(
      v.object({
        workspaceId: v.id("workspaces"),
        memberId: v.id("members"),
        cpuPercent: v.float64(),
        memoryMb: v.float64(),
        windowCount: v.float64(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    if (args.snapshots.length > 200) {
      console.warn(
        `[resourceSnapshots] Batch truncated from ${args.snapshots.length} to 200`,
      );
    }
    const batch = args.snapshots.slice(0, 200);
    for (const snap of batch) {
      await ctx.db.insert("resourceSnapshots", snap);
    }
  },
});

/** Get recent resource snapshots for a member. */
export const getByMember = query({
  args: {
    memberId: v.id("members"),
    limit: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("resourceSnapshots")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .order("desc")
      .take(args.limit ?? 60);
  },
});
