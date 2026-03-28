declare module "markdown-it-texmath" {
  import type MarkdownIt from "markdown-it";
  interface TexmathOptions {
    engine: unknown;
    delimiters: string;
    katexOptions?: { throwOnError?: boolean };
  }
  const plugin: MarkdownIt.PluginWithOptions<TexmathOptions>;
  export default plugin;
}

declare module "temml" {
  const temml: {
    renderToString: (tex: string, options?: Record<string, unknown>) => string;
    renderToMathMLTree: (tex: string, options?: Record<string, unknown>) => unknown;
  };
  export default temml;
}
