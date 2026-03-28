import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { resolveAuth, requirePermission } from "./lib/auth";
import { assertOwnership } from "./lib/crud";
import { conversationType } from "./schema";
import { parseCommand } from "./lib/commands";
import { executeCommand } from "./chat_commands";

export const list = query({
  args: { workspaceId: v.id("workspaces"), type: v.optional(v.string()), machineToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });
    requirePermission(auth, "conversations:read");

    if (args.type) {
      return ctx.db
        .query("conversations")
        .withIndex("by_workspace_type", (q) =>
          q.eq("workspaceId", auth.workspaceId).eq("type", args.type as any),
        )
        .collect();
    }

    return ctx.db
      .query("conversations")
      .withIndex("by_workspace_lastMessage", (q) => q.eq("workspaceId", auth.workspaceId))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: {
    workspaceId: v.id("workspaces"),
    conversationId: v.id("conversations"),
    limit: v.optional(v.float64()),
    machineToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });
    requirePermission(auth, "conversations:read");

    const conversation = await assertOwnership(ctx, args.conversationId, auth, "Conversation");

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .order("asc")
      .take(args.limit ?? 100);

    return { ...conversation, messages };
  },
});

export const create = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    title: v.string(),
    type: conversationType,
    participantIds: v.array(v.string()),
    projectId: v.optional(v.id("projects")),
    taskId: v.optional(v.id("tasks")),
    machineToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });
    requirePermission(auth, "conversations:write");

    // DM dedup: check if DM already exists with same participant
    if (args.type === "agent_dm" && args.participantIds.length === 1) {
      const existing = await ctx.db
        .query("conversations")
        .withIndex("by_workspace_type", (q) =>
          q.eq("workspaceId", auth.workspaceId).eq("type", "agent_dm"),
        )
        .collect();

      const dup = existing.find(
        (c) => c.participantIds.length === 1 && c.participantIds[0] === args.participantIds[0],
      );
      if (dup) {
        return { conversationId: dup._id, created: false };
      }
    }

    const now = new Date().toISOString();
    const convId = await ctx.db.insert("conversations", {
      workspaceId: auth.workspaceId,
      createdBy: auth.memberId as string,
      title: args.title,
      type: args.type,
      projectId: args.projectId ?? null,
      taskId: args.taskId ?? null,
      participantIds: args.participantIds,
      lastMessageAt: now,
      messageCount: 0,
    });

    return { conversationId: convId, created: true };
  },
});

export const rename = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    conversationId: v.id("conversations"),
    title: v.string(),
    machineToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });
    requirePermission(auth, "conversations:write");

    const conv = await assertOwnership(ctx, args.conversationId, auth, "Conversation");
    if (conv.type !== "group_chat") {
      throw new Error("Can only rename group chats");
    }

    await ctx.db.patch(args.conversationId, { title: args.title });
  },
});

export const sendMessage = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    conversationId: v.id("conversations"),
    content: v.string(),
    role: v.optional(v.string()),
    memberId: v.optional(v.string()),
    references: v.optional(
      v.array(
        v.object({
          type: v.union(
            v.literal("agent"),
            v.literal("issue"),
            v.literal("project"),
            v.literal("task"),
            v.literal("file"),
          ),
          id: v.string(),
          display: v.string(),
        }),
      ),
    ),
    attachments: v.optional(
      v.array(
        v.object({
          id: v.string(),
          fileName: v.string(),
          fileSize: v.float64(),
          mimeType: v.string(),
          storagePath: v.string(),
        }),
      ),
    ),
    machineToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });
    requirePermission(auth, "conversations:write");

    const conv = await assertOwnership(ctx, args.conversationId, auth, "Conversation");

    const now = new Date().toISOString();
    const role = (args.role as any) ?? "user";

    // ── Command interception ─────────────────────────────
    // Only intercept user-role messages that start with /
    if (role === "user" && args.content.trim().startsWith("/")) {
      const parsed = parseCommand(args.content);

      if (parsed.kind === "command" || parsed.kind === "error") {
        // Store the user's command message
        const userMsgId = await ctx.db.insert("messages", {
          conversationId: args.conversationId,
          role: "user",
          content: args.content,
          memberId: args.memberId ?? null,
          references: args.references ?? [],
          attachments: args.attachments ?? [],
        });

        let systemContent: string;
        if (parsed.kind === "error") {
          systemContent = parsed.error;
        } else {
          const result = await executeCommand(parsed.parsed, {
            ctx,
            workspaceId: auth.workspaceId,
            memberId: auth.memberId,
            conversationType: conv.type,
            taskId: conv.taskId ?? null,
            projectId: conv.projectId ?? null,
          });
          systemContent = result.message;
        }

        // Store the system response message
        await ctx.db.insert("messages", {
          conversationId: args.conversationId,
          role: "system",
          content: systemContent,
          memberId: null,
          references: [],
          attachments: [],
        });

        // Update conversation (2 new messages)
        await ctx.db.patch(args.conversationId, {
          lastMessageAt: now,
          messageCount: conv.messageCount + 2,
        });

        return userMsgId;
      }
    }

    // ── Normal message flow ──────────────────────────────
    const msgId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      role,
      content: args.content,
      memberId: args.memberId ?? null,
      references: args.references ?? [],
      attachments: args.attachments ?? [],
    });

    // Update conversation
    await ctx.db.patch(args.conversationId, {
      lastMessageAt: now,
      messageCount: conv.messageCount + 1,
    });

    // Notify human participants (for agent messages)
    if (args.role === "agent" || (!args.role && args.memberId)) {
      const humans = await ctx.db
        .query("members")
        .withIndex("by_workspace_type", (q) =>
          q.eq("workspaceId", auth.workspaceId).eq("type", "human"),
        )
        .collect();
      const humanIds = new Set(humans.map((h) => h._id as string));

      for (const pid of conv.participantIds) {
        if (humanIds.has(pid) && pid !== (auth.memberId as string)) {
          await ctx.runMutation(internal.notifications.create, {
            workspaceId: auth.workspaceId,
            recipientId: pid,
            type: "chat_message",
            title: "New message",
            body: `New message in ${conv.title}`,
            entityType: "conversation",
            entityId: args.conversationId as string,
            actorId: args.memberId ?? (auth.memberId as string),
          });
        }
      }
    }

    return msgId;
  },
});

export const setReaction = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    messageId: v.id("messages"),
    emoji: v.string(),
    machineToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await resolveAuth(ctx, { workspaceId: args.workspaceId, machineToken: args.machineToken });

    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    const reactions = message.reactions ?? [];
    const existing = reactions.find((r) => r.emoji === args.emoji);

    let updated;
    if (existing) {
      if (existing.reacted) {
        // Toggle off
        updated = reactions
          .map((r) => (r.emoji === args.emoji ? { ...r, count: r.count - 1, reacted: false } : r))
          .filter((r) => r.count > 0);
      } else {
        // Toggle on
        updated = reactions.map((r) =>
          r.emoji === args.emoji ? { ...r, count: r.count + 1, reacted: true } : r,
        );
      }
    } else {
      updated = [...reactions, { emoji: args.emoji, count: 1, reacted: true }];
    }

    await ctx.db.patch(args.messageId, { reactions: updated });
  },
});

/** Internal: store agent message after streaming completes. */
export const storeAgentMessage = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    renderedHtml: v.optional(v.string()),
    memberId: v.string(),
    references: v.array(
      v.object({
        type: v.union(
          v.literal("agent"),
          v.literal("issue"),
          v.literal("project"),
          v.literal("task"),
          v.literal("file"),
        ),
        id: v.string(),
        display: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const msgId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      role: "agent",
      content: args.content,
      renderedHtml: args.renderedHtml,
      memberId: args.memberId,
      references: args.references,
      attachments: [],
    });

    const conv = await ctx.db.get(args.conversationId);
    if (conv) {
      await ctx.db.patch(args.conversationId, {
        lastMessageAt: new Date().toISOString(),
        messageCount: conv.messageCount + 1,
      });
    }

    return msgId;
  },
});
