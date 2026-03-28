/**
 * System API HTTP actions.
 *
 * Called by the container service (not by browsers) with MK_API_KEY auth.
 * These endpoints bridge the container service → Convex for persistence
 * that cannot go through the MCP dispatch.
 */

import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

// ── Auth helper ──────────────────────────────────────────────────────────────

function validateSystemAuth(request: Request): Response | null {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Missing Authorization header" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  const token = authHeader.slice(7);
  const expected = process.env.MK_API_KEY ?? "mk_dev_system";
  if (token !== expected) {
    return new Response(
      JSON.stringify({ error: "Invalid API key" }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }

  return null; // auth OK
}

// ── Store agent message ──────────────────────────────────────────────────────

export const storeMessage = httpAction(async (ctx, request) => {
  const authErr = validateSystemAuth(request);
  if (authErr) return authErr;

  let body: {
    conversationId: string;
    memberId: string;
    content: string;
  };
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const { conversationId, memberId, content } = body;
  if (!conversationId || !memberId || !content) {
    return new Response(
      JSON.stringify({ error: "Missing required fields: conversationId, memberId, content" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const msgId = await ctx.runMutation(
      internal.conversations.storeAgentMessage,
      {
        conversationId: conversationId as Id<"conversations">,
        memberId,
        content,
        references: [],
      },
    );

    return new Response(
      JSON.stringify({ ok: true, messageId: msgId }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: `Failed to store message: ${msg}` }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});

// ── Provision files ──────────────────────────────────────────────────────────
// Batch upsert files into a member's drive during container provisioning.

export const provisionFiles = httpAction(async (ctx, request) => {
  const authErr = validateSystemAuth(request);
  if (authErr) return authErr;

  let body: {
    workspaceSlug: string;
    memberId: string;
    files: Array<{
      name: string;
      path: string;
      type: "file" | "directory";
      content?: string;
      mimeType?: string;
    }>;
  };
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const { workspaceSlug, memberId, files } = body;
  if (!workspaceSlug || !memberId || !files?.length) {
    return new Response(
      JSON.stringify({ error: "Missing required fields: workspaceSlug, memberId, files" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    // Resolve workspace ID from slug
    const workspace = await ctx.runQuery(api.workspaces.getBySlug, {
      slug: workspaceSlug,
    });
    if (!workspace) {
      return new Response(
        JSON.stringify({ error: `Workspace not found: ${workspaceSlug}` }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }

    // Upsert each file sequentially (Convex mutations are transactional per-call)
    const results: string[] = [];
    for (const file of files) {
      const id = await ctx.runMutation(internal.files.upsertFile, {
        workspaceId: workspace._id,
        driveType: "member",
        driveOwnerId: memberId,
        name: file.name,
        path: file.path,
        type: file.type,
        content: file.content,
        mimeType: file.mimeType,
      });
      results.push(String(id));
    }

    return new Response(
      JSON.stringify({ ok: true, count: results.length }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: `Failed to provision files: ${msg}` }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});

// ── Token usage ──────────────────────────────────────────────────────────────

export const tokenUsage = httpAction(async (ctx, request) => {
  const authErr = validateSystemAuth(request);
  if (authErr) return authErr;

  let body: {
    memberId: string;
    conversationId: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    model: string;
  };
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!body.memberId) {
    return new Response(
      JSON.stringify({ error: "Missing required field: memberId" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    // Resolve the member to get its workspaceId
    const member = await ctx.runQuery(internal.members.getInternal, {
      memberId: body.memberId as Id<"members">,
    });

    if (!member) {
      console.warn(`[system-api] Token usage: member not found: ${body.memberId}`);
      return new Response(
        JSON.stringify({ ok: true, warning: "member not found" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    await ctx.runMutation(internal.tokenUsage.record, {
      workspaceId: member.workspaceId,
      memberId: body.memberId as Id<"members">,
      conversationId: body.conversationId,
      model: body.model || "",
      promptTokens: body.promptTokens ?? 0,
      completionTokens: body.completionTokens ?? 0,
      totalTokens: body.totalTokens ?? 0,
    });

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[system-api] Token usage error: ${msg}`);
    return new Response(
      JSON.stringify({ error: `Token usage recording failed: ${msg}` }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});

// ── Resource snapshots ───────────────────────────────────────────────────────

export const resourceSnapshots = httpAction(async (ctx, request) => {
  const authErr = validateSystemAuth(request);
  if (authErr) return authErr;

  let body: {
    snapshots: Array<{
      memberId: string;
      workspaceId: string;
      cpuPercent: number;
      memoryMb: number;
      windowCount: number;
    }>;
  };
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!body.snapshots?.length) {
    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    await ctx.runMutation(internal.resourceSnapshots.batchInsert, {
      snapshots: body.snapshots.map((s) => ({
        workspaceId: s.workspaceId as Id<"workspaces">,
        memberId: s.memberId as Id<"members">,
        cpuPercent: s.cpuPercent,
        memoryMb: s.memoryMb,
        windowCount: s.windowCount,
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[system-api] Resource snapshots error: ${msg}`);
    return new Response(
      JSON.stringify({ error: `Resource snapshot recording failed: ${msg}` }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({ ok: true }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
