import type { WorkspaceManifest, AgentManifest, TeamManifest } from '@monokeros/types';

export interface TemplateManifest {
  id: string;
  version: string;
  displayName: string;
  description: string;
  longDescription: string;
  author: string;
  icon: string;
  category: TemplateCategory;
  tags: string[];
  pricing: 'free' | 'premium';
  agentCount: number;
  teamCount: number;
  workspace: WorkspaceManifest;
  agents: AgentManifest[];
  teams: TeamManifest[];
}

export type TemplateCategory = 'legal' | 'software' | 'marketing' | 'consulting' | 'content_media' | 'custom';

/** Lightweight listing (no manifests — for catalog view) */
export type TemplateListing = Omit<TemplateManifest, 'workspace' | 'agents' | 'teams' | 'longDescription'>;
