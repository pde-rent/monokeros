/**
 * mk agents — agent lifecycle management.
 *
 * Subcommands:
 *   mk agents start <id>           Start an agent container
 *   mk agents stop <id>            Stop an agent container
 *   mk agents restart <id>         Restart an agent container
 *   mk agents status <id>          Get agent runtime status
 *   mk agents logs <id> [--follow] View agent logs (via container service)
 *   mk agents top                  Resource monitoring (CPU, RAM, windows)
 *
 * Aligned with MCP actions:
 *   start → members.start_agent
 *   stop  → members.stop_agent
 *   status → agents.get_runtime
 */

import { Command } from "commander";
import pc from "picocolors";
import YAML from "yaml";
import { getClient, containerServiceUrl } from "../client";
import { Formatter, type OutputFormat, type ColumnDef } from "../fmt/formatter";
import { RUNTIME_COLUMNS } from "../fmt/columns";

export function registerAgentsCommand(program: Command): void {
  const cmd = program
    .command("agents")
    .description("Agent container lifecycle management");

  cmd
    .command("list")
    .description("List all agent runtimes")
    .option("-o, --output <format>", "Output format: table, wide, json, yaml", "table")
    .action(async (opts: { output: string }) => {
      try {
        const client = getClient();
        const items = await client.listAgentRuntimes();
        console.log(new Formatter(RUNTIME_COLUMNS).format(items, opts.output as OutputFormat));
      } catch (err) {
        console.error(pc.red(err instanceof Error ? err.message : String(err)));
        process.exit(1);
      }
    });

  cmd
    .command("start <id>")
    .description("Start an agent container")
    .action(async (id: string) => {
      const client = getClient();
      try {
        const runtime = await client.startAgent(id);
        console.log(`agent/${id} started`);
        console.log(pc.dim(`  Container: ${runtime.containerId ?? "-"}`));
        console.log(pc.dim(`  VNC port:  ${runtime.vncPort ?? "-"}`));
        console.log(pc.dim(`  Status:    ${runtime.status}`));
      } catch (err) {
        console.error(pc.red(err instanceof Error ? err.message : String(err)));
        process.exit(1);
      }
    });

  cmd
    .command("stop <id>")
    .description("Stop an agent container")
    .action(async (id: string) => {
      const client = getClient();
      try {
        await client.stopAgent(id);
        console.log(`agent/${id} stopped`);
      } catch (err) {
        console.error(pc.red(err instanceof Error ? err.message : String(err)));
        process.exit(1);
      }
    });

  cmd
    .command("restart <id>")
    .description("Restart an agent container")
    .action(async (id: string) => {
      const client = getClient();
      try {
        await client.stopAgent(id);
        const runtime = await client.startAgent(id);
        console.log(`agent/${id} restarted`);
        console.log(pc.dim(`  Container: ${runtime.containerId ?? "-"}`));
        console.log(pc.dim(`  Status:    ${runtime.status}`));
      } catch (err) {
        console.error(pc.red(err instanceof Error ? err.message : String(err)));
        process.exit(1);
      }
    });

  cmd
    .command("status <id>")
    .description("Get detailed runtime status for an agent")
    .option("-o, --output <format>", "Output format: text, json, yaml", "text")
    .action(async (id: string, opts: { output: string }) => {
      const client = getClient();
      try {
        const runtime = await client.getMemberRuntime(id);

        if (opts.output === "json") {
          console.log(JSON.stringify(runtime, null, 2));
          return;
        }
        if (opts.output === "yaml") {
          console.log(YAML.stringify(runtime, { lineWidth: 120 }));
          return;
        }

        console.log(`${pc.bold("Agent")}:       ${runtime.memberId}`);
        console.log(`${pc.bold("Status")}:      ${runtime.status}`);
        console.log(`${pc.bold("Container")}:   ${runtime.containerId ?? "-"}`);
        console.log(`${pc.bold("Name")}:        ${runtime.containerName ?? "-"}`);
        console.log(`${pc.bold("VNC Port")}:    ${runtime.vncPort ?? "-"}`);
        console.log(`${pc.bold("OpenClaw")}:    ${runtime.openclawUrl ?? "-"}`);
        console.log(`${pc.bold("Lifecycle")}:   ${runtime.lifecycle}`);
        console.log(`${pc.bold("Health")}:      ${runtime.lastHealthCheck ?? "-"}`);
        if (runtime.error) {
          console.log(`${pc.bold("Error")}:       ${pc.red(runtime.error)}`);
        }
        console.log(`${pc.bold("Retries")}:     ${runtime.retryCount}`);

        // Also fetch live stats from container service
        try {
          const stats = await fetchStats(id);
          if (stats) {
            console.log(`\n${pc.bold("Resources")}:`);
            console.log(`  CPU:     ${stats.cpuPercent.toFixed(1)}%`);
            console.log(`  Memory:  ${stats.memoryMb.toFixed(0)} MB`);
            if (stats.windows.length > 0) {
              console.log(`  Windows: ${stats.windows.join(", ")}`);
            }
          }
        } catch {
          // Container service might not be available
        }
      } catch (err) {
        console.error(pc.red(err instanceof Error ? err.message : String(err)));
        process.exit(1);
      }
    });

  cmd
    .command("top")
    .description("Display resource usage for all running agents")
    .option("--watch", "Refresh every 5 seconds")
    .action(async (opts: { watch?: boolean }) => {
      const printTop = async () => {
        const client = getClient();
        const runtimes = await client.listAgentRuntimes();
        const running = runtimes.filter((r: { status: string }) => r.status === "running");

        if (running.length === 0) {
          console.log("No running agents.");
          return;
        }

        // Fetch stats from container service for each running agent
        const rows: TopRow[] = [];
        for (const rt of running) {
          const stats = await fetchStats(rt.memberId);
          rows.push({
            agent: rt.memberId,
            status: rt.status,
            container: rt.containerId?.slice(0, 12) ?? "-",
            cpu: stats ? `${stats.cpuPercent.toFixed(1)}%` : "-",
            memory: stats ? `${stats.memoryMb.toFixed(0)} MB` : "-",
            windows: stats?.windows.join(", ") ?? "-",
            lifecycle: rt.lifecycle,
          });
        }

        const topColumns: ColumnDef<TopRow>[] = [
          { header: "AGENT", value: (r) => r.agent },
          { header: "STATUS", value: (r) => r.status, color: (r) => r.status === "running" ? pc.green(r.status) : r.status },
          { header: "CONTAINER", value: (r) => r.container },
          { header: "CPU", value: (r) => r.cpu },
          { header: "MEMORY", value: (r) => r.memory },
          { header: "WINDOWS", value: (r) => r.windows },
          { header: "LIFECYCLE", value: (r) => r.lifecycle },
        ];

        if (opts.watch) {
          process.stdout.write("\x1B[2J\x1B[H"); // clear screen
          console.log(pc.dim(new Date().toLocaleTimeString()));
        }
        console.log(new Formatter(topColumns).format(rows, "table"));
      };

      try {
        await printTop();

        if (opts.watch) {
          setInterval(printTop, 5000);
        }
      } catch (err) {
        console.error(pc.red(err instanceof Error ? err.message : String(err)));
        process.exit(1);
      }
    });
}

interface TopRow {
  agent: string;
  status: string;
  container: string;
  cpu: string;
  memory: string;
  windows: string;
  lifecycle: string;
}

interface ContainerStats {
  cpuPercent: number;
  memoryMb: number;
  windows: string[];
  updatedAt: string | null;
}

async function fetchStats(agentId: string): Promise<ContainerStats | null> {
  const base = containerServiceUrl();
  try {
    const res = await fetch(`${base}/containers/${agentId}/stats`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    return (await res.json()) as ContainerStats;
  } catch {
    return null;
  }
}
