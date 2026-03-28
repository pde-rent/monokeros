/** Convert a display name to a URL-safe slug: 'My Workspace' → 'my-workspace' */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
