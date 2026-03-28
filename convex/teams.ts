import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { resolveAuth, requirePermission } from "./lib/auth";
import { assertOwnership, buildPatch } from "./lib/crud";

export const list = query({
  args: { workspaceId: v.id("workspaces"), machineToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });
    requirePermission(auth, "teams:read");
    return ctx.db
      .query("teams")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", auth.workspaceId))
      .collect();
  },
});

export const get = query({
  args: { workspaceId: v.id("workspaces"), teamId: v.id("teams"), machineToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });
    requirePermission(auth, "teams:read");
    return assertOwnership(ctx, args.teamId, auth, "Team");
  },
});

export const create = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    name: v.string(),
    type: v.string(),
    color: v.string(),
    leadId: v.id("members"),
    memberIds: v.array(v.id("members")),
    machineToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });
    requirePermission(auth, "teams:write");

    const teamId = await ctx.db.insert("teams", {
      workspaceId: auth.workspaceId,
      name: args.name,
      type: args.type,
      color: args.color,
      leadId: args.leadId,
      memberIds: args.memberIds,
    });

    // Update team assignment on members
    for (const memberId of args.memberIds) {
      await ctx.db.patch(memberId, { teamId });
    }
    // Mark lead
    await ctx.db.patch(args.leadId, { isLead: true, teamId });

    return teamId;
  },
});

const UPDATE_FIELDS = ["name", "type", "color", "leadId", "memberIds"] as const;

export const update = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    teamId: v.id("teams"),
    name: v.optional(v.string()),
    type: v.optional(v.string()),
    color: v.optional(v.string()),
    leadId: v.optional(v.id("members")),
    memberIds: v.optional(v.array(v.id("members"))),
    machineToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });
    requirePermission(auth, "teams:write");
    await assertOwnership(ctx, args.teamId, auth, "Team");

    await ctx.db.patch(args.teamId, buildPatch(args, UPDATE_FIELDS));
    return args.teamId;
  },
});

export const remove = mutation({
  args: { workspaceId: v.id("workspaces"), teamId: v.id("teams"), machineToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });
    requirePermission(auth, "teams:write");

    const team = await assertOwnership(ctx, args.teamId, auth, "Team");

    // Unassign members from team
    for (const memberId of team.memberIds) {
      await ctx.db.patch(memberId, { teamId: null, isLead: false });
    }

    await ctx.db.delete(args.teamId);
  },
});
