import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { TaskPriority, TaskStatus } from "@monokeros/types";
import type { ApiClient } from "../api-client";
import { enumValues, cleanUpdate, tryAction, withResult } from "./utils";

export function registerTaskTools(server: McpServer, api: ApiClient) {
  server.tool(
    "tasks.list",
    "List tasks with optional filters by project, status, or assignee.",
    {
      projectId: z.string().optional().describe("Filter by project ID"),
      status: z.enum(enumValues(TaskStatus)).optional().describe("Filter by task status"),
      assigneeId: z.string().optional().describe("Filter by assignee member ID"),
    },
    async ({ projectId, status, assigneeId }) =>
      withResult(async () => {
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
    "tasks.get",
    "Get full task details by ID, including description, dependencies, cross-validation state.",
    { id: z.string().describe("Task ID") },
    async ({ id }) => withResult(() => api.getTask(id)),
  );

  server.tool(
    "tasks.create",
    "Create a new task in a project. Requires title, projectId, teamId, and phase.",
    {
      title: z.string().describe("Task title"),
      description: z.string().default("").describe("Task description"),
      projectId: z
        .string()
        .optional()
        .describe("Project this task belongs to (omit for detached tasks)"),
      teamId: z.string().describe("Team responsible for the task"),
      phase: z.number().min(0).max(9).describe("SDLC phase number (0-9)"),
      priority: z.enum(enumValues(TaskPriority)).default("medium").describe("Task priority"),
      assigneeIds: z.array(z.string()).default([]).describe("Member IDs to assign"),
      dependencies: z.array(z.string()).default([]).describe("IDs of tasks this depends on"),
      offloadable: z
        .boolean()
        .default(false)
        .describe("Whether task can be offloaded to external services"),
    },
    async (args) => withResult(() => api.createTask(args)),
  );

  server.tool(
    "tasks.update",
    "Update task fields. All fields are optional.",
    {
      id: z.string().describe("Task ID"),
      title: z.string().optional().describe("New title"),
      description: z.string().optional().describe("New description"),
      priority: z.enum(enumValues(TaskPriority)).optional().describe("New priority"),
      assigneeIds: z.array(z.string()).optional().describe("New assignee IDs"),
      dependencies: z.array(z.string()).optional().describe("New dependency task IDs"),
      offloadable: z.boolean().optional().describe("New offloadable flag"),
    },
    async ({ id, ...body }) => withResult(() => api.updateTask(id, cleanUpdate(body))),
  );

  server.tool(
    "tasks.move",
    "Move a task to a different status column (backlog, todo, in_progress, in_review, done).",
    {
      id: z.string().describe("Task ID"),
      status: z.enum(enumValues(TaskStatus)).describe("Target status"),
    },
    async ({ id, status }) =>
      tryAction(
        () => api.moveTask(id, status),
        (task) => `Task "${task.title}" moved to ${status}.`,
      ),
  );

  server.tool(
    "tasks.assign",
    "Assign members to a task. Replaces existing assignees.",
    {
      id: z.string().describe("Task ID"),
      assigneeIds: z.array(z.string()).describe("Member IDs to assign"),
    },
    async ({ id, assigneeIds }) =>
      tryAction(
        () => api.assignTask(id, assigneeIds),
        (task) => `Task "${task.title}" assigned to: ${task.assigneeIds.join(", ") || "(none)"}`,
      ),
  );

  server.tool(
    "tasks.set_parent",
    "Set or clear a task's parent task for hierarchical task breakdown.",
    {
      id: z.string().describe("Task ID"),
      parentId: z.string().nullable().describe("Parent task ID (null to clear)"),
    },
    async ({ id, parentId }) =>
      tryAction(
        () => api.setTaskParent(id, parentId),
        () => parentId ? `Parent set for task ${id}.` : `Parent cleared for task ${id}.`,
      ),
  );

  server.tool(
    "tasks.add_dependency",
    "Add a dependency to a task. The task depends on the given dependency task.",
    {
      id: z.string().describe("Task ID"),
      dependencyId: z.string().describe("ID of the task this depends on"),
    },
    async ({ id, dependencyId }) =>
      tryAction(
        () => api.addTaskDependency(id, dependencyId),
        () => `Dependency added to task ${id}.`,
      ),
  );

  server.tool(
    "tasks.remove_dependency",
    "Remove a dependency from a task.",
    {
      id: z.string().describe("Task ID"),
      dependencyId: z.string().describe("ID of the dependency to remove"),
    },
    async ({ id, dependencyId }) =>
      tryAction(
        () => api.removeTaskDependency(id, dependencyId),
        () => `Dependency removed from task ${id}.`,
      ),
  );

  server.tool(
    "tasks.add_input",
    "Add an input artifact to a task. Inputs are files or URLs the task consumes.",
    {
      id: z.string().describe("Task ID"),
      type: z.enum(["file", "url"]).describe("Artifact type"),
      label: z.string().describe("Human-readable label"),
      path: z.string().optional().describe("File path (for file type)"),
      url: z.string().optional().describe("URL (for url type)"),
    },
    async ({ id, type, label, path, url }) =>
      tryAction(
        () => api.addTaskArtifact(id, "inputs", { type, label, path, url }),
        () => `Input "${label}" added to task ${id}.`,
      ),
  );

  server.tool(
    "tasks.remove_input",
    "Remove an input artifact from a task by artifact ID.",
    {
      id: z.string().describe("Task ID"),
      artifactId: z.string().describe("Artifact ID to remove"),
    },
    async ({ id, artifactId }) =>
      tryAction(
        () => api.removeTaskArtifact(id, "inputs", artifactId),
        () => `Input removed from task ${id}.`,
      ),
  );

  server.tool(
    "tasks.add_output",
    "Add an output artifact to a task. Outputs are files or URLs the task produces.",
    {
      id: z.string().describe("Task ID"),
      type: z.enum(["file", "url"]).describe("Artifact type"),
      label: z.string().describe("Human-readable label"),
      path: z.string().optional().describe("File path (for file type)"),
      url: z.string().optional().describe("URL (for url type)"),
    },
    async ({ id, type, label, path, url }) =>
      tryAction(
        () => api.addTaskArtifact(id, "outputs", { type, label, path, url }),
        () => `Output "${label}" added to task ${id}.`,
      ),
  );

  server.tool(
    "tasks.remove_output",
    "Remove an output artifact from a task by artifact ID.",
    {
      id: z.string().describe("Task ID"),
      artifactId: z.string().describe("Artifact ID to remove"),
    },
    async ({ id, artifactId }) =>
      tryAction(
        () => api.removeTaskArtifact(id, "outputs", artifactId),
        () => `Output removed from task ${id}.`,
      ),
  );

  server.tool(
    "tasks.submit_acceptance",
    "Accept or reject a task that requires human acceptance. Optionally provide feedback.",
    {
      id: z.string().describe("Task ID"),
      action: z.enum(["accept", "reject"]).describe("Accept or reject the task"),
      feedback: z.string().optional().describe("Optional feedback message"),
    },
    async ({ id, action, feedback }) =>
      tryAction(
        () => api.submitTaskAcceptance(id, action, feedback),
        (task) => `Task "${task.title}" ${action}ed.`,
      ),
  );
}
