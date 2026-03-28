/**
 * mk delete <resource> <id> — delete a resource.
 *
 * Aligned with MCP actions:
 *   mk delete team <id>    → teams.delete
 *   mk delete task <id>    → (via tasks.update with archived/done)
 *   mk delete file <path>  → files.delete
 */

import { Command } from "commander";
import pc from "picocolors";
import { getClient } from "../client";
import { resolveResource } from "../resources";

export function registerDeleteCommand(program: Command): void {
  program
    .command("delete <resource> <id>")
    .description("Delete a resource by ID")
    .option("--drive-type <type>", "Drive type for file deletion: member, team, project, workspace")
    .option("--drive-owner <id>", "Drive owner ID for file deletion")
    .action(async (resource: string, id: string, opts: Record<string, string | boolean>) => {
      const res = resolveResource(resource);
      if (!res) {
        console.error(pc.red(`Unknown resource "${resource}".`));
        process.exit(1);
      }

      const client = getClient();

      try {
        switch (res.name) {
          case "teams": {
            await client.deleteTeam(id);
            console.log(`team/${id} deleted`);
            break;
          }

          case "files": {
            if (!opts.driveType || !opts.driveOwner) {
              console.error(pc.red("Required: --drive-type <type> --drive-owner <id>"));
              process.exit(1);
            }
            await client.deleteFile(opts.driveType as string, opts.driveOwner as string, id);
            console.log(`file/${id} deleted`);
            break;
          }

          case "providers": {
            await client.removeWorkspaceProvider(id);
            console.log(`provider/${id} removed`);
            break;
          }

          default:
            console.error(pc.red(`"delete" is not supported for resource "${res.name}".`));
            process.exit(1);
        }
      } catch (err) {
        console.error(pc.red(err instanceof Error ? err.message : String(err)));
        process.exit(1);
      }
    });
}
