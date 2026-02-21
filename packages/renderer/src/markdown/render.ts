import { getMarkdownPipeline } from './pipeline';
import { sanitize } from '../sanitize';
import type { RenderResult } from '../types';

/**
 * Render markdown source to sanitized HTML.
 * Returns the HTML string plus metadata about special content.
 */
export function renderMarkdown(source: string): RenderResult {
  const md = getMarkdownPipeline();
  const rawHtml = md.render(source);
  const html = sanitize(rawHtml);
  return {
    html,
    hasMermaid: rawHtml.includes('mermaid-diagram'),
    hasMath: rawHtml.includes('<math'),
  };
}

/**
 * Render inline markdown (no block elements like paragraphs).
 * Useful for single-line content.
 */
export function renderMarkdownInline(source: string): string {
  const md = getMarkdownPipeline();
  return sanitize(md.renderInline(source));
}
