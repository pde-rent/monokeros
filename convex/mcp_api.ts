import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

/**
 * MCP API dispatch endpoint.
 *
 * Single HTTP endpoint that authenticates via API key and dispatches
 * to existing Convex queries/mutations. Used by the MCP server running
 * inside agent containers.
 *
 * POST /api/mcp
 * Header: Authorization: Bearer mk_dev_{agentId}
 * Body: { action: "members.list", args: { ... } }
 */

type DispatchEntry =
  | { type: "query"; ref: any }
  | { type: "mutation"; ref: any }
  | { type: "action"; ref: any };

// Map of action strings to Convex function references.
// Only includes functions that agents should have access to via MCP.
const DISPATCH: Record<string, DispatchEntry> = {
  // Members
  "members.list": { type: "query", ref: api.members.list },
  "members.get": { type: "query", ref: api.members.get },
  "members.create": { type: "mutation", ref: api.members.create },
  "members.update": { type: "mutation", ref: api.members.update },
  "members.updateStatus": { type: "mutation", ref: api.members.updateStatus },
  "members.remove": { type: "mutation", ref: api.members.remove },
  "members.getRuntime": { type: "query", ref: api.members.getRuntime },
  "members.startContainer": { type: "action", ref: api.members.startContainer },
  "members.stopContainer": { type: "action", ref: api.members.stopContainer },
  "members.rerollName": { type: "action", ref: api.members.rerollName },
  "members.rerollIdentity": { type: "action", ref: api.members.rerollIdentity },
  "members.restartContainer": { type: "action", ref: api.members.restartContainer },
  "members.getDesktop": { type: "query", ref: api.members.getDesktop },
  "members.getContainerStats": { type: "action", ref: api.members.getContainerStats },
  "members.createDesktopSession": { type: "action", ref: api.members.createDesktopSession },

  // Teams
  "teams.list": { type: "query", ref: api.teams.list },
  "teams.get": { type: "query", ref: api.teams.get },
  "teams.create": { type: "mutation", ref: api.teams.create },
  "teams.update": { type: "mutation", ref: api.teams.update },
  "teams.remove": { type: "mutation", ref: api.teams.remove },

  // Projects
  "projects.list": { type: "query", ref: api.projects.list },
  "projects.get": { type: "query", ref: api.projects.get },
  "projects.create": { type: "mutation", ref: api.projects.create },
  "projects.update": { type: "mutation", ref: api.projects.update },
  "projects.updateGate": { type: "mutation", ref: api.projects.updateGate },

  // Tasks
  "tasks.list": { type: "query", ref: api.tasks.list },
  "tasks.get": { type: "query", ref: api.tasks.get },
  "tasks.create": { type: "mutation", ref: api.tasks.create },
  "tasks.update": { type: "mutation", ref: api.tasks.update },
  "tasks.move": { type: "mutation", ref: api.tasks.move },
  "tasks.assign": { type: "mutation", ref: api.tasks.assign },
  "tasks.submitAcceptance": { type: "mutation", ref: api.tasks.submitAcceptance },
  "tasks.setParent": { type: "mutation", ref: api.tasks.setParent },
  "tasks.addDependency": { type: "mutation", ref: api.tasks.addDependency },
  "tasks.removeDependency": { type: "mutation", ref: api.tasks.removeDependency },
  "tasks.addArtifact": { type: "mutation", ref: api.tasks.addArtifact },
  "tasks.removeArtifact": { type: "mutation", ref: api.tasks.removeArtifact },

  // Conversations
  "conversations.list": { type: "query", ref: api.conversations.list },
  "conversations.get": { type: "query", ref: api.conversations.get },
  "conversations.create": { type: "mutation", ref: api.conversations.create },
  "conversations.rename": { type: "mutation", ref: api.conversations.rename },
  "conversations.sendMessage": { type: "mutation", ref: api.conversations.sendMessage },
  "conversations.setReaction": { type: "mutation", ref: api.conversations.setReaction },

  // Files
  "files.drives": { type: "query", ref: api.files.drives },
  "files.getContent": { type: "query", ref: api.files.getContent },
  "files.createFile": { type: "mutation", ref: api.files.createFile },
  "files.createFolder": { type: "mutation", ref: api.files.createFolder },
  "files.renameItem": { type: "mutation", ref: api.files.renameItem },
  "files.updateContent": { type: "mutation", ref: api.files.updateContent },
  "files.deleteItem": { type: "mutation", ref: api.files.deleteItem },

  // Knowledge
  "knowledge.search": { type: "query", ref: api.knowledge.search },

  // Workspaces
  "workspaces.list": { type: "query", ref: api.workspaces.list },
  "workspaces.getConfig": { type: "query", ref: api.workspaces.getConfig },
  "workspaces.create": { type: "mutation", ref: api.workspaces.create },
  "workspaces.remove": { type: "mutation", ref: api.workspaces.remove },
  "workspaces.updateConfig": { type: "mutation", ref: api.workspaces.updateConfig },
  "workspaces.listProviders": { type: "query", ref: api.workspaces.listProviders },
  "workspaces.addProvider": { type: "mutation", ref: api.workspaces.addProvider },
  "workspaces.updateProvider": { type: "mutation", ref: api.workspaces.updateProvider },
  "workspaces.removeProvider": { type: "mutation", ref: api.workspaces.removeProvider },
  "workspaces.setDefaultProvider": { type: "mutation", ref: api.workspaces.setDefaultProvider },

  // Notifications
  "notifications.list": { type: "query", ref: api.notifications.list },
  "notifications.counts": { type: "query", ref: api.notifications.counts },
  "notifications.markRead": { type: "mutation", ref: api.notifications.markRead },
  "notifications.markAllRead": { type: "mutation", ref: api.notifications.markAllRead },

  // Models
  "models.providers": { type: "query", ref: api.models.providers },
  "models.catalog": { type: "action", ref: api.models.catalog },

  // Token Usage
  "tokenUsage.getByMember": { type: "query", ref: api.tokenUsage.getByMember },
  "tokenUsage.getByConversation": { type: "query", ref: api.tokenUsage.getByConversation },

  // Resource Snapshots
  "resourceSnapshots.getByMember": { type: "query", ref: api.resourceSnapshots.getByMember },

  // Activities
  "activities.feed": { type: "query", ref: api.activities.feed },

  // Wiki
  "wiki.nav": { type: "query", ref: api.wiki.nav },
  "wiki.page": { type: "query", ref: api.wiki.page },
  "wiki.raw": { type: "query", ref: api.wiki.raw },
  "wiki.save": { type: "mutation", ref: api.wiki.save },

  // Templates
  "templates.list": { type: "query", ref: api.templates.list },
  "templates.get": { type: "query", ref: api.templates.get },
  "templates.apply": { type: "mutation", ref: api.templates.apply },
};

/**
 * Resolve workspace ID from either a direct workspaceId or a workspaceSlug.
 * Agents pass workspaceSlug from their env; we resolve it to an ID.
 */
async function resolveWorkspaceId(
  ctx: any,
  args: Record<string, unknown>,
): Promise<Id<"workspaces"> | undefined> {
  if (args.workspaceId) return args.workspaceId as Id<"workspaces">;
  if (args.workspaceSlug) {
    const ws = await ctx.runQuery(api.workspaces.getBySlug, {
      slug: args.workspaceSlug as string,
    });
    if (!ws) throw new Error(`Workspace not found: ${args.workspaceSlug}`);
    return ws._id;
  }
  return undefined;
}

export const mcpDispatch = httpAction(async (ctx, request) => {
  // Auth: extract Bearer token
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const token = authHeader.slice(7);

  // Parse body
  let body: { action: string; args?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { action, args: rawArgs = {} } = body;

  // Lookup dispatch entry
  const entry = DISPATCH[action];
  if (!entry) {
    return new Response(
      JSON.stringify({ error: `Unknown action: ${action}`, available: Object.keys(DISPATCH) }),
      { status: 404, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    // Resolve workspace ID from slug if needed
    const workspaceId = await resolveWorkspaceId(ctx, rawArgs);

    // Build final args, injecting machineToken for auth and resolved workspaceId
    const finalArgs: Record<string, unknown> = {
      ...rawArgs,
      machineToken: token,
    };
    if (workspaceId) {
      finalArgs.workspaceId = workspaceId;
    }
    // Remove workspaceSlug from args (Convex functions expect workspaceId)
    delete finalArgs.workspaceSlug;

    let result: unknown;
    switch (entry.type) {
      case "query":
        result = await ctx.runQuery(entry.ref, finalArgs as any);
        break;
      case "mutation":
        result = await ctx.runMutation(entry.ref, finalArgs as any);
        break;
      case "action":
        result = await ctx.runAction(entry.ref, finalArgs as any);
        break;
    }

    return new Response(JSON.stringify(result ?? null), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    const message = err?.message ?? "Internal error";
    const status = message.includes("Not authenticated") || message.includes("Invalid API key")
      ? 401
      : message.includes("not found")
        ? 404
        : message.includes("Missing permission")
          ? 403
          : 500;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }
});
