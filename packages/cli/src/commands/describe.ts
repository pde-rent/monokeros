/**
 * mk describe <resource> <name|id> — detailed view of a single resource.
 *
 * Aligned with MCP actions:
 *   mk describe member <id>   → members.get
 *   mk describe team <id>     → teams.get
 *   mk describe project <id>  → projects.get
 *   mk describe task <id>     → tasks.get
 *   mk describe conv <id>     → conversations.get
 */

import { Command } from "commander";
import pc from "picocolors";
import { getClient } from "../client";
import { resolveResource } from "../resources";
import { printDescribe, type OutputFormat } from "../fmt/formatter";
import {
  MEMBER_DESCRIBE,
  TEAM_DESCRIBE,
  PROJECT_DESCRIBE,
  TASK_DESCRIBE,
  CONVERSATION_DESCRIBE,
  WORKSPACE_DESCRIBE,
} from "../fmt/columns";

export function registerDescribeCommand(program: Command): void {
  program
    .command("describe <resource> <id>")
    .description("Show detailed information about a resource")
    .option("-o, --output <format>", "Output format: describe, json, yaml", "describe")
    .action(async (resource: string, id: string, opts: Record<string, string>) => {
      const res = resolveResource(resource);
      if (!res) {
        console.error(pc.red(`Unknown resource "${resource}".`));
        process.exit(1);
      }

      const client = getClient();
      const output = opts.output as OutputFormat;

      try {
        switch (res.name) {
          case "members": {
            const item = await client.getMember(id);
            printDescribe(item, MEMBER_DESCRIBE, output);
            break;
          }

          case "teams": {
            const item = await client.getTeam(id);
            printDescribe(item, TEAM_DESCRIBE, output);
            break;
          }

          case "projects": {
            const item = await client.getProject(id);
            printDescribe(item, PROJECT_DESCRIBE, output);
            break;
          }

          case "tasks": {
            const item = await client.getTask(id);
            printDescribe(item, TASK_DESCRIBE, output);
            break;
          }

          case "conversations": {
            const item = await client.getConversation(id);
            printDescribe(item, CONVERSATION_DESCRIBE, output);

            // Show recent messages in describe mode
            if (output !== "json" && output !== "yaml" && item.messages && item.messages.length > 0) {
              console.log(`\n${pc.bold("Messages")}:`);
              const recent = item.messages.slice(-10);
              for (const msg of recent) {
                const role = msg.role === "agent" ? pc.cyan(msg.role) : pc.green(msg.role);
                const time = pc.dim(msg.timestamp);
                const content = msg.content.length > 200
                  ? msg.content.slice(0, 200) + "…"
                  : msg.content;
                console.log(`  ${time} ${role}: ${content}`);
              }
              if (item.messages.length > 10) {
                console.log(pc.dim(`  ... ${item.messages.length - 10} earlier messages`));
              }
            }
            break;
          }

          case "workspaces": {
            const item = await client.getWorkspace();
            printDescribe(item, WORKSPACE_DESCRIBE, output);
            break;
          }

          default:
            console.error(pc.red(`"describe" is not supported for resource "${res.name}".`));
            process.exit(1);
        }
      } catch (err) {
        console.error(pc.red(err instanceof Error ? err.message : String(err)));
        process.exit(1);
      }
    });
}
