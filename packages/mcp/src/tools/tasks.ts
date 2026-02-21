import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { TaskPriority, TaskStatus } from '@monokeros/types';
import type { ApiClient } from '../api-client';
import { enumValues, errorResult, textResult, withResult } from './utils';

export function registerTaskTools(server: McpServer, api: ApiClient) {
  server.tool(
    'tasks.list',
    'List tasks with optional filters by project, status, or assignee.',
    {
      projectId: z.string().optional().describe('Filter by project ID'),
      status: z
        .enum(enumValues(TaskStatus))
        .optional()
        .describe('Filter by task status'),
      assigneeId: z.string().optional().describe('Filter by assignee member ID'),
    },
    async ({ projectId, status, assigneeId }) => withResult(async () => {
      const tasks = await api.listTasks({ projectId, status, assigneeId });
      return tasks.map((t) => ({
        id: t.id,
        title: t.title,
        projectId: t.projectId,
        status: t.status,
        priority: t.priority,
        assigneeIds: t.assigneeIds,
        teamId: t.teamId,
      }));
    }),
  );

  server.tool(
    'tasks.get',
    'Get full task details by ID, including description, dependencies, cross-validation state.',
    { id: z.string().describe('Task ID') },
    async ({ id }) => withResult(() => api.getTask(id)),
  );

  server.tool(
    'tasks.create',
    'Create a new task in a project. Requires title, projectId, teamId, and phase.',
    {
      title: z.string().describe('Task title'),
      description: z.string().default('').describe('Task description'),
      projectId: z.string().optional().describe('Project this task belongs to (omit for detached tasks)'),
      teamId: z.string().describe('Team responsible for the task'),
      phase: z.number().min(0).max(9).describe('SDLC phase number (0-9)'),
      priority: z
        .enum(enumValues(TaskPriority))
        .default('medium')
        .describe('Task priority'),
      assigneeIds: z.array(z.string()).default([]).describe('Member IDs to assign'),
      dependencies: z.array(z.string()).default([]).describe('IDs of tasks this depends on'),
      offloadable: z.boolean().default(false).describe('Whether task can be offloaded to external services'),
    },
    async (args) => withResult(() => api.createTask(args)),
  );

  server.tool(
    'tasks.update',
    'Update task fields. All fields are optional.',
    {
      id: z.string().describe('Task ID'),
      title: z.string().optional().describe('New title'),
      description: z.string().optional().describe('New description'),
      priority: z
        .enum(enumValues(TaskPriority))
        .optional()
        .describe('New priority'),
      assigneeIds: z.array(z.string()).optional().describe('New assignee IDs'),
      dependencies: z.array(z.string()).optional().describe('New dependency task IDs'),
      offloadable: z.boolean().optional().describe('New offloadable flag'),
    },
    async ({ id, ...body }) => withResult(() => {
      const clean = Object.fromEntries(
        Object.entries(body).filter(([, v]) => v !== undefined),
      );
      return api.updateTask(id, clean);
    }),
  );

  server.tool(
    'tasks.move',
    'Move a task to a different status column (backlog, todo, in_progress, in_review, done).',
    {
      id: z.string().describe('Task ID'),
      status: z
        .enum(enumValues(TaskStatus))
        .describe('Target status'),
    },
    async ({ id, status }) => {
      try {
        const task = await api.moveTask(id, status);
        return textResult(`Task "${task.title}" moved to ${status}.`);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    'tasks.assign',
    'Assign members to a task. Replaces existing assignees.',
    {
      id: z.string().describe('Task ID'),
      assigneeIds: z.array(z.string()).describe('Member IDs to assign'),
    },
    async ({ id, assigneeIds }) => {
      try {
        const task = await api.assignTask(id, assigneeIds);
        return textResult(`Task "${task.title}" assigned to: ${task.assigneeIds.join(', ') || '(none)'}`);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
