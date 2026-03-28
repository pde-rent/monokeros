/**
 * mk apply -f <file> — declarative resource management via YAML manifests.
 *
 * Reads a manifest file (YAML) and creates/updates the resource based on
 * its kind. Aligns with the manifest system in @monokeros/types/manifests.
 *
 * Supported kinds: Agent, Team, Project, Workspace
 */

import { Command } from "commander";
import { readFileSync } from "node:fs";
import pc from "picocolors";
import YAML from "yaml";
import { getClient } from "../client";

interface Manifest {
  apiVersion: string;
  kind: string;
  metadata: { name: string; namespace?: string; labels?: Record<string, string> };
  spec: Record<string, unknown>;
}

export function registerApplyCommand(program: Command): void {
  program
    .command("apply")
    .description("Apply a manifest file to create or update resources")
    .requiredOption("-f, --file <path>", "Path to YAML manifest file")
    .option("-o, --output <format>", "Output format: name, json, yaml", "name")
    .action(async (opts: { file: string; output: string }) => {
      let raw: string;
      try {
        raw = readFileSync(opts.file, "utf-8");
      } catch {
        console.error(pc.red(`Cannot read file: ${opts.file}`));
        process.exit(1);
      }

      const docs = YAML.parseAllDocuments(raw);
      for (const doc of docs) {
        const manifest = doc.toJSON() as Manifest;
        if (!manifest || !manifest.kind || !manifest.metadata?.name) {
          console.error(pc.red("Invalid manifest: missing kind or metadata.name"));
          process.exit(1);
        }
        await applyManifest(manifest, opts.output);
      }
    });
}

async function applyManifest(manifest: Manifest, output: string): Promise<void> {
  const client = getClient();
  const { kind, metadata, spec } = manifest;

  try {
    switch (kind) {
      case "Agent": {
        // Try to find existing member by name, update if exists, create if not
        const members = await client.listMembers();
        const existing = members.find(
          (m: { name: string; id: string }) => m.name === metadata.name || m.id === metadata.name,
        );

        if (existing) {
          await client.updateMember(existing.id, spec);
          printApplyResult(output, kind, metadata.name, "configured");
        } else {
          const body = {
            name: metadata.name,
            ...spec,
          };
          await client.createMember(body);
          printApplyResult(output, kind, metadata.name, "created");
        }
        break;
      }

      case "Team": {
        const teams = await client.listTeams();
        const existing = teams.find(
          (t: { name: string; id: string }) => t.name === metadata.name || t.id === metadata.name,
        );

        if (existing) {
          await client.updateTeam(existing.id, spec);
          printApplyResult(output, kind, metadata.name, "configured");
        } else {
          await client.createTeam({ name: metadata.name, ...spec });
          printApplyResult(output, kind, metadata.name, "created");
        }
        break;
      }

      case "Project": {
        const projects = await client.listProjects();
        const existing = projects.find(
          (p: { name: string; slug: string; id: string }) => p.name === metadata.name || p.slug === metadata.name || p.id === metadata.name,
        );

        if (existing) {
          await client.updateProject(existing.id, spec);
          printApplyResult(output, kind, metadata.name, "configured");
        } else {
          await client.createProject({ name: metadata.name, ...spec });
          printApplyResult(output, kind, metadata.name, "created");
        }
        break;
      }

      case "Workspace": {
        await client.updateWorkspace(spec);
        printApplyResult(output, kind, metadata.name, "configured");
        break;
      }

      default:
        console.error(pc.red(`Unsupported manifest kind: ${kind}`));
        process.exit(1);
    }
  } catch (err) {
    console.error(pc.red(`Failed to apply ${kind}/${metadata.name}: ${err instanceof Error ? err.message : String(err)}`));
    process.exit(1);
  }
}

function printApplyResult(format: string, kind: string, name: string, action: string): void {
  if (format === "json") {
    console.log(JSON.stringify({ kind, name, action }));
  } else if (format === "yaml") {
    console.log(YAML.stringify({ kind, name, action }));
  } else {
    console.log(`${kind.toLowerCase()}/${name} ${action}`);
  }
}
