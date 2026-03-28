import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";

/**
 * Notify all human members in a workspace.
 * Consolidates the repeated query-humans + create-notification pattern.
 */
export async function notifyHumans(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  notification: {
    type: string;
    title: string;
    body: string;
    entityType?: string | null;
    entityId?: string | null;
    actorId: string;
  },
) {
  const humans = await ctx.db
    .query("members")
    .withIndex("by_workspace_type", (q) => q.eq("workspaceId", workspaceId).eq("type", "human"))
    .collect();

  for (const human of humans) {
    await ctx.runMutation(internal.notifications.create, {
      workspaceId,
      recipientId: human._id as string,
      type: notification.type as any,
      title: notification.title,
      body: notification.body,
      entityType: notification.entityType ?? null,
      entityId: notification.entityId ?? null,
      actorId: notification.actorId,
    });
  }
}
