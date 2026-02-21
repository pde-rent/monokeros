import { Injectable } from '@nestjs/common';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import type { KnowledgeSearchResult } from '@monokeros/types';
import { KnowledgeSearchCategory, KnowledgeSearchScope } from '@monokeros/types';
import { KNOWLEDGE_DIR, KNOWLEDGE_SEARCH_MAX_RESULTS, KNOWLEDGE_MAX_FILE_SIZE } from '@monokeros/constants';
import { MockStore } from '../store/mock-store';
import { getDataDir, getTeamDataDir, getProjectDataDir, getWorkspaceDataDir } from '../common/data-dir';

interface KnowledgeScope {
  category: KnowledgeSearchCategory;
  ownerId: string;
  dir: string;
  scope: KnowledgeSearchScope;
  scopeLabel: string;
}

@Injectable()
export class KnowledgeService {
  private readonly memberDataDir = getDataDir();
  private readonly teamDataDir = getTeamDataDir();
  private readonly projectDataDir = getProjectDataDir();
  private readonly workspaceDataDir = getWorkspaceDataDir();

  constructor(private store: MockStore) {}

  /** Resolve all KNOWLEDGE directories accessible to a member */
  resolveScopes(memberId: string): KnowledgeScope[] {
    const member = this.store.members.get(memberId);
    if (!member) return [];

    const scopes: KnowledgeScope[] = [];

    // Workspace KNOWLEDGE (always accessible)
    scopes.push({
      category: KnowledgeSearchCategory.WORKSPACE,
      ownerId: 'shared',
      dir: join(this.workspaceDataDir, KNOWLEDGE_DIR),
      scope: KnowledgeSearchScope.WORKSPACE,
      scopeLabel: 'Workspace',
    });

    // Personal KNOWLEDGE
    scopes.push({
      category: KnowledgeSearchCategory.MEMBERS,
      ownerId: memberId,
      dir: join(this.memberDataDir, memberId, KNOWLEDGE_DIR),
      scope: KnowledgeSearchScope.PERSONAL,
      scopeLabel: member.name,
    });

    // Team KNOWLEDGE
    if (member.teamId) {
      const team = this.store.teams.get(member.teamId);
      scopes.push({
        category: KnowledgeSearchCategory.TEAMS,
        ownerId: member.teamId,
        dir: join(this.teamDataDir, member.teamId, KNOWLEDGE_DIR),
        scope: KnowledgeSearchScope.TEAM,
        scopeLabel: team?.name ?? member.teamId,
      });
    }

    // For system agents, add all team drives
    if (member.system) {
      for (const team of this.store.teams.values()) {
        if (team.id === member.teamId) continue;
        scopes.push({
          category: KnowledgeSearchCategory.TEAMS,
          ownerId: team.id,
          dir: join(this.teamDataDir, team.id, KNOWLEDGE_DIR),
          scope: KnowledgeSearchScope.TEAM,
          scopeLabel: team.name,
        });
      }
    }

    // Assigned project KNOWLEDGE
    for (const project of this.store.projects.values()) {
      if (project.assignedMemberIds.includes(memberId) || member.system) {
        scopes.push({
          category: KnowledgeSearchCategory.PROJECTS,
          ownerId: project.id,
          dir: join(this.projectDataDir, project.id, KNOWLEDGE_DIR),
          scope: KnowledgeSearchScope.PROJECT,
          scopeLabel: project.name,
        });
      }
    }

    return scopes;
  }

  /** Lexical search across all accessible KNOWLEDGE directories */
  async search(
    query: string,
    memberId: string,
    filterScopes?: string[],
    maxResults = KNOWLEDGE_SEARCH_MAX_RESULTS,
  ): Promise<KnowledgeSearchResult[]> {
    const scopes = this.resolveScopes(memberId);
    const filtered = filterScopes?.length
      ? scopes.filter((s) => filterScopes.includes(s.scope))
      : scopes;

    const results: KnowledgeSearchResult[] = [];
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return [];

    for (const scope of filtered) {
      if (!existsSync(scope.dir)) continue;

      const files = await this.scanKnowledgeDir(scope.dir);
      for (const filePath of files) {
        const st = await stat(filePath);
        if (st.size > KNOWLEDGE_MAX_FILE_SIZE) continue;

        const content = await readFile(filePath, 'utf-8');
        const fileName = filePath.split('/').pop()!;
        const relativePath = '/' + KNOWLEDGE_DIR + '/' + filePath.slice(scope.dir.length + 1);

        const score = this.scoreMatch(fileName, content, terms);
        if (score <= 0) continue;

        const snippet = this.extractSnippet(content, terms);

        results.push({
          category: scope.category,
          ownerId: scope.ownerId,
          path: relativePath,
          fileName,
          scope: scope.scope,
          scopeLabel: scope.scopeLabel,
          snippet,
          score,
        });
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
  }

  /** Recursively list all files in a KNOWLEDGE directory */
  private async scanKnowledgeDir(dir: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...await this.scanKnowledgeDir(full));
      } else {
        files.push(full);
      }
    }
    return files;
  }

  /** Score a file against search terms (filename > headings > body) */
  private scoreMatch(fileName: string, content: string, terms: string[]): number {
    const fileNameLower = fileName.toLowerCase();
    const contentLower = content.toLowerCase();

    // Extract headings
    const headings = content
      .split('\n')
      .filter((line) => line.startsWith('#'))
      .map((line) => line.replace(/^#+\s*/, '').toLowerCase());
    const headingText = headings.join(' ');

    let score = 0;
    for (const term of terms) {
      // Filename match (highest weight)
      if (fileNameLower.includes(term)) score += 10;
      // Heading match (medium weight)
      if (headingText.includes(term)) score += 5;
      // Body match (base weight)
      if (contentLower.includes(term)) score += 1;
    }

    return score;
  }

  /** Extract a relevant snippet around the first matching term */
  private extractSnippet(content: string, terms: string[]): string {
    const contentLower = content.toLowerCase();
    let bestIdx = -1;

    for (const term of terms) {
      const idx = contentLower.indexOf(term);
      if (idx >= 0 && (bestIdx < 0 || idx < bestIdx)) {
        bestIdx = idx;
      }
    }

    if (bestIdx < 0) {
      return content.slice(0, 200).replace(/\n/g, ' ').trim();
    }

    const start = Math.max(0, bestIdx - 80);
    const end = Math.min(content.length, bestIdx + 120);
    let snippet = content.slice(start, end).replace(/\n/g, ' ').trim();
    if (start > 0) snippet = '...' + snippet;
    if (end < content.length) snippet = snippet + '...';
    return snippet;
  }
}
