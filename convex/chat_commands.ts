/**
 * Chat command execution.
 *
 * Takes a parsed command and executes it against the database.
 * Returns a result message to be stored as a system message.
 */

import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { ParsedCommand } from "./lib/commands";
import {
  extractMentionName,
  extractTaskRef,
  extractArtifactRef,
  inferArtifactType,
  isValidTaskStatus,
} from "./lib/commands";

export interface CommandContext {
  ctx: MutationCtx;
  workspaceId: Id<"workspaces">;
  memberId: Id<"members">;
  conversationType: string;
  taskId: Id<"tasks"> | null;
  projectId: Id<"projects"> | null;
}

export interface CommandResult {
  success: boolean;
  message: string;
}

export async function executeCommand(
  parsed: ParsedCommand,
  cmdCtx: CommandContext,
): Promise<CommandResult> {
  const { name } = parsed;

  switch (name) {
    case "assign":
      return handleAssign(parsed, cmdCtx);
    case "unassign":
      return handleUnassign(parsed, cmdCtx);
    case "parent":
      return handleParent(parsed, cmdCtx);
    case "link":
      return handleLink(parsed, cmdCtx);
    case "unlink":
      return handleUnlink(parsed, cmdCtx);
    case "input":
      return handleArtifact(parsed, cmdCtx, "inputs");
    case "output":
      return handleArtifact(parsed, cmdCtx, "outputs");
    case "set":
      return handleSet(parsed, cmdCtx);
    case "start":
      return handleStart(parsed, cmdCtx);
    case "finish":
      return handleFinish(parsed, cmdCtx);
    default:
      return { success: false, message: `Unknown command: /${name}` };
  }
}

// ── Resolution helpers ───────────────────────────────────────────────────────

async function resolveMemberByName(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  name: string,
): Promise<{ _id: Id<"members">; name: string } | null> {
  // Search index for fuzzy match, prefer exact case-insensitive
  const results = await ctx.db
    .query("members")
    .withSearchIndex("search_name", (q) =>
      q.search("name", name).eq("workspaceId", workspaceId),
    )
    .take(10);

  // Prefer exact case-insensitive match
  const exact = results.find(
    (m) => m.name.toLowerCase() === name.toLowerCase(),
  );
  if (exact) return exact;
  return results[0] ?? null;
}

async function resolveTaskByRef(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  ref: string,
): Promise<{ _id: Id<"tasks">; title: string } | null> {
  // Try by slug index first
  const bySlug = await ctx.db
    .query("tasks")
    .withIndex("by_workspace_slug", (q) =>
      q.eq("workspaceId", workspaceId).eq("slug", ref),
    )
    .first();
  if (bySlug) return bySlug;

  // Try as raw Convex ID
  try {
    const direct = await ctx.db.get(ref as Id<"tasks">);
    if (direct && (direct as any).workspaceId === workspaceId) {
      return direct as any;
    }
  } catch {
    // Not a valid ID format
  }

  // Fall back to search
  const searchResults = await ctx.db
    .query("tasks")
    .withSearchIndex("search_title", (q) =>
      q.search("title", ref).eq("workspaceId", workspaceId),
    )
    .take(5);
  return searchResults[0] ?? null;
}

function requireTaskThread(cmdCtx: CommandContext, cmdName: string): CommandResult | null {
  if (cmdCtx.conversationType !== "task_thread" || !cmdCtx.taskId) {
    return {
      success: false,
      message: `/${cmdName} is only available in task threads.`,
    };
  }
  return null;
}

// ── Command handlers ─────────────────────────────────────────────────────────

async function handleAssign(
  parsed: ParsedCommand,
  cmdCtx: CommandContext,
): Promise<CommandResult> {
  const name = extractMentionName(parsed.args[0]);
  const member = await resolveMemberByName(cmdCtx.ctx, cmdCtx.workspaceId, name);
  if (!member) {
    return { success: false, message: `Member not found: ${name}` };
  }

  if (cmdCtx.conversationType === "task_thread" && cmdCtx.taskId) {
    const task = await cmdCtx.ctx.db.get(cmdCtx.taskId);
    if (!task) return { success: false, message: "Task not found." };

    if (task.assigneeIds.includes(member._id as string)) {
      return { success: true, message: `${member.name} is already assigned to this task.` };
    }

    await cmdCtx.ctx.db.patch(cmdCtx.taskId, {
      assigneeIds: [...task.assigneeIds, member._id as string],
      updatedAt: new Date().toISOString(),
    });
    return { success: true, message: `Assigned **${member.name}** to task "${task.title}".` };
  }

  if (cmdCtx.conversationType === "project_chat" && cmdCtx.projectId) {
    const project = await cmdCtx.ctx.db.get(cmdCtx.projectId);
    if (!project) return { success: false, message: "Project not found." };

    if (project.assignedMemberIds.includes(member._id as string)) {
      return { success: true, message: `${member.name} is already assigned to this project.` };
    }

    await cmdCtx.ctx.db.patch(cmdCtx.projectId, {
      assignedMemberIds: [...project.assignedMemberIds, member._id as string],
      modifiedAt: new Date().toISOString(),
    });
    return { success: true, message: `Assigned **${member.name}** to project "${project.name}".` };
  }

  return { success: false, message: "/assign requires a task thread or project chat context." };
}

async function handleUnassign(
  parsed: ParsedCommand,
  cmdCtx: CommandContext,
): Promise<CommandResult> {
  const name = extractMentionName(parsed.args[0]);
  const member = await resolveMemberByName(cmdCtx.ctx, cmdCtx.workspaceId, name);
  if (!member) {
    return { success: false, message: `Member not found: ${name}` };
  }

  if (cmdCtx.conversationType === "task_thread" && cmdCtx.taskId) {
    const task = await cmdCtx.ctx.db.get(cmdCtx.taskId);
    if (!task) return { success: false, message: "Task not found." };

    if (!task.assigneeIds.includes(member._id as string)) {
      return { success: true, message: `${member.name} is not assigned to this task.` };
    }

    await cmdCtx.ctx.db.patch(cmdCtx.taskId, {
      assigneeIds: task.assigneeIds.filter((id) => id !== (member._id as string)),
      updatedAt: new Date().toISOString(),
    });
    return { success: true, message: `Unassigned **${member.name}** from task "${task.title}".` };
  }

  if (cmdCtx.conversationType === "project_chat" && cmdCtx.projectId) {
    const project = await cmdCtx.ctx.db.get(cmdCtx.projectId);
    if (!project) return { success: false, message: "Project not found." };

    await cmdCtx.ctx.db.patch(cmdCtx.projectId, {
      assignedMemberIds: project.assignedMemberIds.filter((id) => id !== (member._id as string)),
      modifiedAt: new Date().toISOString(),
    });
    return { success: true, message: `Unassigned **${member.name}** from project "${project.name}".` };
  }

  return { success: false, message: "/unassign requires a task thread or project chat context." };
}

async function handleParent(
  parsed: ParsedCommand,
  cmdCtx: CommandContext,
): Promise<CommandResult> {
  const check = requireTaskThread(cmdCtx, "parent");
  if (check) return check;

  const ref = extractTaskRef(parsed.args[0]);
  const parentTask = await resolveTaskByRef(cmdCtx.ctx, cmdCtx.workspaceId, ref);
  if (!parentTask) {
    return { success: false, message: `Task not found: ${ref}` };
  }

  // Prevent self-referencing
  if (parentTask._id === cmdCtx.taskId) {
    return { success: false, message: "A task cannot be its own parent." };
  }

  await cmdCtx.ctx.db.patch(cmdCtx.taskId!, {
    parentId: parentTask._id,
    updatedAt: new Date().toISOString(),
  });
  return { success: true, message: `Set parent to "${parentTask.title}".` };
}

async function handleLink(
  parsed: ParsedCommand,
  cmdCtx: CommandContext,
): Promise<CommandResult> {
  const check = requireTaskThread(cmdCtx, "link");
  if (check) return check;

  const ref = extractTaskRef(parsed.args[0]);
  const depTask = await resolveTaskByRef(cmdCtx.ctx, cmdCtx.workspaceId, ref);
  if (!depTask) {
    return { success: false, message: `Task not found: ${ref}` };
  }

  const task = await cmdCtx.ctx.db.get(cmdCtx.taskId!);
  if (!task) return { success: false, message: "Task not found." };

  if (task.dependencies.includes(depTask._id as string)) {
    return { success: true, message: `"${depTask.title}" is already a dependency.` };
  }

  await cmdCtx.ctx.db.patch(cmdCtx.taskId!, {
    dependencies: [...task.dependencies, depTask._id as string],
    updatedAt: new Date().toISOString(),
  });
  return { success: true, message: `Linked dependency: "${depTask.title}".` };
}

async function handleUnlink(
  parsed: ParsedCommand,
  cmdCtx: CommandContext,
): Promise<CommandResult> {
  const check = requireTaskThread(cmdCtx, "unlink");
  if (check) return check;

  const ref = extractTaskRef(parsed.args[0]);
  const depTask = await resolveTaskByRef(cmdCtx.ctx, cmdCtx.workspaceId, ref);
  if (!depTask) {
    return { success: false, message: `Task not found: ${ref}` };
  }

  const task = await cmdCtx.ctx.db.get(cmdCtx.taskId!);
  if (!task) return { success: false, message: "Task not found." };

  if (!task.dependencies.includes(depTask._id as string)) {
    return { success: true, message: `"${depTask.title}" is not a dependency.` };
  }

  await cmdCtx.ctx.db.patch(cmdCtx.taskId!, {
    dependencies: task.dependencies.filter((id) => id !== (depTask._id as string)),
    updatedAt: new Date().toISOString(),
  });
  return { success: true, message: `Unlinked dependency: "${depTask.title}".` };
}

async function handleArtifact(
  parsed: ParsedCommand,
  cmdCtx: CommandContext,
  field: "inputs" | "outputs",
): Promise<CommandResult> {
  const cmdName = field === "inputs" ? "input" : "output";
  const check = requireTaskThread(cmdCtx, cmdName);
  if (check) return check;

  const ref = extractArtifactRef(parsed.args[0]);
  const artifactType = inferArtifactType(ref);

  const task = await cmdCtx.ctx.db.get(cmdCtx.taskId!);
  if (!task) return { success: false, message: "Task not found." };

  const artifacts = task[field];
  // Check for duplicate
  if (artifacts.some((a) => (artifactType === "url" ? a.url === ref : a.path === ref))) {
    return { success: true, message: `"${ref}" is already an ${cmdName}.` };
  }

  const label = parsed.args.slice(1).join(" ") || ref;
  const newArtifact = {
    id: `art_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    type: artifactType,
    label,
    path: artifactType === "file" ? ref : null,
    url: artifactType === "url" ? ref : null,
    gitRef: null,
  };

  await cmdCtx.ctx.db.patch(cmdCtx.taskId!, {
    [field]: [...artifacts, newArtifact],
    updatedAt: new Date().toISOString(),
  });
  return { success: true, message: `Added ${cmdName}: "${label}".` };
}

async function handleSet(
  parsed: ParsedCommand,
  cmdCtx: CommandContext,
): Promise<CommandResult> {
  const status = parsed.args[0];

  if (cmdCtx.conversationType === "task_thread" && cmdCtx.taskId) {
    if (!isValidTaskStatus(status)) {
      return { success: false, message: `Invalid task status: ${status}` };
    }
    const task = await cmdCtx.ctx.db.get(cmdCtx.taskId);
    if (!task) return { success: false, message: "Task not found." };

    await cmdCtx.ctx.db.patch(cmdCtx.taskId, {
      status: status as any,
      updatedAt: new Date().toISOString(),
    });
    return { success: true, message: `Task status set to **${status}**.` };
  }

  if (cmdCtx.conversationType === "project_chat" && cmdCtx.projectId) {
    if (!isValidTaskStatus(status)) {
      return { success: false, message: `Invalid status: ${status}` };
    }
    const project = await cmdCtx.ctx.db.get(cmdCtx.projectId);
    if (!project) return { success: false, message: "Project not found." };

    await cmdCtx.ctx.db.patch(cmdCtx.projectId, {
      status: status as any,
      modifiedAt: new Date().toISOString(),
    });
    return { success: true, message: `Project status set to **${status}**.` };
  }

  return { success: false, message: "/set requires a task thread or project chat context." };
}

async function handleStart(
  _parsed: ParsedCommand,
  cmdCtx: CommandContext,
): Promise<CommandResult> {
  const check = requireTaskThread(cmdCtx, "start");
  if (check) return check;

  const task = await cmdCtx.ctx.db.get(cmdCtx.taskId!);
  if (!task) return { success: false, message: "Task not found." };

  const updates: Record<string, any> = {
    status: "in_progress",
    updatedAt: new Date().toISOString(),
  };

  // Auto-assign the caller if not already assigned
  if (!task.assigneeIds.includes(cmdCtx.memberId as string)) {
    updates.assigneeIds = [...task.assigneeIds, cmdCtx.memberId as string];
  }

  await cmdCtx.ctx.db.patch(cmdCtx.taskId!, updates);

  const member = await cmdCtx.ctx.db.get(cmdCtx.memberId);
  const memberName = member?.name ?? "You";
  return {
    success: true,
    message: `Task "${task.title}" started. ${memberName} assigned and status set to **in_progress**.`,
  };
}

async function handleFinish(
  _parsed: ParsedCommand,
  cmdCtx: CommandContext,
): Promise<CommandResult> {
  const check = requireTaskThread(cmdCtx, "finish");
  if (check) return check;

  const task = await cmdCtx.ctx.db.get(cmdCtx.taskId!);
  if (!task) return { success: false, message: "Task not found." };

  // Respect acceptance gate
  if (
    task.requiresHumanAcceptance &&
    task.humanAcceptance?.status !== "accepted"
  ) {
    await cmdCtx.ctx.db.patch(cmdCtx.taskId!, {
      status: "awaiting_acceptance",
      humanAcceptance: {
        status: "pending",
        reviewerId: null,
        feedback: null,
        reviewedAt: null,
      },
      updatedAt: new Date().toISOString(),
    });
    return {
      success: true,
      message: `Task "${task.title}" moved to **awaiting_acceptance** (requires human review).`,
    };
  }

  await cmdCtx.ctx.db.patch(cmdCtx.taskId!, {
    status: "done",
    updatedAt: new Date().toISOString(),
  });
  return { success: true, message: `Task "${task.title}" marked **done**.` };
}
