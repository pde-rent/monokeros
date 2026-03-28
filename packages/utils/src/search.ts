export function buildSearchKey(key: string, value: string): string {
  if (value.includes(" ")) return `${key}:'${value}'`;
  return `${key}:${value}`;
}

/**
 * Create a reusable text filter for a list of items.
 * Returns a function that filters items by checking if any of the specified
 * fields contain the query string (case-insensitive).
 *
 * Usage:
 *   const filterMembers = createTextFilter<Member>("name", "title");
 *   const results = filterMembers(members, "neo");
 */
export function createTextFilter<T>(...fields: (keyof T)[]) {
  return (items: T[], query: string): T[] => {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter((item) =>
      fields.some((f) => String(item[f] ?? "").toLowerCase().includes(q)),
    );
  };
}
