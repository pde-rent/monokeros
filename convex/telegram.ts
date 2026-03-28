import { httpAction, action, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { resolveAuth } from "./lib/auth";

/**
 * Telegram webhook handler — receives POST from Telegram Bot API.
 * URL: CONVEX_SITE_URL/telegram/webhook/:workspaceSlug
 */
export const webhook = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");
  const workspaceSlug = pathParts[pathParts.length - 1];

  if (!workspaceSlug) {
    return new Response("Missing workspace slug", { status: 400 });
  }

  const body = await request.json();
  const message = body.message;
  if (!message?.text) {
    return new Response("OK", { status: 200 });
  }

  const chatId = message.chat.id;
  const text = message.text;
  const fromUser = message.from?.first_name ?? "User";

  // Find workspace by slug
  const workspace = await ctx.runQuery(internal.telegram.resolveWorkspace, {
    slug: workspaceSlug,
  });

  if (!workspace) {
    return new Response("Workspace not found", { status: 404 });
  }

  // TODO: Route message to appropriate conversation, trigger agent response
  // eslint-disable-next-line no-console
  console.log(`[Telegram] ${workspaceSlug} | ${fromUser} (chat ${chatId}): ${text}`);

  return new Response("OK", { status: 200 });
});

/** Internal query to resolve workspace (used by HTTP action). */
export const resolveWorkspace = internalQuery({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("workspaces")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

/** Set Telegram webhook URL. */
export const setWebhook = action({
  args: { workspaceSlug: v.string(), botToken: v.string() },
  handler: async (ctx, args) => {
    const siteUrl = process.env.CONVEX_SITE_URL;
    if (!siteUrl) throw new Error("CONVEX_SITE_URL not configured");

    const webhookUrl = `${siteUrl}/telegram/webhook/${args.workspaceSlug}`;

    const res = await fetch(`https://api.telegram.org/bot${args.botToken}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Telegram API error: ${text}`);
    }

    return res.json();
  },
});

/** Get Telegram bot status. */
export const getStatus = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const auth = await resolveAuth(ctx, { workspaceId: args.workspaceId });

    const ws = await ctx.db.get(auth.workspaceId);
    if (!ws) return null;

    return {
      configured: !!ws.telegramBotToken,
      workspaceSlug: ws.slug,
    };
  },
});
