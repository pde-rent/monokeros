import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DEFAULT_ENTITY_COLOR } from "@monokeros/constants";
import type { ApiClient } from "../api-client";
import { cleanUpdate, tryAction, withResult } from "./utils";

export function registerTeamTools(server: McpServer, api: ApiClient) {
  server.tool(
    "teams.list",
    "List all teams in the workspace. Returns team name, type, color, lead, and member IDs.",
    {},
    async () => withResult(() => api.listTeams()),
  );

  server.tool(
    "teams.get",
    "Get a team by ID with full member details.",
    { id: z.string().describe("Team ID") },
    async ({ id }) => withResult(() => api.getTeam(id)),
  );

  server.tool(
    "teams.create",
    "Create a new team. Requires name, type, color, and a lead member ID.",
    {
      name: z.string().describe("Team name"),
      type: z.string().describe("Team type (e.g. engineering, design, qa)"),
      color: z.string().default(DEFAULT_ENTITY_COLOR).describe("Hex color (e.g. #6366f1)"),
      leadId: z.string().describe("Member ID of the team lead"),
      memberIds: z.array(z.string()).default([]).describe("Initial member IDs"),
    },
    async ({ name, type, color, leadId, memberIds }) =>
      tryAction(
        () => api.createTeam({ name, type, color, leadId, memberIds }),
        (team) => `Team created: ${team.name} (${team.id})`,
      ),
  );

  server.tool(
    "teams.update",
    "Update a team's fields (name, type, color, lead, members).",
    {
      id: z.string().describe("Team ID"),
      name: z.string().optional().describe("New team name"),
      type: z.string().optional().describe("New team type"),
      color: z.string().optional().describe("New hex color"),
      leadId: z.string().optional().describe("New lead member ID"),
      memberIds: z.array(z.string()).optional().describe("New member IDs"),
    },
    async ({ id, ...updates }) =>
      tryAction(
        () => api.updateTeam(id, cleanUpdate(updates)),
        (team) => `Team updated: ${team.name} (${team.id})`,
      ),
  );

  server.tool(
    "teams.delete",
    "Delete a team by ID.",
    { id: z.string().describe("Team ID to delete") },
    async ({ id }) =>
      tryAction(
        () => api.deleteTeam(id),
        (r) => (r.success ? `Team ${id} deleted.` : `Failed to delete team ${id}.`),
      ),
  );
}
