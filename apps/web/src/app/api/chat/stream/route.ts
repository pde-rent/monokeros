/**
 * Next.js API route that proxies SSE from the Bun container service to the browser.
 *
 * Browser → POST /api/chat/stream → Bun service → OpenClaw container
 *
 * The browser gets back NDJSON events (delta-based content streaming).
 */

const CONTAINER_SERVICE_URL = process.env.CONTAINER_SERVICE_URL ?? "http://localhost:3002";
const CONTAINER_SERVICE_SECRET = process.env.CONTAINER_SERVICE_SECRET ?? "";

export async function POST(req: Request) {
  const body = await req.json();
  const { conversationId, ...rest } = body as {
    conversationId: string;
    [key: string]: unknown;
  };

  if (!conversationId) {
    return Response.json({ error: "conversationId is required" }, { status: 400 });
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (CONTAINER_SERVICE_SECRET) {
    headers["Authorization"] = `Bearer ${CONTAINER_SERVICE_SECRET}`;
  }

  try {
    const response = await fetch(`${CONTAINER_SERVICE_URL}/stream/${conversationId}`, {
      method: "POST",
      headers,
      body: JSON.stringify(rest),
    });

    if (!response.ok) {
      const errText = await response.text();
      return Response.json(
        { error: `Container service error: ${errText}` },
        { status: response.status },
      );
    }

    if (!response.body) {
      return Response.json({ error: "No response body from container service" }, { status: 502 });
    }

    // Forward the NDJSON stream directly to the browser
    return new Response(response.body, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache",
        "X-Conversation-Id": conversationId,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: `Failed to reach container service: ${msg}` }, { status: 502 });
  }
}
