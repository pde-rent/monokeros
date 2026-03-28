/**
 * Chat command parser — pure functions, no Convex dependencies.
 *
 * Commands start with `/` and follow the format: /command arg1 arg2 ...
 * Reference sigils: @agent, ~task, :artifact, #project
 */

const VALID_COMMANDS = [
  "assign", "unassign", "parent", "link", "unlink",
  "input", "output", "set", "start", "finish",
] as const;

export type CommandName = (typeof VALID_COMMANDS)[number];

const VALID_TASK_STATUSES = [
  "backlog", "todo", "in_progress", "in_review", "awaiting_acceptance", "done",
] as const;

export interface ParsedCommand {
  name: CommandName;
  args: string[];
  raw: string;
}

export type ParseResult =
  | { kind: "message" }
  | { kind: "command"; parsed: ParsedCommand }
  | { kind: "error"; error: string };

/** Parse message content into a command or pass-through message. */
export function parseCommand(content: string): ParseResult {
  const trimmed = content.trim();
  if (!trimmed.startsWith("/")) {
    return { kind: "message" };
  }

  const parts = trimmed.split(/\s+/);
  const cmdName = parts[0].slice(1).toLowerCase();

  if (!VALID_COMMANDS.includes(cmdName as CommandName)) {
    return { kind: "error", error: `Unknown command: /${cmdName}` };
  }

  const args = parts.slice(1);

  // Validate required args
  switch (cmdName as CommandName) {
    case "assign":
    case "unassign":
      if (args.length < 1) return { kind: "error", error: `/${cmdName} requires @agent-name` };
      break;
    case "parent":
    case "link":
    case "unlink":
      if (args.length < 1) return { kind: "error", error: `/${cmdName} requires ~task-ref` };
      break;
    case "input":
    case "output":
      if (args.length < 1) return { kind: "error", error: `/${cmdName} requires :artifact-ref` };
      break;
    case "set":
      if (args.length < 1) return { kind: "error", error: `/set requires a status value` };
      break;
    case "start":
    case "finish":
      break; // no args required
  }

  return {
    kind: "command",
    parsed: { name: cmdName as CommandName, args, raw: trimmed },
  };
}

/** Strip `@` prefix from an agent mention. */
export function extractMentionName(arg: string): string {
  return arg.startsWith("@") ? arg.slice(1) : arg;
}

/** Strip `~` prefix from a task reference. */
export function extractTaskRef(arg: string): string {
  return arg.startsWith("~") ? arg.slice(1) : arg;
}

/** Strip `:` prefix from an artifact reference. */
export function extractArtifactRef(arg: string): string {
  return arg.startsWith(":") ? arg.slice(1) : arg;
}

/** Infer artifact type from a reference string. */
export function inferArtifactType(ref: string): "file" | "url" {
  return /^https?:\/\//.test(ref) ? "url" : "file";
}

/** Check if a string is a valid task status. */
export function isValidTaskStatus(s: string): boolean {
  return (VALID_TASK_STATUSES as readonly string[]).includes(s);
}
