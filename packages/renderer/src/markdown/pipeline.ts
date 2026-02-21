/// <reference path="../vendor.d.ts" />
import MarkdownIt from 'markdown-it';
import Prism from 'prismjs';
import texmath from 'markdown-it-texmath';
import temml from 'temml';
import { mermaidPlugin } from './plugins/mermaid';
import { mentionLinksPlugin } from './plugins/mention-links';
import { headingIdsPlugin } from './plugins/heading-ids';

// Load additional Prism languages
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-toml';
import 'prismjs/components/prism-ruby';
import 'prismjs/components/prism-swift';
import 'prismjs/components/prism-kotlin';
import 'prismjs/components/prism-php';

/**
 * Create a configured markdown-it instance with all plugins.
 */
export function createMarkdownPipeline(): MarkdownIt {
  const md = new MarkdownIt({
    html: false,
    linkify: true,
    typographer: true,
    highlight(str: string, lang: string): string {
      const grammar = lang && Prism.languages[lang];
      if (grammar) {
        const highlighted = Prism.highlight(str, grammar, lang);
        return `<pre class="language-${lang}"><code class="language-${lang}">${highlighted}</code></pre>`;
      }
      return `<pre class="language-plaintext"><code>${md.utils.escapeHtml(str)}</code></pre>`;
    },
  });

  // LaTeX math via Temml (lighter alternative to KaTeX)
  md.use(texmath, {
    engine: temml,
    delimiters: 'dollars',
  });

  // Mermaid code blocks -> placeholder divs
  md.use(mermaidPlugin);

  // @mentions, #projects, ~tasks, :files -> styled spans
  md.use(mentionLinksPlugin);

  // Heading IDs for anchor navigation
  md.use(headingIdsPlugin);

  return md;
}

// Singleton for reuse
let _pipeline: MarkdownIt | null = null;
export function getMarkdownPipeline(): MarkdownIt {
  if (!_pipeline) _pipeline = createMarkdownPipeline();
  return _pipeline;
}
