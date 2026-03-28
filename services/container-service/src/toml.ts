/**
 * Minimal TOML serializer for ZeroClaw config files.
 * Handles: sections, key-value pairs, arrays of tables, inline tables, and arrays.
 */

type TomlValue = string | number | boolean | TomlValue[] | Record<string, TomlValue>;

function escapeString(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function formatValue(value: TomlValue): string {
  if (typeof value === "string") return escapeString(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    // Check if this is an array of tables (array of objects)
    if (value.length > 0 && typeof value[0] === "object" && !Array.isArray(value[0])) {
      // This should be handled as [[section]] — caller must handle
      return "";
    }
    return `[${value.map(formatValue).join(", ")}]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value)
      .map(([k, v]) => `${k} = ${formatValue(v)}`)
      .join(", ");
    return `{ ${entries} }`;
  }
  return String(value);
}

function serializeSection(
  lines: string[],
  prefix: string,
  obj: Record<string, TomlValue>,
): void {
  const simple: Array<[string, TomlValue]> = [];
  const subsections: Array<[string, Record<string, TomlValue>]> = [];
  const arrayOfTables: Array<[string, Record<string, TomlValue>[]]> = [];

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;

    if (Array.isArray(value) && value.length > 0 && typeof value[0] === "object" && !Array.isArray(value[0])) {
      arrayOfTables.push([key, value as Record<string, TomlValue>[]]);
    } else if (typeof value === "object" && !Array.isArray(value)) {
      subsections.push([key, value as Record<string, TomlValue>]);
    } else {
      simple.push([key, value]);
    }
  }

  // Emit simple key-value pairs
  for (const [key, value] of simple) {
    lines.push(`${key} = ${formatValue(value)}`);
  }

  // Emit subsections
  for (const [key, value] of subsections) {
    const sectionPath = prefix ? `${prefix}.${key}` : key;
    lines.push("");
    lines.push(`[${sectionPath}]`);
    serializeSection(lines, sectionPath, value);
  }

  // Emit arrays of tables
  for (const [key, tables] of arrayOfTables) {
    const sectionPath = prefix ? `${prefix}.${key}` : key;
    for (const table of tables) {
      lines.push("");
      lines.push(`[[${sectionPath}]]`);
      serializeSection(lines, sectionPath, table);
    }
  }
}

export function toToml(obj: Record<string, TomlValue>): string {
  const lines: string[] = [];
  serializeSection(lines, "", obj);
  return lines.join("\n") + "\n";
}
