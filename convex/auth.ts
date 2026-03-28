import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { DataModel } from "./_generated/dataModel";
import { Id } from "./_generated/dataModel";
import { query, mutation } from "./_generated/server";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [
    Password<DataModel>({
      profile(params) {
        return {
          email: params.email as string,
        };
      },
    }),
  ],
});

/** Debug: raw identity from Convex Auth */
export const debugIdentity = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    // Also check users table
    const users = await ctx.db.query("users").collect();
    const authAccounts = await ctx.db.query("authAccounts").collect();
    return {
      identity: identity ? JSON.parse(JSON.stringify(identity)) : null,
      users: users.map((u: any) => ({ _id: u._id, email: u.email, name: u.name })),
      authAccounts: authAccounts.map((a: any) => ({ _id: a._id, provider: a.provider, providerAccountId: a.providerAccountId, userId: a.userId })),
    };
  },
});

/** Dev-only: wipe all auth tables so a fresh sign-up creates proper profiles */
export const resetAuthTables = mutation({
  handler: async (ctx) => {
    const tables = ["authSessions", "authAccounts", "authRefreshTokens", "authVerificationCodes", "authVerifiers", "authRateLimits", "users"] as const;
    let deleted = 0;
    for (const table of tables) {
      try {
        const rows = await (ctx.db as any).query(table).collect();
        for (const row of rows) {
          await ctx.db.delete(row._id);
          deleted++;
        }
      } catch { /* table may not exist */ }
    }
    return { deleted };
  },
});

/** Resolve email from Convex Auth identity (inline to avoid circular import). */
async function getAuthEmail(ctx: any): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  if (identity.email) return identity.email;
  const userId = identity.subject?.split("|")[0];
  if (!userId) return null;
  try {
    const user = await ctx.db.get(userId as Id<"users">);
    return (user as any)?.email ?? null;
  } catch {
    return null;
  }
}

/** Get the currently authenticated user + their workspace memberships. */
export const currentUser = query({
  handler: async (ctx) => {
    const email = await getAuthEmail(ctx);
    if (!email) return null;

    // Find member by email
    const member = await ctx.db
      .query("members")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (!member) return null;

    // Find all workspace memberships
    const memberships = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_member", (q) => q.eq("memberId", member._id))
      .collect();

    const workspaces = [];
    for (const m of memberships) {
      const ws = await ctx.db.get(m.workspaceId);
      if (ws) {
        workspaces.push({
          id: ws._id,
          slug: ws.slug,
          name: ws.displayName,
          role: m.role,
        });
      }
    }

    return {
      id: member._id,
      name: member.name,
      email: member.email,
      title: member.title,
      avatarUrl: member.avatarUrl,
      workspaces,
    };
  },
});
