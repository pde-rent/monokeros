import { query } from "./_generated/server";
import { v } from "convex/values";
import { resolveAuth, requirePermission } from "./lib/auth";

export const search = query({
  args: {
    workspaceId: v.id("workspaces"),
    query: v.string(),
    limit: v.optional(v.float64()),
    machineToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });
    requirePermission(auth, "files:read");

    if (!args.query.trim()) return [];

    const results = await ctx.db
      .query("files")
      .withSearchIndex("search_knowledge", (q) =>
        q
          .search("textContent", args.query)
          .eq("workspaceId", auth.workspaceId)
          .eq("isKnowledge", true),
      )
      .take(args.limit ?? 20);

    return results.map((file) => ({
      fileId: file._id,
      driveType: file.driveType,
      driveOwnerId: file.driveOwnerId,
      path: file.path,
      fileName: file.name,
      snippet: file.textContent?.substring(0, 200) ?? "",
    }));
  },
});
