/**
 * Consolidated output formatter.
 *
 * Every resource view (table, wide, json, yaml, name) goes through this
 * single class. Zero duplication across resource types — column definitions
 * are the only thing that varies.
 */

import Table from "cli-table3";
import pc from "picocolors";
import YAML from "yaml";

// ── Types ─────────────────────────────────────────────────────────────────────

export type OutputFormat = "table" | "wide" | "json" | "yaml" | "name";

export interface ColumnDef<T> {
  header: string;
  value: (item: T) => string;
  /** Optional color function — receives the item, returns a picocolors-wrapped string */
  color?: (item: T) => string;
  /** If true, only shown in "wide" mode */
  wide?: boolean;
}

// ── Color helpers ─────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, (s: string) => string> = {
  // Member status
  idle: pc.gray,
  working: pc.green,
  reviewing: pc.cyan,
  blocked: pc.red,
  offline: pc.dim,
  // Task status
  backlog: pc.dim,
  todo: pc.white,
  in_progress: pc.green,
  in_review: pc.cyan,
  awaiting_acceptance: pc.yellow,
  done: pc.green,
  // Agent runtime
  running: pc.green,
  stopped: pc.dim,
  error: pc.red,
  // Priority
  critical: pc.red,
  high: pc.yellow,
  medium: pc.white,
  low: pc.dim,
  none: pc.dim,
  // Workspace status
  active: pc.green,
  paused: pc.yellow,
  archived: pc.dim,
};

export function colorize(status: string): string {
  const fn = STATUS_COLORS[status];
  return fn ? fn(status) : status;
}

// ── Formatter ─────────────────────────────────────────────────────────────────

export class Formatter<T> {
  constructor(
    private columns: ColumnDef<T>[],
  ) {}

  format(items: T[], output: OutputFormat): string {
    switch (output) {
      case "json":
        return JSON.stringify(items, null, 2);
      case "yaml":
        return YAML.stringify(items, { lineWidth: 120 });
      case "name":
        return items.map((item) => this.columns[0].value(item)).join("\n");
      case "wide":
        return this.table(items, this.columns);
      case "table":
      default:
        return this.table(items, this.columns.filter((c) => !c.wide));
    }
  }

  formatOne(item: T, output: OutputFormat): string {
    switch (output) {
      case "json":
        return JSON.stringify(item, null, 2);
      case "yaml":
        return YAML.stringify(item, { lineWidth: 120 });
      default:
        return this.format([item], output);
    }
  }

  private table(items: T[], cols: ColumnDef<T>[]): string {
    if (items.length === 0) {
      return "No resources found.";
    }

    const table = new Table({
      head: cols.map((c) => pc.bold(pc.white(c.header))),
      style: { head: [], border: [], compact: true },
      chars: {
        top: "", "top-mid": "", "top-left": "", "top-right": "",
        bottom: "", "bottom-mid": "", "bottom-left": "", "bottom-right": "",
        left: "", "left-mid": "", right: "", "right-mid": "",
        mid: "", "mid-mid": "", middle: "  ",
      },
    });

    for (const item of items) {
      table.push(
        cols.map((c) => {
          if (c.color) return c.color(item);
          return c.value(item);
        }),
      );
    }

    return table.toString();
  }
}

// ── Describe formatter ────────────────────────────────────────────────────────

export interface DescribeField<T> {
  label: string;
  value: (item: T) => string | string[] | null | undefined;
}

/**
 * Format a single resource as a "describe" view — key-value pairs,
 * similar to `kubectl describe`.
 */
export function describe<T>(item: T, fields: DescribeField<T>[]): string {
  const lines: string[] = [];
  const maxLabel = Math.max(...fields.map((f) => f.label.length));

  for (const field of fields) {
    const raw = field.value(item);
    if (raw === null || raw === undefined) continue;

    const pad = " ".repeat(maxLabel - field.label.length);
    if (Array.isArray(raw)) {
      lines.push(`${pc.bold(field.label)}:${pad}`);
      for (const v of raw) {
        lines.push(`  - ${v}`);
      }
    } else {
      lines.push(`${pc.bold(field.label)}:${pad}  ${raw}`);
    }
  }

  return lines.join("\n");
}

/**
 * Print a single resource in describe/json/yaml format.
 * Eliminates the repeated output-format branching across commands.
 */
export function printDescribe<T>(item: T, fields: DescribeField<T>[], output: OutputFormat): void {
  switch (output) {
    case "json":
      console.log(JSON.stringify(item, null, 2));
      break;
    case "yaml":
      console.log(YAML.stringify(item, { lineWidth: 120 }));
      break;
    default:
      console.log(describe(item, fields));
  }
}

// ── Tree formatter ────────────────────────────────────────────────────────────

export interface TreeNode {
  name: string;
  children?: TreeNode[];
}

export function tree(root: TreeNode, prefix = ""): string {
  const lines: string[] = [];
  lines.push(pc.bold(root.name));

  if (root.children) {
    for (let i = 0; i < root.children.length; i++) {
      const child = root.children[i];
      const isLast = i === root.children.length - 1;
      const connector = isLast ? "└── " : "├── ";
      const childPrefix = isLast ? "    " : "│   ";

      if (child.children && child.children.length > 0) {
        lines.push(prefix + connector + pc.bold(child.name + "/"));
        lines.push(tree(
          { name: "", children: child.children },
          prefix + childPrefix,
        ).split("\n").slice(1).join("\n"));
      } else {
        lines.push(prefix + connector + child.name);
      }
    }
  }

  return lines.join("\n");
}
