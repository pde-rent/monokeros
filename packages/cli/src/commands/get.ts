/**
 * mk get <resource> [name] — list or retrieve resources.
 *
 * Aligned with MCP actions:
 *   mk get members     → members.list
 *   mk get teams       → teams.list
 *   mk get projects    → projects.list
 *   mk get tasks       → tasks.list
 *   mk get conv        → conversations.list
 *   mk get runtimes    → agents.list_runtimes
 *   mk get providers   → workspace.list_providers
 *   mk get ws          → workspaces.getConfig (single)
 *
 * Supports -o table|wide|json|yaml|name
 */

import { Command } from "commander";
import pc from "picocolors";
import type { Member } from "@monokeros/types";
import { getClient } from "../client";
import { resolveResource } from "../resources";
import { Formatter, describe, type OutputFormat } from "../fmt/formatter";
import {
  MEMBER_COLUMNS,
  TEAM_COLUMNS,
  PROJECT_COLUMNS,
  TASK_COLUMNS,
  CONVERSATION_COLUMNS,
  RUNTIME_COLUMNS,
  PROVIDER_COLUMNS,
  WORKSPACE_DESCRIBE,
} from "../fmt/columns";

export function registerGetCommand(program: Command): void {
  program
    .command("get <resource> [name]")
    .description("List resources or get a specific one by name/ID")
    .option("-o, --output <format>", "Output format: table, wide, json, yaml, name", "table")
    .option("--project <id>", "Filter tasks by project ID")
    .option("--status <status>", "Filter by status")
    .option("--assignee <id>", "Filter tasks by assignee ID")
    .option("--type <type>", "Filter by type (member type, project type)")
    .option("--search <query>", "Search filter (projects)")
    .action(async (resource: string, name: string | undefined, opts: Record<string, string>) => {
      const res = resolveResource(resource);
      if (!res) {
        console.error(pc.red(`Unknown resource "${resource}". Run: mk api-resources`));
        process.exit(1);
      }

      const client = getClient();
      const output = opts.output as OutputFormat;
      const isAgentAlias = res.aliases?.includes(resource.toLowerCase()) &&
        (resource.toLowerCase() === "agents" || resource.toLowerCase() === "ag");

      try {
        switch (res.name) {
          case "members": {
            let items = await client.listMembers();
            if (opts.type) {
              items = items.filter((m: Member) => m.type === opts.type);
            } else if (isAgentAlias) {
              items = items.filter((m: Member) => m.type === "agent");
            }
            if (name) {
              items = items.filter((m: Member) =>
                m.name === name || m.id === name || m.name.toLowerCase() === name.toLowerCase(),
              );
            }
            console.log(new Formatter(MEMBER_COLUMNS).format(items, output));
            break;
          }

          case "teams": {
            let items = await client.listTeams();
            if (name) {
              items = items.filter((t) =>
                t.name === name || t.id === name || t.name.toLowerCase() === name.toLowerCase(),
              );
            }
            console.log(new Formatter(TEAM_COLUMNS).format(items, output));
            break;
          }

          case "projects": {
            const params: Record<string, string> = {};
            if (opts.status) params.status = opts.status;
            if (opts.type) params.type = opts.type;
            if (opts.search) params.search = opts.search;
            let items = await client.listProjects(params);
            if (name) {
              items = items.filter((p) =>
                p.name === name || p.slug === name || p.id === name || p.name.toLowerCase() === name.toLowerCase(),
              );
            }
            console.log(new Formatter(PROJECT_COLUMNS).format(items, output));
            break;
          }

          case "tasks": {
            const params: Record<string, string> = {};
            if (opts.project) params.projectId = opts.project;
            if (opts.status) params.status = opts.status;
            if (opts.assignee) params.assigneeId = opts.assignee;
            let items = await client.listTasks(params);
            if (name) {
              items = items.filter((t) =>
                t.title === name || t.slug === name || t.id === name || t.title.toLowerCase() === name.toLowerCase(),
              );
            }
            console.log(new Formatter(TASK_COLUMNS).format(items, output));
            break;
          }

          case "conversations": {
            let items = await client.listConversations();
            if (name) {
              items = items.filter((c) =>
                c.title === name || c.id === name || c.title.toLowerCase() === name.toLowerCase(),
              );
            }
            console.log(new Formatter(CONVERSATION_COLUMNS).format(items, output));
            break;
          }

          case "runtimes": {
            let items = await client.listAgentRuntimes();
            if (name) {
              items = items.filter((r) => r.memberId === name);
            }
            console.log(new Formatter(RUNTIME_COLUMNS).format(items, output));
            break;
          }

          case "providers": {
            let items = await client.getWorkspaceProviders();
            if (name) {
              items = items.filter((p) => p.provider === name);
            }
            console.log(new Formatter(PROVIDER_COLUMNS).format(items, output));
            break;
          }

          case "workspaces": {
            if (output === "json" || output === "yaml") {
              const ws = await client.getWorkspace();
              console.log(new Formatter([]).formatOne(ws, output));
            } else {
              const ws = await client.getWorkspace();
              console.log(describe(ws, WORKSPACE_DESCRIBE));
            }
            break;
          }

          default:
            console.error(pc.red(`"get" is not supported for resource "${res.name}".`));
            process.exit(1);
        }
      } catch (err) {
        console.error(pc.red(err instanceof Error ? err.message : String(err)));
        process.exit(1);
      }
    });
}
