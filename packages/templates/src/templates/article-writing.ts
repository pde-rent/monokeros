import { AiProvider, WorkspaceIndustry, TaskPriority } from '@monokeros/types';
import type { TemplateManifest } from '../types';
import {
  trendAnalyst, dataScout, researchLead, sourceAuditor,
  contentArchitect, copywriterLead, contentEditor,
  contentDevLead, contentFrontendDev,
  opsLead, distributionSpecialist,
  contentSeoLead, analyticsSpecialist,
  adLead, affiliateSpecialist,
} from './_shared/agents';
import {
  trendTeam, deepResearchTeam, contentStructuringTeam,
  copywritingTeam, contentDevTeam, publishingOpsTeam,
  contentSeoTeam, advertisementTeam,
} from './_shared/teams';

export const articleWritingTemplate: TemplateManifest = {
  id: 'article-writing',
  version: '1.0.0',
  displayName: 'Article Writing Studio',
  description: 'Content production pipeline from trend identification to publication and monetization.',
  longDescription: `## Article Writing Studio

A complete AI workforce for a content production operation. Covers the full lifecycle from trend identification through writing, editing, publishing, SEO, and monetization.

### Teams

- **Trend Identification** — Spot viral topics and emerging narratives
- **Deep Research** — Investigate topics thoroughly with source verification
- **Content Structuring** — Design article outlines and narrative arcs
- **Copywriting** — Write and edit publication-ready content
- **Dev (Blog Platform)** — Build and maintain the publishing platform
- **Publishing Ops** — Schedule releases and manage distribution
- **SEO** — Optimize discoverability and track search performance
- **Advertisement** — Monetize content through ads and affiliates

### Workflow Phases

1. **Research** — Trend identification and deep research
2. **Planning** — Content structuring and outline creation
3. **Drafting** — Copywriting and initial drafts
4. **Review** — Editorial review and fact-checking
5. **Optimization** — SEO, performance tuning, ad placement
6. **Publishing** — Release scheduling and cross-platform distribution`,
  author: 'MonokerOS',
  icon: 'PenNib',
  category: 'content_media',
  tags: ['content', 'writing', 'articles', 'blog', 'seo', 'publishing'],
  pricing: 'free',
  agentCount: 15,
  teamCount: 8,
  workspace: {
    apiVersion: 'v1',
    kind: 'Workspace',
    metadata: { name: 'article-writing', labels: { template: 'article-writing' }, annotations: {} },
    spec: {
      displayName: 'Article Writing Studio',
      description: 'Content production pipeline from trend identification to publication',
      industry: WorkspaceIndustry.MARKETING_COMMUNICATIONS,
      industrySubtype: null,
      branding: { logo: null, color: '#6366f1' },
      encryption: { atRest: true, inTransit: true },
      storage: { maxDriveSizeMb: 500 },
      defaults: {
        phases: ['research', 'planning', 'drafting', 'review', 'optimization', 'publishing'],
        taskTypes: [],
        taskPriority: TaskPriority.MEDIUM,
      },
      providers: [],
      defaultProvider: AiProvider.ZAI,
    },
  },
  agents: [
    trendAnalyst(), dataScout(),
    researchLead(), sourceAuditor(),
    contentArchitect(),
    copywriterLead(), contentEditor(),
    contentDevLead(), contentFrontendDev(),
    opsLead(), distributionSpecialist(),
    contentSeoLead(), analyticsSpecialist(),
    adLead(), affiliateSpecialist(),
  ],
  teams: [
    trendTeam(), deepResearchTeam(), contentStructuringTeam(),
    copywritingTeam(), contentDevTeam(), publishingOpsTeam(),
    contentSeoTeam(), advertisementTeam(),
  ],
};
