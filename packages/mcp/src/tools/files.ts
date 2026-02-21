import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ApiClient } from '../api-client';
import { errorResult, textResult, withResult } from './utils';

const categorySchema = z
  .enum(['teams', 'members', 'projects', 'workspace'])
  .describe('Drive category: teams, members, projects, or workspace');

export function registerFileTools(server: McpServer, api: ApiClient) {
  server.tool(
    'files.list_drives',
    'List all drives (team, member, project, workspace) with their file trees.',
    {},
    async () => withResult(() => api.listDrives()),
  );

  server.tool(
    'files.read',
    'Read a file\'s content from any drive. Specify the category, ownerId, and file path.',
    {
      category: categorySchema,
      ownerId: z
        .string()
        .default('_')
        .describe('Owner ID (team/member/project ID). Use "_" for workspace.'),
      path: z.string().describe('File path within the drive (e.g. "/readme.md")'),
    },
    async ({ category, ownerId, path }) => {
      try {
        const file = await api.readFile(category, ownerId, path);
        return textResult(`--- ${file.name} (${file.mimeType}, ${file.size} bytes) ---\n${file.content}`);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    'files.create',
    'Create a new file in a drive.',
    {
      category: categorySchema,
      ownerId: z.string().describe('Owner ID (team/member/project ID)'),
      name: z.string().describe('File name (e.g. "notes.md")'),
      extension: z.string().optional().describe('File extension override'),
      content: z.string().default('').describe('Initial file content'),
      dir: z.string().default('/').describe('Directory to create the file in'),
    },
    async ({ category, ownerId, name, extension, content, dir }) => {
      try {
        const file = await api.createFile(category, ownerId, { name, extension, content }, dir);
        return textResult(`File created: ${file.path} (${file.mimeType})`);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    'files.update',
    'Update an existing file\'s content.',
    {
      category: categorySchema,
      ownerId: z.string().describe('Owner ID (team/member/project ID)'),
      path: z.string().describe('File path within the drive'),
      content: z.string().describe('New file content'),
    },
    async ({ category, ownerId, path, content }) => {
      try {
        const file = await api.updateFile(category, ownerId, path, content);
        return textResult(`File updated: ${file.path} (${file.size} bytes)`);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    'files.create_folder',
    'Create a new folder in a drive.',
    {
      category: categorySchema,
      ownerId: z.string().describe('Owner ID (team/member/project ID)'),
      name: z.string().describe('Folder name'),
      dir: z.string().default('/').describe('Parent directory path'),
    },
    async ({ category, ownerId, name, dir }) => {
      try {
        const folder = await api.createFolder(category, ownerId, name, dir);
        return textResult(`Folder created: ${folder.path}`);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    'files.rename',
    'Rename a file or folder in a drive. Cannot rename system files (SOUL.md, IDENTITY.md, etc.).',
    {
      category: categorySchema,
      ownerId: z.string().describe('Owner ID (team/member/project ID)'),
      path: z.string().describe('Current path of the file or folder'),
      newName: z.string().describe('New name for the file or folder'),
    },
    async ({ category, ownerId, path, newName }) => {
      try {
        const file = await api.renameFile(category, ownerId, path, newName);
        return textResult(`Renamed to: ${file.path} (${file.name})`);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    'files.delete',
    'Delete a file or folder from a drive. Cannot delete system files (SOUL.md, IDENTITY.md, etc.).',
    {
      category: categorySchema,
      ownerId: z.string().describe('Owner ID (team/member/project ID)'),
      path: z.string().describe('Path of the file or folder to delete'),
    },
    async ({ category, ownerId, path }) => {
      try {
        const result = await api.deleteFile(category, ownerId, path);
        return textResult(result.success ? `Deleted: ${path}` : `Failed to delete: ${path}`);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
