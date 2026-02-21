import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { renderMarkdown, renderCSV, sanitize } from '@monokeros/renderer';
import { RENDER_CACHE_MAX_ENTRIES, RENDER_CACHE_TTL_MS } from '@monokeros/constants';
import { MermaidService } from '../mermaid/mermaid.service';
import type { RenderResult } from '@monokeros/renderer';

interface CacheEntry {
  result: string;
  timestamp: number;
}

const EVICTION_INTERVAL_MS = 60_000;

@Injectable()
export class RenderService implements OnModuleDestroy {
  private cache = new Map<string, CacheEntry>();
  private evictionTimer = setInterval(() => this.evictExpired(), EVICTION_INTERVAL_MS);

  constructor(private mermaidService: MermaidService) {}

  onModuleDestroy() {
    clearInterval(this.evictionTimer);
  }

  private evictExpired() {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp >= RENDER_CACHE_TTL_MS) this.cache.delete(key);
    }
  }

  async renderMarkdown(source: string): Promise<RenderResult> {
    const hash = this.hashContent('md:' + source);
    const cached = this.cache.get(hash);
    if (cached && Date.now() - cached.timestamp < RENDER_CACHE_TTL_MS) {
      return JSON.parse(cached.result);
    }

    const result = renderMarkdown(source);
    if (result.hasMermaid) {
      result.html = await this.mermaidService.renderDiagrams(result.html);
    }
    this.setCache(hash, JSON.stringify(result));
    return result;
  }

  async renderFile(content: string, fileName: string): Promise<string> {
    const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
    const hash = this.hashContent(`file:${ext}:${content}`);
    const cached = this.cache.get(hash);
    if (cached && Date.now() - cached.timestamp < RENDER_CACHE_TTL_MS) {
      return cached.result;
    }

    let html = '';
    if (ext === 'md' || ext === 'markdown') {
      const result = await this.renderMarkdown(content);
      html = result.html;
    } else if (ext === 'csv') {
      html = renderCSV(content, ',');
    } else if (ext === 'tsv') {
      html = renderCSV(content, '\t');
    } else if (ext === 'html' || ext === 'htm') {
      html = sanitize(content);
    }

    this.setCache(hash, html);
    return html;
  }

  private setCache(hash: string, value: string): void {
    // Evict oldest entries if at capacity
    if (this.cache.size >= RENDER_CACHE_MAX_ENTRIES) {
      const firstKey = this.cache.keys().next().value as string;
      this.cache.delete(firstKey);
    }
    this.cache.set(hash, { result: value, timestamp: Date.now() });
  }

  private hashContent(content: string): string {
    // Bun.hash is a fast built-in hash
    return Bun.hash(content).toString(36);
  }
}
