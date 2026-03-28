import { QueryCtx, MutationCtx, ActionCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Resolve the authenticated user's email from the Convex Auth identity.
 * Self-hosted Convex doesn't include email in getUserIdentity() JWT claims,
 * so we look it up from the `users` table via the identity's subject.
 */
export async function resolveEmail(
  ctx: QueryCtx | MutationCtx,
): Promise<{ email: string } | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  // Try email from identity first (works with cloud Convex / external providers)
  if (identity.email) return { email: identity.email };

  // Self-hosted fallback: look up email from Convex Auth's users table
  // Subject format: "userId|sessionId"
  const userId = identity.subject?.split("|")[0];
  if (!userId) return null;

  try {
    const user = await ctx.db.get(userId as Id<"users">);
    if (user && (user as any).email) {
      return { email: (user as any).email };
    }
  } catch {
    // users table may not exist or ID may be invalid
  }
  return null;
}

export interface AuthContext {
  workspaceId: Id<"workspaces">;
  memberId: Id<"members">;
  role: "admin" | "validator" | "viewer";
  permissions: string[];
  authMethod: "jwt" | "api_key";
}

/**
 * Resolve authentication from either JWT identity or API key.
 * Every Convex function calls this first.
 *
 * Accepts either workspaceId (preferred — no extra DB lookup) or workspaceSlug.
 */
export async function resolveAuth(
  ctx: QueryCtx | MutationCtx,
  args: { workspaceId?: Id<"workspaces">; workspaceSlug?: string; machineToken?: string },
): Promise<AuthContext> {
  // Try API key path first (machine-to-machine)
  if (args.machineToken) {
    return resolveApiKey(ctx, args.machineToken);
  }

  // JWT path — user identity from Convex Auth
  const resolved = await resolveEmail(ctx);
  if (!resolved) {
    throw new Error("Not authenticated");
  }

  const email = resolved.email;

  // Find the member by email
  const member = await ctx.db
    .query("members")
    .withIndex("by_email", (q) => q.eq("email", email))
    .first();
  if (!member) {
    throw new Error("Member not found for email: " + email);
  }

  // Resolve workspace — prefer ID (skip lookup), fall back to slug
  let workspaceId: Id<"workspaces">;
  if (args.workspaceId) {
    workspaceId = args.workspaceId;
  } else if (args.workspaceSlug) {
    const workspace = await ctx.db
      .query("workspaces")
      .withIndex("by_slug", (q) => q.eq("slug", args.workspaceSlug!))
      .first();
    if (!workspace) {
      throw new Error("Workspace not found: " + args.workspaceSlug);
    }
    workspaceId = workspace._id;
  } else {
    workspaceId = member.workspaceId;
  }

  // Find workspace membership
  const wsMember = await ctx.db
    .query("workspaceMembers")
    .withIndex("by_workspace_member", (q) =>
      q.eq("workspaceId", workspaceId).eq("memberId", member._id),
    )
    .first();
  if (!wsMember) {
    throw new Error("Not a member of this workspace");
  }

  const permissions = roleToPermissions(wsMember.role as AuthContext["role"]);

  return {
    workspaceId,
    memberId: member._id,
    role: wsMember.role as AuthContext["role"],
    permissions,
    authMethod: "jwt",
  };
}

/**
 * Resolve authentication for action context (which has a different auth interface).
 */
export async function resolveAuthAction(
  ctx: ActionCtx,
  args: { workspaceId?: Id<"workspaces">; workspaceSlug?: string; machineToken?: string },
): Promise<{ email: string; workspaceId?: Id<"workspaces">; workspaceSlug?: string }> {
  if (args.machineToken) {
    return { email: "", workspaceId: args.workspaceId, workspaceSlug: args.workspaceSlug };
  }

  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  // Try email from identity, fall back to empty (actions can't query DB)
  const email = identity.email ?? "";

  return {
    email,
    workspaceId: args.workspaceId,
    workspaceSlug: args.workspaceSlug,
  };
}

async function resolveApiKey(ctx: QueryCtx | MutationCtx, rawKey: string): Promise<AuthContext> {
  const keyHash = await hashApiKey(rawKey);

  const apiKey = await ctx.db
    .query("apiKeys")
    .withIndex("by_key", (q) => q.eq("key", keyHash))
    .first();

  if (!apiKey) {
    // Dev mode: try matching with raw key directly (mk_dev_ prefixed keys)
    const devKey = await ctx.db
      .query("apiKeys")
      .withIndex("by_key", (q) => q.eq("key", rawKey))
      .first();
    if (!devKey) {
      throw new Error("Invalid API key");
    }
    if (devKey.revoked) {
      throw new Error("API key revoked");
    }
    if (devKey.expiresAt && new Date(devKey.expiresAt) < new Date()) {
      throw new Error("API key expired");
    }
    return {
      workspaceId: devKey.workspaceId,
      memberId: devKey.memberId,
      role: "admin",
      permissions: devKey.permissions,
      authMethod: "api_key",
    };
  }

  if (apiKey.revoked) {
    throw new Error("API key revoked");
  }
  if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
    throw new Error("API key expired");
  }

  return {
    workspaceId: apiKey.workspaceId,
    memberId: apiKey.memberId,
    role: "admin",
    permissions: apiKey.permissions,
    authMethod: "api_key",
  };
}

/** Check that the auth context has a specific permission. */
export function requirePermission(auth: AuthContext, permission: string): void {
  if (auth.permissions.includes("*")) return;
  if (!auth.permissions.includes(permission)) {
    throw new Error(`Missing permission: ${permission}`);
  }
}

/** Map workspace role to permission list. */
function roleToPermissions(role: AuthContext["role"]): string[] {
  switch (role) {
    case "admin":
      return ["*"];
    case "validator":
      return [
        "members:read",
        "members:write",
        "teams:read",
        "teams:write",
        "projects:read",
        "projects:write",
        "tasks:read",
        "tasks:write",
        "conversations:read",
        "conversations:write",
        "files:read",
        "files:write",
      ];
    case "viewer":
      return [
        "members:read",
        "teams:read",
        "projects:read",
        "tasks:read",
        "conversations:read",
        "files:read",
      ];
  }
}

async function hashApiKey(raw: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(raw);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Helper: resolve workspace by slug (for public endpoints like template listing).
 */
export async function resolveWorkspaceBySlug(
  ctx: QueryCtx | MutationCtx,
  slug: string,
): Promise<{ _id: Id<"workspaces"> }> {
  const workspace = await ctx.db
    .query("workspaces")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .first();
  if (!workspace) {
    throw new Error("Workspace not found: " + slug);
  }
  return workspace;
}
