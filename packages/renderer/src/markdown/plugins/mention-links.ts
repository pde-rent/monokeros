import type MarkdownIt from 'markdown-it';
import type StateInline from 'markdown-it/lib/rules_inline/state_inline.mjs';

const TRIGGER_RE = /^([@#~:])([\w][\w.-]*)/;

const TYPE_MAP: Record<string, string> = {
  '@': 'agent',
  '#': 'project',
  '~': 'task',
  ':': 'file',
};

/**
 * Inline rule to convert @agent, #project, ~task, :file patterns
 * into styled spans within rendered markdown.
 */
export function mentionLinksPlugin(md: MarkdownIt): void {
  md.inline.ruler.after('emphasis', 'mention', (state: StateInline, silent: boolean) => {
    // Only trigger at start of input or after whitespace
    if (state.pos > 0) {
      const prev = state.src.charCodeAt(state.pos - 1);
      // Space=32, newline=10, tab=9
      if (prev !== 32 && prev !== 10 && prev !== 9) return false;
    }

    const src = state.src.slice(state.pos);
    const match = src.match(TRIGGER_RE);
    if (!match) return false;
    if (silent) return true;

    const [full, prefix, name] = match;
    const token = state.push('mention', '', 0);
    token.content = full;
    token.meta = { prefix, name };
    state.pos += full.length;
    return true;
  });

  md.renderer.rules.mention = (tokens, idx) => {
    const { prefix, name } = tokens[idx].meta as { prefix: string; name: string };
    const type = TYPE_MAP[prefix] || 'unknown';
    const escapedName = md.utils.escapeHtml(name);
    return `<span class="mention mention-${type}" data-mention-type="${type}" data-mention-name="${escapedName}">${prefix}${escapedName}</span>`;
  };
}
