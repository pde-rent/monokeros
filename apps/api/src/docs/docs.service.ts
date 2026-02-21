import { Injectable } from '@nestjs/common';
import { RenderService } from '../render/render.service';
import { join, resolve } from 'path';
import { existsSync } from 'fs';
import type { RenderResult } from '@monokeros/renderer';

// Try common locations: from apps/api/ cwd or from monorepo root
const candidates = [
  resolve(process.cwd(), 'docs'),
  resolve(process.cwd(), '..', '..', 'docs'),
];
const DOCS_DIR = candidates.find((d) => existsSync(d)) ?? candidates[1];

export interface NavItem {
  title: string;
  path: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export interface NavManifest {
  title: string;
  sections: NavSection[];
}

@Injectable()
export class DocsService {
  constructor(private renderService: RenderService) {}

  async getNav(): Promise<NavManifest> {
    const navPath = join(DOCS_DIR, '_nav.json');
    const file = Bun.file(navPath);
    if (!(await file.exists())) {
      return { title: 'Documentation', sections: [] };
    }
    return file.json();
  }

  async getPage(docPath: string): Promise<RenderResult & { title: string }> {
    // Sanitize path to prevent directory traversal
    const normalized = docPath.replace(/\.\./g, '').replace(/^\/+/, '');
    const filePath = join(DOCS_DIR, `${normalized}.md`);

    const file = Bun.file(filePath);
    if (!(await file.exists())) {
      return { html: '<p>Page not found.</p>', hasMermaid: false, hasMath: false, title: 'Not Found' };
    }

    const source = await file.text();

    // Extract title from first H1
    const titleMatch = source.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : normalized;

    const result = await this.renderService.renderMarkdown(source);
    return { ...result, title };
  }
}
