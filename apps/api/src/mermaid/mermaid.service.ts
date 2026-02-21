import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import type { Browser, Page } from 'puppeteer';

const MAX_CACHE_SIZE = 256;
const PLACEHOLDER_RE = /<div class="mermaid-diagram" data-source="([^"]+)">[^]*?<\/div>/g;

@Injectable()
export class MermaidService implements OnModuleDestroy {
  private readonly logger = new Logger(MermaidService.name);
  private browser: Browser | null = null;
  private page: Page | null = null;
  private initPromise: Promise<void> | null = null;
  private svgCache = new Map<string, string>();
  private renderCounter = 0;

  async onModuleDestroy() {
    await this.browser?.close();
    this.browser = null;
    this.page = null;
  }

  async renderDiagrams(html: string): Promise<string> {
    if (!html.includes('mermaid-diagram')) return html;

    const matches: { fullMatch: string; source: string }[] = [];
    let m: RegExpExecArray | null;
    const re = new RegExp(PLACEHOLDER_RE.source, PLACEHOLDER_RE.flags);
    while ((m = re.exec(html)) !== null) {
      const encoded = m[1];
      try {
        const source = Buffer.from(encoded, 'base64').toString('utf-8');
        matches.push({ fullMatch: m[0], source });
      } catch {
        // Invalid base64 — skip
      }
    }

    if (matches.length === 0) return html;

    const page = await this.ensureBrowser();
    let result = html;

    for (const { fullMatch, source } of matches) {
      const cacheKey = Bun.hash(source).toString(36);
      let svg = this.svgCache.get(cacheKey);

      if (!svg) {
        try {
          const id = `mermaid-${this.renderCounter++}`;
          svg = await page.evaluate(
            async (src: string, diagId: string) => {
              // @ts-expect-error - runs in browser context where window.mermaid exists
              const { svg: rendered } = await window.mermaid.render(diagId, src);
              return rendered;
            },
            source,
            id,
          );

          if (svg) {
            // LRU eviction
            if (this.svgCache.size >= MAX_CACHE_SIZE) {
              const firstKey = this.svgCache.keys().next().value as string;
              this.svgCache.delete(firstKey);
            }
            this.svgCache.set(cacheKey, svg);
          }
        } catch (err) {
          this.logger.warn(`Mermaid render failed: ${err instanceof Error ? err.message : err}`);
          // Leave the placeholder with source fallback in place
          continue;
        }
      }

      if (svg) {
        result = result.replace(
          fullMatch,
          `<div class="mermaid-diagram">${svg}</div>`,
        );
      }
    }

    return result;
  }

  private async ensureBrowser(): Promise<Page> {
    if (this.page) return this.page;

    if (!this.initPromise) {
      this.initPromise = this.launchBrowser();
    }
    await this.initPromise;
    return this.page!;
  }

  private async launchBrowser(): Promise<void> {
    this.logger.log('Launching headless browser for mermaid rendering...');
    const puppeteer = await import('puppeteer');
    this.browser = await puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    this.page = await this.browser.newPage();

    await this.page.setContent(`
      <!DOCTYPE html>
      <html><head></head><body>
        <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
        <script>
          mermaid.initialize({
            startOnLoad: false,
            theme: 'dark',
            securityLevel: 'loose',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          });
        </script>
      </body></html>
    `);

    // Wait for mermaid to be available
    await this.page.waitForFunction('typeof window.mermaid !== "undefined" && typeof window.mermaid.render === "function"', {
      timeout: 15_000,
    });

    this.logger.log('Mermaid rendering engine ready');
  }
}
