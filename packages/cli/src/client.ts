/**
 * CLI client — wraps the shared ApiClient with context resolution.
 *
 * Reuses the exact same ApiClient from @monokeros/mcp so every CLI call
 * goes through the same code path as MCP tool invocations.
 */

import { ApiClient } from "@monokeros/mcp/api-client";
import { resolveContext, type MkContext } from "./config";

let _client: ApiClient | null = null;
let _ctx: MkContext | null = null;

/**
 * Get a configured ApiClient for the current context.
 * The same instance is reused across commands in a single invocation.
 */
export function getClient(): ApiClient {
  if (_client) return _client;

  _ctx = resolveContext();
  if (!_ctx.workspace) {
    throw new Error(
      "No workspace configured. Run: mk config set-context <name> --workspace <slug>",
    );
  }

  // ApiClient reads BASE from env, so we set it before constructing
  process.env.MONOKEROS_API_URL = _ctx.server;

  _client = new ApiClient();
  _client.setApiKey(_ctx["api-key"]);
  _client.setWorkspace(_ctx.workspace);
  return _client;
}

/** Get the resolved context (for display / debugging). */
export function getContext(): MkContext {
  if (_ctx) return _ctx;
  _ctx = resolveContext();
  return _ctx;
}

/**
 * Container-service URL for direct Docker API calls (stats, desktop, etc.).
 * Falls back to the context server on port 3002.
 */
export function containerServiceUrl(): string {
  const ctx = getContext();
  if (ctx["container-service"]) return ctx["container-service"];
  // Derive from server URL: replace port with 3002
  try {
    const u = new URL(ctx.server);
    u.port = "3002";
    return u.toString().replace(/\/$/, "");
  } catch {
    return "http://localhost:3002";
  }
}
