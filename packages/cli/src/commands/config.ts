/**
 * mk config — manage CLI configuration contexts.
 *
 * Subcommands:
 *   mk config view                    Show current config
 *   mk config current-context         Print current context name
 *   mk config use-context <name>      Switch active context
 *   mk config set-context <name>      Create or update a context
 *   mk config delete-context <name>   Remove a context
 *   mk config get-contexts            List all contexts
 */

import { Command } from "commander";
import pc from "picocolors";
import YAML from "yaml";
import {
  loadConfig,
  saveConfig,
  configPath,
  type MkConfig,
  type MkContext,
} from "../config";

export function registerConfigCommand(program: Command): void {
  const cmd = program
    .command("config")
    .description("Manage CLI configuration and contexts");

  cmd
    .command("view")
    .description("Display the current configuration")
    .action(() => {
      const config = loadConfig();
      console.log(pc.dim(`# ${configPath()}`));
      console.log(YAML.stringify(config, { lineWidth: 120 }));
    });

  cmd
    .command("current-context")
    .description("Print the current context name")
    .action(() => {
      const config = loadConfig();
      console.log(config["current-context"]);
    });

  cmd
    .command("use-context <name>")
    .description("Switch the active context")
    .action((name: string) => {
      const config = loadConfig();
      const exists = config.contexts.find((c) => c.name === name);
      if (!exists) {
        console.error(pc.red(`Context "${name}" not found.`));
        console.error(`Available: ${config.contexts.map((c) => c.name).join(", ")}`);
        process.exit(1);
      }
      config["current-context"] = name;
      saveConfig(config);
      console.log(`Switched to context "${pc.bold(name)}".`);
    });

  cmd
    .command("set-context <name>")
    .description("Create or update a context")
    .option("-s, --server <url>", "API server URL")
    .option("-w, --workspace <slug>", "Workspace slug")
    .option("-k, --api-key <key>", "API key")
    .option("--container-service <url>", "Container service URL")
    .action((name: string, opts: Record<string, string>) => {
      const config = loadConfig();
      let ctx = config.contexts.find((c) => c.name === name);
      if (!ctx) {
        ctx = {
          name,
          server: "http://localhost:3211",
          workspace: "",
          "api-key": "",
        };
        config.contexts.push(ctx);
      }
      if (opts.server) ctx.server = opts.server;
      if (opts.workspace) ctx.workspace = opts.workspace;
      if (opts.apiKey) ctx["api-key"] = opts.apiKey;
      if (opts.containerService) ctx["container-service"] = opts.containerService;
      saveConfig(config);
      console.log(`Context "${pc.bold(name)}" configured.`);
    });

  cmd
    .command("delete-context <name>")
    .description("Remove a context")
    .action((name: string) => {
      const config = loadConfig();
      const idx = config.contexts.findIndex((c) => c.name === name);
      if (idx === -1) {
        console.error(pc.red(`Context "${name}" not found.`));
        process.exit(1);
      }
      if (config["current-context"] === name) {
        console.error(pc.red("Cannot delete the active context. Switch first."));
        process.exit(1);
      }
      config.contexts.splice(idx, 1);
      saveConfig(config);
      console.log(`Context "${name}" deleted.`);
    });

  cmd
    .command("get-contexts")
    .description("List all configured contexts")
    .action(() => {
      const config = loadConfig();
      for (const ctx of config.contexts) {
        const marker = ctx.name === config["current-context"] ? pc.green("*") : " ";
        console.log(`${marker} ${pc.bold(ctx.name)}  ${pc.dim(ctx.server)}  ${ctx.workspace || pc.dim("(no workspace)")}`);
      }
    });
}
