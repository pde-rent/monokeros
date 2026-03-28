import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ApiClient } from "../api-client";
import { tryAction, withResult } from "./utils";

const categorySchema = z
  .enum(["teams", "members", "projects", "workspace"])
  .describe("Drive category: teams, members, projects, or workspace");

export function registerFileTools(server: McpServer, api: ApiClient) {
  server.tool(
    "files.list_drives",
    "List all drives (team, member, project, workspace) with their file trees.",
    {},
    async () => withResult(() => api.listDrives()),
  );

  server.tool(
    "files.read",
    "Read a file's content from any drive. Specify the category, ownerId, and file path.",
    {
      category: categorySchema,
      ownerId: z
        .string()
        .default("_")
        .describe('Owner ID (team/member/project ID). Use "_" for workspace.'),
      path: z.string().describe('File path within the drive (e.g. "/readme.md")'),
    },
    async ({ category, ownerId, path }) =>
      tryAction(
        () => api.readFile(category, ownerId, path),
        (f) => `--- ${f.name} (${f.mimeType}, ${f.size} bytes) ---\n${f.content}`,
      ),
  );

  server.tool(
    "files.create",
    "Create a new file in a drive.",
    {
      category: categorySchema,
      ownerId: z.string().describe("Owner ID (team/member/project ID)"),
      name: z.string().describe('File name (e.g. "notes.md")'),
      extension: z.string().optional().describe("File extension override"),
      content: z.string().default("").describe("Initial file content"),
      dir: z.string().default("/").describe("Directory to create the file in"),
    },
    async ({ category, ownerId, name, extension, content, dir }) =>
      tryAction(
        () => api.createFile(category, ownerId, { name, extension, content }, dir),
        (f) => `File created: ${f.path} (${f.mimeType})`,
      ),
  );

  server.tool(
    "files.update",
    "Update an existing file's content.",
    {
      category: categorySchema,
      ownerId: z.string().describe("Owner ID (team/member/project ID)"),
      path: z.string().describe("File path within the drive"),
      content: z.string().describe("New file content"),
    },
    async ({ category, ownerId, path, content }) =>
      tryAction(
        () => api.updateFile(category, ownerId, path, content),
        (f) => `File updated: ${f.path} (${f.size} bytes)`,
      ),
  );

  server.tool(
    "files.create_folder",
    "Create a new folder in a drive.",
    {
      category: categorySchema,
      ownerId: z.string().describe("Owner ID (team/member/project ID)"),
      name: z.string().describe("Folder name"),
      dir: z.string().default("/").describe("Parent directory path"),
    },
    async ({ category, ownerId, name, dir }) =>
      tryAction(
        () => api.createFolder(category, ownerId, name, dir),
        (f) => `Folder created: ${f.path}`,
      ),
  );

  server.tool(
    "files.rename",
    "Rename a file or folder in a drive. Cannot rename system files (SOUL.md, IDENTITY.md, etc.).",
    {
      category: categorySchema,
      ownerId: z.string().describe("Owner ID (team/member/project ID)"),
      path: z.string().describe("Current path of the file or folder"),
      newName: z.string().describe("New name for the file or folder"),
    },
    async ({ category, ownerId, path, newName }) =>
      tryAction(
        () => api.renameFile(category, ownerId, path, newName),
        (f) => `Renamed to: ${f.path} (${f.name})`,
      ),
  );

  server.tool(
    "files.delete",
    "Delete a file or folder from a drive. Cannot delete system files (SOUL.md, IDENTITY.md, etc.).",
    {
      category: categorySchema,
      ownerId: z.string().describe("Owner ID (team/member/project ID)"),
      path: z.string().describe("Path of the file or folder to delete"),
    },
    async ({ category, ownerId, path }) =>
      tryAction(
        () => api.deleteFile(category, ownerId, path),
        (r) => (r.success ? `Deleted: ${path}` : `Failed to delete: ${path}`),
      ),
  );
}
