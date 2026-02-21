import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { GateStatus, TaskStatus } from '@monokeros/types';
import { DEFAULT_ENTITY_COLOR } from '@monokeros/constants';
import type { ApiClient } from '../api-client';
import { enumValues, errorResult, withResult } from './utils';

export function registerProjectTools(server: McpServer, api: ApiClient) {
  server.tool(
    'projects.list',
    'List projects. Supports filtering by status, type, and text search.',
    {
      status: z
        .enum(enumValues(TaskStatus))
        .optional()
        .describe('Filter by project status'),
      type: z
        .string()
        .optional()
        .describe('Filter by project type'),
      search: z.string().optional().describe('Search by name or type'),
    },
    async ({ status, type, search }) => withResult(async () => {
      const projects = await api.listProjects({ status, type, search });
      return projects.map((p) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        currentPhase: p.currentPhase,
        types: p.types,
        assignedTeamIds: p.assignedTeamIds,
      }));
    }),
  );

  server.tool(
    'projects.get',
    'Get full project details by ID, including SDLC gates, assigned teams and members.',
    { id: z.string().describe('Project ID') },
    async ({ id }) => withResult(() => api.getProject(id)),
  );

  server.tool(
    'projects.create',
    'Create a new project. Requires name and at least one project type.',
    {
      name: z.string().describe('Project name'),
      description: z.string().default('').describe('Project description'),
      color: z.string().default(DEFAULT_ENTITY_COLOR).describe('Hex color (e.g. #6366f1)'),
      types: z
        .array(z.string().min(1))
        .describe('Project type tags'),
      phases: z
        .array(z.string().min(1))
        .optional()
        .describe('Ordered phase names for the project SDLC'),
      assignedTeamIds: z.array(z.string()).default([]).describe('Team IDs to assign'),
      assignedMemberIds: z.array(z.string()).default([]).describe('Member IDs to assign'),
    },
    async ({ name, description, color, types, phases, assignedTeamIds, assignedMemberIds }) =>
      withResult(() => api.createProject({ name, description, color, types, phases, assignedTeamIds, assignedMemberIds })),
  );

  server.tool(
    'projects.update',
    'Update project fields. All fields are optional.',
    {
      id: z.string().describe('Project ID'),
      name: z.string().optional().describe('New project name'),
      description: z.string().optional().describe('New description'),
      color: z.string().optional().describe('New hex color'),
      types: z
        .array(z.string().min(1))
        .optional()
        .describe('New project types'),
      status: z
        .enum(enumValues(TaskStatus))
        .optional()
        .describe('New status'),
      assignedTeamIds: z.array(z.string()).optional().describe('New team IDs'),
      assignedMemberIds: z.array(z.string()).optional().describe('New member IDs'),
    },
    async ({ id, ...body }) => withResult(() => {
      const clean = Object.fromEntries(
        Object.entries(body).filter(([, v]) => v !== undefined),
      );
      return api.updateProject(id, clean);
    }),
  );

  server.tool(
    'projects.update_gate',
    'Approve or reject an SDLC gate for a project phase.',
    {
      projectId: z.string().describe('Project ID'),
      phase: z.string().min(1).describe('Phase name (e.g. "intake", "development", "testing")'),
      status: z
        .enum(enumValues(GateStatus))
        .describe('New gate status'),
      feedback: z.string().optional().describe('Optional feedback text'),
    },
    async ({ projectId, phase, status, feedback }) =>
      withResult(() => api.updateGate(projectId, { phase, status, feedback })),
  );
}
