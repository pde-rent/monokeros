/**
 * Resource registry — maps between CLI nouns, short names, and MCP actions.
 *
 * This is the single source of truth for resource naming across CLI, API, and MCP.
 * Adding a new resource type here automatically wires up `mk get`, `mk describe`, etc.
 */

export interface ResourceType {
  /** Canonical plural name (CLI noun) */
  name: string;
  /** Singular form */
  singular: string;
  /** Short alias for interactive use */
  short: string;
  /** MCP action prefix (e.g., "members" → "members.list") */
  apiPrefix: string;
  /** Extra aliases beyond name/singular/short */
  aliases?: string[];
}

const RESOURCES: ResourceType[] = [
  { name: "members", singular: "member", short: "mem", apiPrefix: "members", aliases: ["agents", "ag"] },
  { name: "teams", singular: "team", short: "tm", apiPrefix: "teams" },
  { name: "projects", singular: "project", short: "proj", apiPrefix: "projects" },
  { name: "tasks", singular: "task", short: "task", apiPrefix: "tasks" },
  { name: "conversations", singular: "conversation", short: "conv", apiPrefix: "conversations", aliases: ["chat", "chats"] },
  { name: "files", singular: "file", short: "file", apiPrefix: "files" },
  { name: "workspaces", singular: "workspace", short: "ws", apiPrefix: "workspaces" },
  { name: "providers", singular: "provider", short: "prov", apiPrefix: "workspaces" },
  { name: "runtimes", singular: "runtime", short: "rt", apiPrefix: "agents", aliases: ["containers"] },
];

/** Build a lookup map from all names/aliases → ResourceType */
const lookup = new Map<string, ResourceType>();
for (const r of RESOURCES) {
  for (const key of [r.name, r.singular, r.short, ...(r.aliases ?? [])]) {
    lookup.set(key, r);
  }
}

/** Resolve a user-provided resource name to its canonical ResourceType */
export function resolveResource(input: string): ResourceType | undefined {
  return lookup.get(input.toLowerCase());
}

/** List all resource types (for help / api-resources command) */
export function allResources(): ResourceType[] {
  return RESOURCES;
}
