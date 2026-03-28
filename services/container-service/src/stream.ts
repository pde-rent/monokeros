/**
 * SSE stream proxy: sends a message to the agent's OpenClaw gateway,
 * which handles system prompt assembly, tool execution, session management,
 * and LLM routing. Streams back NDJSON events to the browser.
 *
 * Pipeline: Browser → Next.js /api/chat/stream → Container Service → OpenClaw → LLM
 */

import { getRuntime } from "./docker";

const OPENCLAW_TIMEOUT_MS = 300_000; // 5 min — agentic tool workflows can be long
const MK_API_KEY = process.env.MK_API_KEY ?? "mk_dev_system";
const CONVEX_URL = process.env.CONVEX_SITE_URL ?? "";

// ── Types ────────────────────────────────────────────────────────────────────

interface StreamRequest {
  message: string;
  agentId: string;
  conversationId?: string;
}

interface UsageData {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

// ── SSE parser ───────────────────────────────────────────────────────────────

async function* parseSSEStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<{ type: string; data: Record<string, unknown> }> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let accumulated = "";
  let lastUsage: UsageData | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;

      const data = trimmed.slice(6);
      if (data === "[DONE]") continue;

      try {
        const parsed = JSON.parse(data) as {
          choices?: Array<{
            delta?: {
              content?: string;
              tool_calls?: Array<{
                index: number;
                id?: string;
                function?: { name?: string; arguments?: string };
              }>;
            };
            finish_reason?: string | null;
          }>;
          usage?: UsageData;
          model?: string;
        };

        // Capture usage from the final chunk (OpenClaw includes this
        // when the underlying provider reports it)
        if (parsed.usage) {
          lastUsage = parsed.usage;
        }

        const choice = parsed.choices?.[0];
        if (!choice) continue;

        if (choice.delta?.tool_calls) {
          for (const tc of choice.delta.tool_calls) {
            if (tc.id && tc.function?.name) {
              yield {
                type: "tool_start",
                data: { id: tc.id, name: tc.function.name },
              };
            }
          }
        }

        // Delta streaming — yield only the new content chunk
        if (choice.delta?.content) {
          accumulated += choice.delta.content;
          yield {
            type: "content",
            data: { delta: choice.delta.content },
          };
        }

        if (choice.finish_reason === "tool_calls") {
          yield { type: "status", data: { phase: "reflecting" } };
        }
      } catch {
        // Skip malformed SSE data
      }
    }
  }

  // Emit usage event if available
  if (lastUsage) {
    yield {
      type: "usage",
      data: {
        promptTokens: lastUsage.prompt_tokens ?? 0,
        completionTokens: lastUsage.completion_tokens ?? 0,
        totalTokens: lastUsage.total_tokens ?? 0,
      },
    };
  }

  yield { type: "done", data: { response: accumulated } };
}

// ── Convex persistence helpers ──────────────────────────────────────────────

async function persistAgentMessage(
  conversationId: string,
  agentId: string,
  content: string,
): Promise<void> {
  if (!CONVEX_URL || !content) return;

  try {
    await fetch(`${CONVEX_URL}/api/chat/store-message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MK_API_KEY}`,
      },
      body: JSON.stringify({
        conversationId,
        memberId: agentId,
        content,
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    console.error(
      `[stream] Failed to persist agent message: ${err instanceof Error ? err.message : err}`,
    );
  }
}

async function persistTokenUsage(
  conversationId: string,
  agentId: string,
  usage: UsageData,
  model?: string,
): Promise<void> {
  if (!CONVEX_URL) return;

  try {
    await fetch(`${CONVEX_URL}/api/metrics/token-usage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MK_API_KEY}`,
      },
      body: JSON.stringify({
        memberId: agentId,
        conversationId,
        promptTokens: usage.prompt_tokens ?? 0,
        completionTokens: usage.completion_tokens ?? 0,
        totalTokens: usage.total_tokens ?? 0,
        model: model ?? "",
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    console.error(
      `[stream] Failed to persist token usage: ${err instanceof Error ? err.message : err}`,
    );
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function streamMessage(
  conversationId: string,
  body: StreamRequest,
): Promise<Response> {
  const { agentId, message } = body;

  if (!agentId) {
    return Response.json({ error: "agentId is required" }, { status: 400 });
  }

  const rt = getRuntime(agentId);
  if (!rt || rt.status !== "running") {
    return Response.json(
      { error: `Agent ${agentId} is not running` },
      { status: 503 },
    );
  }

  const gatewayUrl = rt.gatewayUrl ?? rt.openclawUrl;
  if (!gatewayUrl) {
    return Response.json(
      { error: `Agent ${agentId} has no gateway URL — container may have failed to start` },
      { status: 503 },
    );
  }

  // Route through agent gateway — it handles system prompt, tools, session, and LLM routing
  const apiUrl = `${gatewayUrl}/v1/chat/completions`;

  let res: Response;
  try {
    res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MK_API_KEY}`,
        "x-openclaw-agent-id": agentId,
      },
      body: JSON.stringify({
        model: "openclaw",
        messages: [{ role: "user", content: message }],
        stream: true,
        // Derive session key from conversationId so each conversation
        // gets its own OpenClaw session context
        user: `conversation:${conversationId}`,
      }),
      signal: AbortSignal.timeout(OPENCLAW_TIMEOUT_MS),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("ECONNREFUSED") || msg.includes("fetch failed")) {
      return Response.json(
        { error: "Agent is starting up — please try again in a few seconds", retryable: true },
        { status: 503 },
      );
    }
    return Response.json(
      { error: `Failed to reach agent gateway: ${msg}` },
      { status: 502 },
    );
  }

  if (!res.ok) {
    const errText = await res.text();
    if (res.status === 503 || res.status === 502) {
      return Response.json(
        { error: `Agent is starting up: ${errText}`, retryable: true },
        { status: 503 },
      );
    }
    return Response.json(
      { error: `Agent gateway error ${res.status}: ${errText}` },
      { status: 502 },
    );
  }

  if (!res.body) {
    return Response.json(
      { error: "No response body from agent gateway" },
      { status: 502 },
    );
  }

  // Transform SSE → NDJSON streaming response
  const sseBody = res.body;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let accumulatedContent = "";
      let usageData: UsageData | null = null;

      try {
        // Initial status event
        controller.enqueue(
          encoder.encode(
            JSON.stringify({ type: "status", data: { phase: "thinking" } }) +
              "\n",
          ),
        );

        for await (const event of parseSSEStream(sseBody)) {
          controller.enqueue(
            encoder.encode(JSON.stringify(event) + "\n"),
          );

          // Track accumulated content and usage for persistence
          if (event.type === "done" && typeof event.data.response === "string") {
            accumulatedContent = event.data.response;
          }
          if (event.type === "usage") {
            usageData = {
              prompt_tokens: event.data.promptTokens as number,
              completion_tokens: event.data.completionTokens as number,
              total_tokens: event.data.totalTokens as number,
            };
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        controller.enqueue(
          encoder.encode(
            JSON.stringify({ type: "error", data: { message: msg } }) + "\n",
          ),
        );
      } finally {
        controller.close();

        // Fire-and-forget: persist the agent message to Convex
        if (accumulatedContent) {
          persistAgentMessage(conversationId, agentId, accumulatedContent);
        }
        // Fire-and-forget: persist token usage to Convex
        if (usageData) {
          persistTokenUsage(conversationId, agentId, usageData);
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      "X-Conversation-Id": conversationId,
    },
  });
}
