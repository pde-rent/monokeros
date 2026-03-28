/**
 * mk create <resource> — create a new resource.
 *
 * Aligned with MCP actions:
 *   mk create member --name scout --title "Scout" --team <id>  → members.create
 *   mk create team --name dev --type engineering --color "#10b981" --lead <id>  → teams.create
 *   mk create project --name "My Project" --type feature  → projects.create
 *   mk create task --title "Fix bug" --project <id> --team <id> --phase dev  → tasks.create
 *   mk create conversation --participants <id1,id2>  → conversations.create
 */

import { Command } from "commander";
import pc from "picocolors";
import YAML from "yaml";
import { getClient } from "../client";
import { resolveResource } from "../resources";

export function registerCreateCommand(program: Command): void {
  const cmd = program
    .command("create <resource>")
    .description("Create a new resource")
    .option("-o, --output <format>", "Output format: json, yaml, name", "name")

    // Member fields
    .option("--name <name>", "Resource name")
    .option("--title <title>", "Member title / job role")
    .option("--specialization <spec>", "Member specialization")
    .option("--team <teamId>", "Team ID")
    .option("--type <type>", "Resource type (member type, team type, project type)")
    .option("--soul <soul>", "Agent identity soul text")
    .option("--skills <skills>", "Comma-separated agent skills")

    // Team fields
    .option("--color <color>", "Team/project color (hex)")
    .option("--lead <leadId>", "Team lead member ID")

    // Project fields
    .option("--description <desc>", "Description")
    .option("--phases <phases>", "Comma-separated phase list")

    // Task fields
    .option("--project <projectId>", "Project ID (for tasks)")
    .option("--priority <priority>", "Task priority: critical, high, medium, low, none")
    .option("--phase <phase>", "Task phase")
    .option("--assignees <ids>", "Comma-separated assignee IDs")

    // Conversation fields
    .option("--participants <ids>", "Comma-separated participant member IDs")
    .option("--conversation-title <title>", "Conversation title (for group chats)")

    .action(async (resource: string, opts: Record<string, string>) => {
      const res = resolveResource(resource);
      if (!res) {
        console.error(pc.red(`Unknown resource "${resource}".`));
        process.exit(1);
      }

      const client = getClient();

      try {
        switch (res.name) {
          case "members": {
            if (!opts.name || !opts.title || !opts.team) {
              console.error(pc.red("Required: --name, --title, --team"));
              process.exit(1);
            }
            const body: Record<string, unknown> = {
              name: opts.name,
              title: opts.title,
              specialization: opts.specialization ?? opts.title,
              teamId: opts.team,
              type: opts.type ?? "agent",
            };
            if (opts.soul || opts.skills) {
              body.identity = {
                soul: opts.soul ?? "",
                skills: opts.skills ? opts.skills.split(",").map((s) => s.trim()) : [],
                memory: [],
              };
            }
            const item = await client.createMember(body);
            printResult(item, opts.output, "member", item.name);
            break;
          }

          case "teams": {
            if (!opts.name || !opts.type || !opts.lead) {
              console.error(pc.red("Required: --name, --type, --lead"));
              process.exit(1);
            }
            const item = await client.createTeam({
              name: opts.name,
              type: opts.type,
              color: opts.color ?? "#8b5cf6",
              leadId: opts.lead,
            });
            printResult(item, opts.output, "team", item.name);
            break;
          }

          case "projects": {
            if (!opts.name) {
              console.error(pc.red("Required: --name"));
              process.exit(1);
            }
            const body: Record<string, unknown> = {
              name: opts.name,
              types: opts.type ? opts.type.split(",").map((s) => s.trim()) : ["feature"],
            };
            if (opts.description) body.description = opts.description;
            if (opts.color) body.color = opts.color;
            if (opts.phases) body.phases = opts.phases.split(",").map((s) => s.trim());
            const item = await client.createProject(body);
            printResult(item, opts.output, "project", item.name);
            break;
          }

          case "tasks": {
            if (!opts.title || !opts.project || !opts.team) {
              console.error(pc.red("Required: --title, --project, --team"));
              process.exit(1);
            }
            const body: Record<string, unknown> = {
              title: opts.title,
              projectId: opts.project,
              teamId: opts.team,
              phase: opts.phase ?? "",
            };
            if (opts.description) body.description = opts.description;
            if (opts.priority) body.priority = opts.priority;
            if (opts.type) body.type = opts.type;
            if (opts.assignees) body.assigneeIds = opts.assignees.split(",").map((s) => s.trim());
            const item = await client.createTask(body);
            printResult(item, opts.output, "task", item.title);
            break;
          }

          case "conversations": {
            if (!opts.participants) {
              console.error(pc.red("Required: --participants <id1,id2,...>"));
              process.exit(1);
            }
            const body: Record<string, unknown> = {
              participantIds: opts.participants.split(",").map((s) => s.trim()),
            };
            if (opts.conversationTitle) body.title = opts.conversationTitle;
            const result = await client.createConversation(body as { participantIds: string[]; title?: string });
            const item = result.conversation;
            printResult(item, opts.output, "conversation", item.title);
            break;
          }

          default:
            console.error(pc.red(`"create" is not supported for resource "${res.name}".`));
            process.exit(1);
        }
      } catch (err) {
        console.error(pc.red(err instanceof Error ? err.message : String(err)));
        process.exit(1);
      }
    });
}

function printResult(item: unknown, format: string, kind: string, name: string): void {
  if (format === "json") {
    console.log(JSON.stringify(item, null, 2));
  } else if (format === "yaml") {
    console.log(YAML.stringify(item, { lineWidth: 120 }));
  } else {
    console.log(`${kind}/${name} created`);
  }
}
