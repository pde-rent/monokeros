import { Workspace, AiProvider, WorkspaceIndustry, WorkspaceStatus } from '@monokeros/types';

export const workspaces: Workspace[] = [
  {
    id: 'ws_01',
    name: 'du-v2',
    displayName: 'DU v2',
    slug: 'du-v2',
    industry: WorkspaceIndustry.SOFTWARE_DEVELOPMENT,
    industrySubtype: null,
    status: WorkspaceStatus.ACTIVE,
    branding: { logo: null, color: '#6366f1' },
    taskTypes: [
      { name: 'feature', label: 'Feature', color: '#10b981' },
      { name: 'bug', label: 'Bug', color: '#ef4444' },
      { name: 'devops', label: 'DevOps', color: '#06b6d4' },
      { name: 'design', label: 'Design', color: '#ec4899' },
      { name: 'documentation', label: 'Documentation', color: '#64748b' },
      { name: 'research', label: 'Research', color: '#6366f1' },
      { name: 'testing', label: 'Testing', color: '#f59e0b' },
      { name: 'refactor', label: 'Refactor', color: '#8b5cf6' },
    ],
    providers: [{
      provider: AiProvider.ZAI,
      baseUrl: 'https://api.z.ai/api/coding/paas/v4',
      apiKey: process.env.ZAI_API_KEY ?? '',
      defaultModel: 'glm-5',
      label: 'Z.ai Default',
    }],
    defaultProviderId: AiProvider.ZAI,
    createdAt: '2025-10-01T00:00:00Z',
    archivedAt: null,
  },
];
