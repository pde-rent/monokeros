import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Id, TableNames } from "../_generated/dataModel";
import type { AuthContext } from "./auth";
import { requirePermission } from "./auth";

/**
 * Assert that an entity exists and belongs to the authenticated workspace.
 * Returns the entity or throws "Not found".
 */
export async function assertOwnership<T extends TableNames>(
  ctx: QueryCtx | MutationCtx,
  id: Id<T>,
  auth: AuthContext,
  label: string,
): Promise<any> {
  const entity = await ctx.db.get(id);
  if (!entity || (entity as any).workspaceId !== auth.workspaceId) {
    throw new Error(`${label} not found`);
  }
  return entity;
}

/**
 * GET-by-ID with permission check + workspace ownership assertion.
 * Combines resolveAuth → requirePermission → assertOwnership.
 */
export async function getWithAuth<T extends TableNames>(
  ctx: QueryCtx | MutationCtx,
  id: Id<T>,
  auth: AuthContext,
  permission: string,
  label: string,
): Promise<any> {
  requirePermission(auth, permission);
  return assertOwnership(ctx, id, auth, label);
}

/**
 * Build a patch object from optional args fields.
 * Only includes fields that are not undefined.
 */
export function buildPatch<T extends Record<string, any>>(
  args: T,
  fields: readonly (keyof T)[],
  extras?: Record<string, any>,
): Record<string, any> {
  const updates: Record<string, any> = { ...extras };
  for (const field of fields) {
    if (args[field] !== undefined) {
      updates[field as string] = args[field];
    }
  }
  return updates;
}

/**
 * Insert a new file entry into the files table.
 * Shared by files.createFile, wiki.save, and any future file-creation paths.
 */
export async function insertFile(
  ctx: MutationCtx,
  auth: AuthContext,
  opts: {
    driveType: string;
    driveOwnerId: string;
    name: string;
    path: string;
    content?: string;
    mimeType?: string;
  },
) {
  const content = opts.content ?? "";
  const isKnowledge = opts.path.startsWith("KNOWLEDGE/");
  return ctx.db.insert("files", {
    workspaceId: auth.workspaceId,
    driveType: opts.driveType as any,
    driveOwnerId: opts.driveOwnerId,
    name: opts.name,
    path: opts.path,
    type: "file" as const,
    size: content.length,
    mimeType: opts.mimeType ?? "text/plain",
    modifiedAt: new Date().toISOString(),
    textContent: content,
    ...(isKnowledge && { isKnowledge: true }),
  });
}

/**
 * Query files for a specific drive (member, team, project, workspace).
 */
export async function getDriveFiles(
  ctx: QueryCtx,
  auth: AuthContext,
  driveType: "member" | "team" | "project" | "workspace",
  ownerId: string,
) {
  requirePermission(auth, "files:read");
  return ctx.db
    .query("files")
    .withIndex("by_workspace_drive", (q) =>
      q
        .eq("workspaceId", auth.workspaceId)
        .eq("driveType", driveType)
        .eq("driveOwnerId", ownerId),
    )
    .collect();
}
