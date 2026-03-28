import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { resolveAuth, requirePermission } from "./lib/auth";
import { insertFile } from "./lib/crud";

const WIKI_PREFIX = "WIKI/";

export const nav = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId });
    requirePermission(auth, "files:read");

    const files = await ctx.db
      .query("files")
      .withIndex("by_workspace_drive", (q) =>
        q
          .eq("workspaceId", auth.workspaceId)
          .eq("driveType", "workspace")
          .eq("driveOwnerId", "workspace"),
      )
      .collect();

    // Filter to WIKI/ prefix and build navigation tree
    return files
      .filter((f) => f.path.startsWith(WIKI_PREFIX))
      .map((f) => ({
        id: f._id,
        name: f.name,
        path: f.path.replace(WIKI_PREFIX, ""),
        type: f.type,
      }));
  },
});

export const page = query({
  args: { workspaceId: v.id("workspaces"), path: v.string() },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId });
    requirePermission(auth, "files:read");

    const fullPath = WIKI_PREFIX + args.path;
    const file = await ctx.db
      .query("files")
      .withIndex("by_drive_path", (q) =>
        q.eq("driveType", "workspace").eq("driveOwnerId", "workspace").eq("path", fullPath),
      )
      .first();

    if (!file) return null;
    return {
      id: file._id,
      name: file.name,
      path: args.path,
      content: file.textContent ?? "",
      modifiedAt: file.modifiedAt,
    };
  },
});

export const raw = query({
  args: { workspaceId: v.id("workspaces"), path: v.string() },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId });
    requirePermission(auth, "files:read");

    const fullPath = WIKI_PREFIX + args.path;
    const file = await ctx.db
      .query("files")
      .withIndex("by_drive_path", (q) =>
        q.eq("driveType", "workspace").eq("driveOwnerId", "workspace").eq("path", fullPath),
      )
      .first();

    return file?.textContent ?? null;
  },
});

export const save = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    path: v.string(),
    content: v.string(),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId });
    requirePermission(auth, "files:write");

    const fullPath = WIKI_PREFIX + args.path;
    const existing = await ctx.db
      .query("files")
      .withIndex("by_drive_path", (q) =>
        q.eq("driveType", "workspace").eq("driveOwnerId", "workspace").eq("path", fullPath),
      )
      .first();

    const now = new Date().toISOString();

    if (existing) {
      await ctx.db.patch(existing._id, {
        textContent: args.content,
        size: args.content.length,
        modifiedAt: now,
        ...(args.title && { name: args.title }),
      });
      return existing._id;
    }

    // Create new page
    const name = args.title ?? args.path.split("/").pop() ?? "Untitled";
    return insertFile(ctx, auth, {
      driveType: "workspace",
      driveOwnerId: "workspace",
      name,
      path: fullPath,
      content: args.content,
      mimeType: "text/markdown",
    });
  },
});
