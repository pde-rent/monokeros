/**
 * mk files — file and drive management.
 *
 * Subcommands:
 *   mk files drives                   List all drives
 *   mk files ls <driveType> <owner>   List files in a drive
 *   mk files cat <driveType> <owner> <path>  Read file content
 *   mk files tree <driveType> <owner>        Display file tree
 *   mk files create <driveType> <owner> --name <name>  Create a file
 *   mk files write <driveType> <owner> <path>         Write content to a file
 *   mk files mkdir <driveType> <owner> --name <name>   Create a folder
 *   mk files mv <driveType> <owner> <path> --name <n>  Rename a file/folder
 *   mk files rm <driveType> <owner> <path>   Delete a file or folder
 *
 * Drive types: member, team, project, workspace
 *
 * Aligned with MCP actions:
 *   drives → files.list_drives
 *   cat    → files.read
 *   create → files.create
 *   mkdir  → files.create_folder
 *   rm     → files.delete
 */

import { Command } from "commander";
import pc from "picocolors";
import { getClient } from "../client";
import { tree as renderTree, type TreeNode } from "../fmt/formatter";
import type { FileEntry } from "@monokeros/types";

export function registerFilesCommand(program: Command): void {
  const cmd = program
    .command("files")
    .description("File and drive management");

  cmd
    .command("drives")
    .description("List all drives in the workspace")
    .option("-o, --output <format>", "Output format: text, json", "text")
    .action(async (opts: { output: string }) => {
      try {
        const client = getClient();
        const listing = await client.listDrives();

        if (opts.output === "json") {
          console.log(JSON.stringify(listing, null, 2));
          return;
        }

        if (listing.workspaceDrive) {
          console.log(`${pc.bold("workspace")}  ${listing.workspaceDrive.name}  ${pc.dim(listing.workspaceDrive.rootPath)}`);
        }
        for (const d of listing.teamDrives) {
          console.log(`${pc.bold("team")}       ${d.name}  ${pc.dim(`id=${d.teamId}`)}`);
        }
        for (const d of listing.memberDrives) {
          console.log(`${pc.bold("member")}     ${d.memberName}  ${pc.dim(`id=${d.memberId}`)}`);
        }
        for (const d of listing.projectDrives) {
          console.log(`${pc.bold("project")}    ${d.name}  ${pc.dim(`id=${d.projectId}`)}`);
        }
      } catch (err) {
        console.error(pc.red(err instanceof Error ? err.message : String(err)));
        process.exit(1);
      }
    });

  cmd
    .command("ls <driveType> <ownerId> [path]")
    .description("List files in a drive")
    .option("-l, --long", "Show detailed listing")
    .option("-o, --output <format>", "Output format: text, json", "text")
    .action(async (driveType: string, ownerId: string, path: string | undefined, opts: { long?: boolean; output: string }) => {
      try {
        const client = getClient();
        const listing = await client.listDrives();

        const files = findDriveFiles(listing, driveType, ownerId);
        if (!files) {
          console.error(pc.red(`Drive not found: ${driveType}/${ownerId}`));
          process.exit(1);
        }

        // Navigate to path if specified
        let entries: FileEntry[] = files;
        if (path) {
          const nav = navigateToPath(files, path);
          if (!nav) {
            console.error(pc.red(`Path not found: ${path}`));
            process.exit(1);
          }
          entries = nav;
        }

        if (opts.output === "json") {
          console.log(JSON.stringify(entries, null, 2));
          return;
        }

        for (const entry of entries) {
          if (opts.long) {
            const size = entry.type === "directory" ? pc.dim("-") : formatSize(entry.size);
            const time = pc.dim(new Date(entry.modifiedAt).toLocaleDateString());
            const name = entry.type === "directory" ? pc.bold(entry.name + "/") : entry.name;
            console.log(`${size.padStart(8)}  ${time}  ${name}`);
          } else {
            const name = entry.type === "directory" ? pc.bold(entry.name + "/") : entry.name;
            process.stdout.write(name + "  ");
          }
        }
        if (!opts.long) process.stdout.write("\n");
      } catch (err) {
        console.error(pc.red(err instanceof Error ? err.message : String(err)));
        process.exit(1);
      }
    });

  cmd
    .command("cat <driveType> <ownerId> <path>")
    .description("Read file content")
    .action(async (driveType: string, ownerId: string, path: string) => {
      const client = getClient();
      try {
        const file = await client.readFile(driveType, ownerId, path);
        console.log(file.content);
      } catch (err) {
        console.error(pc.red(err instanceof Error ? err.message : String(err)));
        process.exit(1);
      }
    });

  cmd
    .command("tree <driveType> <ownerId>")
    .description("Display file tree for a drive")
    .action(async (driveType: string, ownerId: string) => {
      try {
        const client = getClient();
        const listing = await client.listDrives();

        const files = findDriveFiles(listing, driveType, ownerId);
        if (!files) {
          console.error(pc.red(`Drive not found: ${driveType}/${ownerId}`));
          process.exit(1);
        }

        const root = buildTreeNode(`${driveType}/${ownerId}`, files);
        console.log(renderTree(root));
      } catch (err) {
        console.error(pc.red(err instanceof Error ? err.message : String(err)));
        process.exit(1);
      }
    });

  cmd
    .command("create <driveType> <ownerId>")
    .description("Create a new file")
    .requiredOption("--name <name>", "File name")
    .option("--ext <ext>", "File extension")
    .option("--content <content>", "File content")
    .option("--dir <dir>", "Parent directory path")
    .action(async (driveType: string, ownerId: string, opts: { name: string; ext?: string; content?: string; dir?: string }) => {
      const client = getClient();
      try {
        const body: { name: string; extension?: string; content?: string } = { name: opts.name };
        if (opts.ext) body.extension = opts.ext;
        if (opts.content) body.content = opts.content;
        const file = await client.createFile(driveType, ownerId, body, opts.dir);
        console.log(`file/${file.path} created`);
      } catch (err) {
        console.error(pc.red(err instanceof Error ? err.message : String(err)));
        process.exit(1);
      }
    });

  cmd
    .command("mkdir <driveType> <ownerId>")
    .description("Create a new folder")
    .requiredOption("--name <name>", "Folder name")
    .option("--dir <dir>", "Parent directory path")
    .action(async (driveType: string, ownerId: string, opts: { name: string; dir?: string }) => {
      const client = getClient();
      try {
        const folder = await client.createFolder(driveType, ownerId, opts.name, opts.dir);
        console.log(`folder/${folder.path} created`);
      } catch (err) {
        console.error(pc.red(err instanceof Error ? err.message : String(err)));
        process.exit(1);
      }
    });

  cmd
    .command("write <driveType> <ownerId> <path>")
    .description("Write content to an existing file")
    .option("--content <content>", "New file content (inline)")
    .option("-f, --from <file>", "Read content from a local file")
    .action(async (driveType: string, ownerId: string, path: string, opts: { content?: string; from?: string }) => {
      const client = getClient();
      try {
        let content: string;
        if (opts.from) {
          const { readFileSync } = await import("node:fs");
          content = readFileSync(opts.from, "utf-8");
        } else if (opts.content) {
          content = opts.content;
        } else {
          console.error(pc.red("Required: --content <text> or -f <localFile>"));
          process.exit(1);
        }
        await client.updateFile(driveType, ownerId, path, content);
        console.log(`${path} updated`);
      } catch (err) {
        console.error(pc.red(err instanceof Error ? err.message : String(err)));
        process.exit(1);
      }
    });

  cmd
    .command("mv <driveType> <ownerId> <path>")
    .description("Rename a file or folder")
    .requiredOption("--name <newName>", "New name for the file/folder")
    .action(async (driveType: string, ownerId: string, path: string, opts: { name: string }) => {
      const client = getClient();
      try {
        await client.renameFile(driveType, ownerId, path, opts.name);
        console.log(`${path} → ${opts.name}`);
      } catch (err) {
        console.error(pc.red(err instanceof Error ? err.message : String(err)));
        process.exit(1);
      }
    });

  cmd
    .command("rm <driveType> <ownerId> <path>")
    .description("Delete a file or folder")
    .action(async (driveType: string, ownerId: string, path: string) => {
      const client = getClient();
      try {
        await client.deleteFile(driveType, ownerId, path);
        console.log(`${path} deleted`);
      } catch (err) {
        console.error(pc.red(err instanceof Error ? err.message : String(err)));
        process.exit(1);
      }
    });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

import type { DriveListing } from "@monokeros/types";

function findDriveFiles(listing: DriveListing, driveType: string, ownerId: string): FileEntry[] | null {
  switch (driveType) {
    case "workspace":
      return listing.workspaceDrive?.files ?? null;
    case "member": {
      const d = listing.memberDrives.find((d) => d.memberId === ownerId || d.memberName === ownerId);
      return d?.files ?? null;
    }
    case "team": {
      const d = listing.teamDrives.find((d) => d.teamId === ownerId || d.name === ownerId);
      return d?.files ?? null;
    }
    case "project": {
      const d = listing.projectDrives.find((d) => d.projectId === ownerId || d.name === ownerId);
      return d?.files ?? null;
    }
    default:
      return null;
  }
}

function navigateToPath(files: FileEntry[], path: string): FileEntry[] | null {
  const segments = path.split("/").filter(Boolean);
  let current = files;
  for (const seg of segments) {
    const found = current.find((f) => f.name === seg && f.type === "directory");
    if (!found || !found.children) return null;
    current = found.children;
  }
  return current;
}

function buildTreeNode(name: string, files: FileEntry[]): TreeNode {
  return {
    name,
    children: files.map((f) => {
      if (f.type === "directory" && f.children) {
        return buildTreeNode(f.name, f.children);
      }
      return { name: f.name };
    }),
  };
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
