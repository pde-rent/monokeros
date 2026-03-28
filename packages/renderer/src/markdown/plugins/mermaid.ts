import type MarkdownIt from "markdown-it";

/**
 * Custom markdown-it plugin for mermaid code blocks.
 * Replaces ```mermaid fenced blocks with placeholder divs
 * that can be hydrated client-side with the mermaid library.
 */
export function mermaidPlugin(md: MarkdownIt): void {
  const defaultFence = md.renderer.rules.fence!;

  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const info = token.info.trim().toLowerCase();

    if (info === "mermaid") {
      const encoded = Buffer.from(token.content).toString("base64");
      const escaped = md.utils.escapeHtml(token.content);
      return (
        `<div class="mermaid-diagram" data-source="${encoded}">` +
        `<pre class="mermaid-source"><code>${escaped}</code></pre>` +
        `</div>`
      );
    }

    return defaultFence(tokens, idx, options, env, self);
  };
}
