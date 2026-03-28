import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ApiClient } from "../api-client";
import { tryAction, withResult } from "./utils";

export function registerNotificationTools(server: McpServer, api: ApiClient) {
  server.tool(
    "notifications.list",
    "List all notifications for the current user in the workspace.",
    {},
    async () => withResult(() => api.listNotifications()),
  );

  server.tool(
    "notifications.counts",
    "Get total and unread notification counts for the current user.",
    {},
    async () => withResult(() => api.getNotificationCounts()),
  );

  server.tool(
    "notifications.mark_read",
    "Mark a specific notification as read.",
    { id: z.string().describe("Notification ID") },
    async ({ id }) =>
      tryAction(
        () => api.markNotificationRead(id),
        () => `Notification ${id} marked as read.`,
      ),
  );

  server.tool(
    "notifications.mark_all_read",
    "Mark all notifications as read in the workspace.",
    {},
    async () =>
      tryAction(
        () => api.markAllNotificationsRead(),
        () => "All notifications marked as read.",
      ),
  );
}
