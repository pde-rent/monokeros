import type MarkdownIt from "markdown-it";

/**
 * Plugin to add id attributes to heading elements for anchor navigation.
 * Converts heading text to URL-safe slugs (lowercase, hyphens).
 */
export function headingIdsPlugin(md: MarkdownIt): void {
  md.renderer.rules.heading_open = (tokens, idx, options, _env, self) => {
    const token = tokens[idx];
    const contentToken = tokens[idx + 1];
    if (contentToken?.type === "inline" && contentToken.content) {
      const slug = contentToken.content
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      token.attrSet("id", slug);
    }
    return self.renderToken(tokens, idx, options);
  };
}
