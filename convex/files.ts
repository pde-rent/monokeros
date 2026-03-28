import { query, mutation, action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { resolveAuth, requirePermission } from "./lib/auth";
import { assertOwnership, getDriveFiles, insertFile } from "./lib/crud";

const SYSTEM_FILES = new Set(["SOUL.md", "AGENTS.md", "TOOLS.md", "USER.md"]);
const PROTECTED_DIRS = new Set(["KNOWLEDGE"]);

export const drives = query({
  args: { workspaceId: v.id("workspaces"), machineToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });
    requirePermission(auth, "files:read");

    const members = await ctx.db
      .query("members")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", auth.workspaceId))
      .collect();

    const teams = await ctx.db
      .query("teams")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", auth.workspaceId))
      .collect();

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", auth.workspaceId))
      .collect();

    return {
      memberDrives: members
        .filter((m) => m.type === "agent")
        .map((m) => ({ memberId: m._id, memberName: m.name })),
      teamDrives: teams.map((t) => ({ teamId: t._id, name: t.name })),
      projectDrives: projects.map((p) => ({ projectId: p._id, name: p.name })),
      workspaceDrive: { id: "workspace", name: "Workspace" },
    };
  },
});

export const memberDrive = query({
  args: { workspaceId: v.id("workspaces"), memberId: v.string(), machineToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });
    return getDriveFiles(ctx, auth, "member", args.memberId);
  },
});

export const teamDrive = query({
  args: { workspaceId: v.id("workspaces"), teamId: v.string(), machineToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });
    return getDriveFiles(ctx, auth, "team", args.teamId);
  },
});

export const projectDrive = query({
  args: { workspaceId: v.id("workspaces"), projectId: v.string(), machineToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });
    return getDriveFiles(ctx, auth, "project", args.projectId);
  },
});

export const workspaceDrive = query({
  args: { workspaceId: v.id("workspaces"), machineToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });
    return getDriveFiles(ctx, auth, "workspace", "workspace");
  },
});

export const getContent = query({
  args: {
    workspaceId: v.id("workspaces"),
    driveType: v.string(),
    driveOwnerId: v.string(),
    path: v.string(),
    machineToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });
    requirePermission(auth, "files:read");

    const file = await ctx.db
      .query("files")
      .withIndex("by_drive_path", (q) =>
        q
          .eq("driveType", args.driveType as any)
          .eq("driveOwnerId", args.driveOwnerId)
          .eq("path", args.path),
      )
      .first();

    if (!file) throw new Error("File not found");

    if (file.storageId) {
      const url = await ctx.storage.getUrl(file.storageId);
      return { ...file, storageUrl: url };
    }

    return file;
  },
});

export const createFile = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    driveType: v.string(),
    driveOwnerId: v.string(),
    name: v.string(),
    path: v.string(),
    content: v.optional(v.string()),
    mimeType: v.optional(v.string()),
    machineToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });
    requirePermission(auth, "files:write");

    return insertFile(ctx, auth, {
      driveType: args.driveType,
      driveOwnerId: args.driveOwnerId,
      name: args.name,
      path: args.path,
      content: args.content,
      mimeType: args.mimeType,
    });
  },
});

export const createFolder = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    driveType: v.string(),
    driveOwnerId: v.string(),
    name: v.string(),
    path: v.string(),
    machineToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });
    requirePermission(auth, "files:write");

    return ctx.db.insert("files", {
      workspaceId: auth.workspaceId,
      driveType: args.driveType as any,
      driveOwnerId: args.driveOwnerId,
      name: args.name,
      path: args.path,
      type: "directory",
      size: 0,
      mimeType: "inode/directory",
      modifiedAt: new Date().toISOString(),
    });
  },
});

export const renameItem = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    fileId: v.id("files"),
    newName: v.string(),
    machineToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });
    requirePermission(auth, "files:write");

    const file = await assertOwnership(ctx, args.fileId, auth, "File");

    if (SYSTEM_FILES.has(file.name)) {
      throw new Error("Cannot rename system files");
    }

    // Build new path
    const pathParts = file.path.split("/");
    pathParts[pathParts.length - 1] = args.newName;
    const newPath = pathParts.join("/");

    await ctx.db.patch(args.fileId, {
      name: args.newName,
      path: newPath,
      modifiedAt: new Date().toISOString(),
    });
  },
});

export const updateContent = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    fileId: v.id("files"),
    content: v.string(),
    machineToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });
    requirePermission(auth, "files:write");

    const file = await assertOwnership(ctx, args.fileId, auth, "File");

    // System files require admin
    if (SYSTEM_FILES.has(file.name) && auth.role !== "admin") {
      throw new Error("Only admins can edit system files");
    }

    await ctx.db.patch(args.fileId, {
      textContent: args.content,
      size: args.content.length,
      modifiedAt: new Date().toISOString(),
    });
  },
});

export const deleteItem = mutation({
  args: { workspaceId: v.id("workspaces"), fileId: v.id("files"), machineToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });
    requirePermission(auth, "files:write");

    const file = await assertOwnership(ctx, args.fileId, auth, "File");

    if (SYSTEM_FILES.has(file.name)) {
      throw new Error("Cannot delete system files");
    }

    if (file.type === "directory" && PROTECTED_DIRS.has(file.name)) {
      throw new Error("Cannot delete protected directories");
    }

    // If directory, delete children
    if (file.type === "directory") {
      const children = await ctx.db
        .query("files")
        .withIndex("by_workspace_drive", (q) =>
          q
            .eq("workspaceId", auth.workspaceId)
            .eq("driveType", file.driveType)
            .eq("driveOwnerId", file.driveOwnerId),
        )
        .collect();
      for (const child of children) {
        if (child.path.startsWith(file.path + "/")) {
          if (child.storageId) {
            await ctx.storage.delete(child.storageId);
          }
          await ctx.db.delete(child._id);
        }
      }
    }

    if (file.storageId) {
      await ctx.storage.delete(file.storageId);
    }
    await ctx.db.delete(args.fileId);
  },
});

export const generateUploadUrl = action({
  args: { machineToken: v.optional(v.string()) },
  handler: async (ctx) => {
    return ctx.storage.generateUploadUrl();
  },
});

/**
 * Internal: upsert a file by (driveType, driveOwnerId, path).
 * Creates if not found, updates content if found.
 * Used by the container service provisioning to seed member drives.
 */
export const upsertFile = internalMutation({
  args: {
    workspaceId: v.id("workspaces"),
    driveType: v.string(),
    driveOwnerId: v.string(),
    name: v.string(),
    path: v.string(),
    type: v.union(v.literal("file"), v.literal("directory")),
    content: v.optional(v.string()),
    mimeType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("files")
      .withIndex("by_drive_path", (q) =>
        q
          .eq("driveType", args.driveType as any)
          .eq("driveOwnerId", args.driveOwnerId)
          .eq("path", args.path),
      )
      .first();

    const now = new Date().toISOString();

    if (existing) {
      // Update existing file
      const patch: Record<string, unknown> = { modifiedAt: now };
      if (args.type === "file" && args.content !== undefined) {
        patch.textContent = args.content;
        patch.size = args.content.length;
      }
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }

    // Create new entry
    const content = args.content ?? "";
    const isKnowledge = args.path.startsWith("KNOWLEDGE/");
    return ctx.db.insert("files", {
      workspaceId: args.workspaceId,
      driveType: args.driveType as any,
      driveOwnerId: args.driveOwnerId,
      name: args.name,
      path: args.path,
      type: args.type,
      size: args.type === "directory" ? 0 : content.length,
      mimeType: args.mimeType ?? (args.type === "directory" ? "inode/directory" : "text/plain"),
      modifiedAt: now,
      ...(args.type === "file" && { textContent: content }),
      ...(isKnowledge && { isKnowledge: true }),
    });
  },
});
