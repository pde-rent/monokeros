import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

/**
 * Best-effort model pricing (USD per 1M tokens).
 * Duplicated from @monokeros/constants to avoid workspace package
 * import issues inside the Convex runtime.
 */
const MODEL_PRICING: Record<string, { inputPer1M: number; outputPer1M: number }> = {
  "claude-opus-4-6": { inputPer1M: 15.0, outputPer1M: 75.0 },
  "claude-sonnet-4-5-20250929": { inputPer1M: 3.0, outputPer1M: 15.0 },
  "claude-haiku-4-5-20251001": { inputPer1M: 0.8, outputPer1M: 4.0 },
  "gpt-4o": { inputPer1M: 2.5, outputPer1M: 10.0 },
  "gpt-4o-mini": { inputPer1M: 0.15, outputPer1M: 0.6 },
  "o3": { inputPer1M: 10.0, outputPer1M: 40.0 },
  "o3-mini": { inputPer1M: 1.1, outputPer1M: 4.4 },
  "o4-mini": { inputPer1M: 1.1, outputPer1M: 4.4 },
  "gemini-2.5-pro": { inputPer1M: 1.25, outputPer1M: 10.0 },
  "gemini-2.5-flash": { inputPer1M: 0.15, outputPer1M: 0.6 },
  "deepseek-chat": { inputPer1M: 0.27, outputPer1M: 1.1 },
  "deepseek-reasoner": { inputPer1M: 0.55, outputPer1M: 2.19 },
  "glm-5": { inputPer1M: 0.5, outputPer1M: 2.0 },
};

function estimateCost(model: string, promptTokens: number, completionTokens: number): number {
  const pricing = MODEL_PRICING[model];
  if (!pricing) return 0;
  return (
    (promptTokens / 1_000_000) * pricing.inputPer1M +
    (completionTokens / 1_000_000) * pricing.outputPer1M
  );
}

// ── Internal mutation: record token usage ─────────────────────────────────

export const record = internalMutation({
  args: {
    workspaceId: v.id("workspaces"),
    memberId: v.id("members"),
    conversationId: v.optional(v.string()),
    model: v.string(),
    promptTokens: v.float64(),
    completionTokens: v.float64(),
    totalTokens: v.float64(),
  },
  handler: async (ctx, args) => {
    const cost = estimateCost(args.model, args.promptTokens, args.completionTokens);

    // Insert event row
    await ctx.db.insert("tokenUsage", {
      workspaceId: args.workspaceId,
      memberId: args.memberId,
      conversationId: args.conversationId,
      model: args.model,
      promptTokens: args.promptTokens,
      completionTokens: args.completionTokens,
      totalTokens: args.totalTokens,
      estimatedCostUsd: cost,
    });

    // Update running totals on member stats
    const member = await ctx.db.get(args.memberId);
    if (member) {
      const stats = member.stats;
      await ctx.db.patch(args.memberId, {
        stats: {
          ...stats,
          totalPromptTokens: (stats.totalPromptTokens ?? 0) + args.promptTokens,
          totalCompletionTokens: (stats.totalCompletionTokens ?? 0) + args.completionTokens,
          totalTokens: (stats.totalTokens ?? 0) + args.totalTokens,
          totalCostUsd: (stats.totalCostUsd ?? 0) + cost,
        },
      });
    }
  },
});

// ── Queries ───────────────────────────────────────────────────────────────

export const getByMember = query({
  args: {
    memberId: v.id("members"),
    limit: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("tokenUsage")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .order("desc")
      .take(Math.floor(args.limit ?? 50));
  },
});

export const getByConversation = query({
  args: {
    conversationId: v.string(),
    limit: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("tokenUsage")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .order("desc")
      .take(Math.floor(args.limit ?? 100));
  },
});
