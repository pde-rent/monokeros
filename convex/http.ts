import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { webhook } from "./telegram";
import { mcpDispatch } from "./mcp_api";
import { storeMessage, provisionFiles, tokenUsage, resourceSnapshots } from "./system_api";

const http = httpRouter();

// Auth routes (Convex Auth)
auth.addHttpRoutes(http);

// Telegram webhook
http.route({
  path: "/telegram/webhook/*",
  method: "POST",
  handler: webhook,
});

// MCP API dispatch (used by agent containers)
http.route({
  path: "/api/mcp",
  method: "POST",
  handler: mcpDispatch,
});

// System API (used by container service)
http.route({
  path: "/api/chat/store-message",
  method: "POST",
  handler: storeMessage,
});

http.route({
  path: "/api/files/provision",
  method: "POST",
  handler: provisionFiles,
});

http.route({
  path: "/api/metrics/token-usage",
  method: "POST",
  handler: tokenUsage,
});

http.route({
  path: "/api/metrics/resource-snapshots",
  method: "POST",
  handler: resourceSnapshots,
});

export default http;
