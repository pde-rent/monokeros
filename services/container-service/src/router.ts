import { join, resolve, relative } from "node:path";
import { startContainer, stopContainer, restartContainer, updateModel, healthCheck, getDesktop, getStats, validateWorkspace, createVncSession, getCapabilities } from "./docker";
import { streamMessage } from "./stream";

const DATA_DIR = process.env.DATA_DIR || join(process.cwd(), "data");

export async function route(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  // POST /containers/:agentId/start
  const startMatch = path.match(/^\/containers\/([^/]+)\/start$/);
  if (startMatch && method === "POST") {
    const body = await req.json();
    const result = await startContainer(
      startMatch[1],
      body.workspaceSlug ?? body.workspaceId,
      body.provision,
      body.runtimeType ?? "openclaw",
      body.desktop,
    );
    return Response.json(result);
  }

  // POST /containers/:agentId/stop
  const stopMatch = path.match(/^\/containers\/([^/]+)\/stop$/);
  if (stopMatch && method === "POST") {
    const body = await req.json().catch(() => ({}));
    const agentId = stopMatch[1];

    if (body.workspaceId && !validateWorkspace(agentId, body.workspaceId)) {
      return Response.json({ error: "Workspace mismatch" }, { status: 403 });
    }

    await stopContainer(agentId);
    return Response.json({ status: "stopped" });
  }

  // POST /containers/:agentId/restart
  const restartMatch = path.match(/^\/containers\/([^/]+)\/restart$/);
  if (restartMatch && method === "POST") {
    const body = await req.json();
    const result = await restartContainer(
      restartMatch[1],
      body.workspaceSlug ?? body.workspaceId,
      body.provision,
      body.runtimeType,
      body.desktop,
    );
    return Response.json(result);
  }

  // PATCH /containers/:agentId/model — update model without container restart
  const modelMatch = path.match(/^\/containers\/([^/]+)\/model$/);
  if (modelMatch && method === "PATCH") {
    const body = await req.json();
    try {
      const result = await updateModel(
        modelMatch[1],
        body.provider,
        body.workspaceSlug ?? body.workspaceId,
        body.runtimeType,
      );
      return Response.json(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return Response.json({ error: msg }, { status: 400 });
    }
  }

  // GET /containers/:agentId/health
  const healthMatch = path.match(/^\/containers\/([^/]+)\/health$/);
  if (healthMatch && method === "GET") {
    const result = await healthCheck(healthMatch[1]);
    return Response.json(result);
  }

  // GET /containers/:agentId/stats
  const statsMatch = path.match(/^\/containers\/([^/]+)\/stats$/);
  if (statsMatch && method === "GET") {
    const agentId = statsMatch[1];
    const workspaceId = url.searchParams.get("workspaceId");

    if (workspaceId && !validateWorkspace(agentId, workspaceId)) {
      return Response.json({ error: "Workspace mismatch" }, { status: 403 });
    }

    const result = getStats(agentId);
    return Response.json(result ?? { cpuPercent: 0, memoryMb: 0, windows: [], updatedAt: null });
  }

  // GET /containers/:agentId/desktop
  const desktopMatch = path.match(/^\/containers\/([^/]+)\/desktop$/);
  if (desktopMatch && method === "GET") {
    const agentId = desktopMatch[1];
    const workspaceId = url.searchParams.get("workspaceId");

    if (workspaceId && !validateWorkspace(agentId, workspaceId)) {
      return Response.json({ error: "Workspace mismatch" }, { status: 403 });
    }

    const result = await getDesktop(agentId);
    return Response.json(result);
  }

  // POST /containers/:agentId/vnc-session
  const vncSessionMatch = path.match(/^\/containers\/([^/]+)\/vnc-session$/);
  if (vncSessionMatch && method === "POST") {
    const agentId = vncSessionMatch[1];
    const body = await req.json();
    const { workspaceId, role } = body;

    if (!workspaceId || !role) {
      return Response.json({ error: "workspaceId and role are required" }, { status: 400 });
    }

    try {
      const token = createVncSession(agentId, workspaceId, role);
      const desktop = await getDesktop(agentId);
      const viewOnly = role !== "admin" || !body.interactive;
      const wsUrl = desktop.vncPort
        ? `ws://localhost:${desktop.vncPort}`
        : null;

      return Response.json({ token, wsUrl, viewOnly });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return Response.json({ error: msg }, { status: 403 });
    }
  }

  // POST /containers/:agentId/sync-file
  const syncFileMatch = path.match(/^\/containers\/([^/]+)\/sync-file$/);
  if (syncFileMatch && method === "POST") {
    const agentId = syncFileMatch[1];
    const body = await req.json() as { path: string; content: string };

    if (!body.path || typeof body.content !== "string") {
      return Response.json(
        { error: "path and content are required" },
        { status: 400 },
      );
    }

    // Prevent path traversal — resolve and verify the target stays inside workspace
    const wsDir = resolve(DATA_DIR, agentId, "workspace");
    const filePath = resolve(wsDir, body.path);
    if (relative(wsDir, filePath).startsWith("..")) {
      return Response.json(
        { error: "Path traversal not allowed" },
        { status: 400 },
      );
    }

    try {
      await Bun.write(filePath, body.content);
      return Response.json({ ok: true, path: body.path });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return Response.json({ error: msg }, { status: 500 });
    }
  }

  // GET /containers/:agentId/capabilities
  const capabilitiesMatch = path.match(/^\/containers\/([^/]+)\/capabilities$/);
  if (capabilitiesMatch && method === "GET") {
    const caps = getCapabilities(capabilitiesMatch[1]);
    if (!caps) {
      return Response.json({ error: "Agent not found" }, { status: 404 });
    }
    return Response.json(caps);
  }

  // POST /stream/:conversationId
  const streamMatch = path.match(/^\/stream\/([^/]+)$/);
  if (streamMatch && method === "POST") {
    const body = await req.json();
    return streamMessage(streamMatch[1], body);
  }

  // GET /health — service-level health check
  if (path === "/health" && method === "GET") {
    return Response.json({ status: "ok" });
  }

  return new Response("Not Found", { status: 404 });
}
