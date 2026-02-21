import { AiProvider, WorkspaceIndustry, TaskPriority } from '@monokeros/types';
import type { TemplateManifest } from '../types';
import {
  pmLead, pmAnalyst,
  qaLead, qaEngineer,
  devopsLead, devopsInfra,
  designLead, uxDesigner, webDesigner,
  accountingLead, accountingAnalyst,
  frontendLead, backendDev, fullstackDev,
  seoLead, seaSpecialist, contentStrategist,
} from './_shared/agents';
import {
  pmTeam, qaTeam, devopsTeam, accountingTeam,
  webDevTeam, seoTeam, webDesignTeam,
} from './_shared/teams';

export const webDevAgencyTemplate: TemplateManifest = {
  id: 'web-dev-agency',
  version: '1.0.0',
  displayName: 'Web Development Agency',
  description: 'Full-stack web agency with PM, design, development, QA, DevOps, SEO, and accounting teams.',
  longDescription: `## Web Development Agency Template

A complete AI workforce for a web development agency. Seven teams covering the full project lifecycle from discovery to deployment.

### Teams

- **Product Management** — Requirements gathering, PRDs, sprint planning, and delivery tracking
- **UI/UX Design** — Design systems, wireframes, responsive web design, and UX research
- **Web Development** — React/Next.js frontend, Node.js backend, and fullstack delivery
- **Quality Assurance** — Test strategy, automated testing, and quality gates
- **DevOps** — CI/CD pipelines, infrastructure provisioning, and monitoring
- **SEO/SEA** — Organic growth strategy, paid search campaigns, and content marketing
- **Accounting** — Budget tracking, financial reporting, and cost analysis

### Workflow Phases

1. **Intake** — Client onboarding and project scoping
2. **Discovery** — Stakeholder interviews and requirements analysis
3. **PRD/Proposal** — Product requirements and technical proposal
4. **Kickoff** — Sprint planning and team alignment
5. **Design** — Wireframes, mockups, and design system
6. **Development** — Frontend, backend, and integration
7. **Testing** — QA, E2E tests, and cross-validation
8. **Deployment** — Staging, production, and monitoring setup
9. **Handoff** — Documentation, training, and support transition`,
  author: 'MonokerOS',
  icon: 'Globe',
  category: 'software',
  tags: ['web', 'development', 'react', 'nextjs', 'fullstack', 'seo'],
  pricing: 'free',
  agentCount: 17,
  teamCount: 7,
  workspace: {
    apiVersion: 'v1',
    kind: 'Workspace',
    metadata: { name: 'web-dev-agency', labels: { template: 'web-dev-agency' }, annotations: {} },
    spec: {
      displayName: 'Web Development Agency',
      description: 'Full-stack web development agency workspace',
      industry: WorkspaceIndustry.SOFTWARE_DEVELOPMENT,
      industrySubtype: 'web',
      branding: { logo: null, color: '#3b82f6' },
      encryption: { atRest: true, inTransit: true },
      storage: { maxDriveSizeMb: 500 },
      defaults: {
        phases: ['intake', 'discovery', 'prd-proposal', 'kickoff', 'design', 'development', 'testing', 'deployment', 'handoff'],
        taskTypes: [],
        taskPriority: TaskPriority.MEDIUM,
      },
      providers: [],
      defaultProvider: AiProvider.ZAI,
    },
  },
  agents: [
    pmLead(), pmAnalyst(),
    designLead(), uxDesigner(), webDesigner(),
    frontendLead(), backendDev(), fullstackDev(),
    qaLead(), qaEngineer(),
    devopsLead(), devopsInfra(),
    seoLead(), seaSpecialist(), contentStrategist(),
    accountingLead(), accountingAnalyst(),
  ],
  teams: [pmTeam(), webDesignTeam(), webDevTeam(), qaTeam(), devopsTeam(), seoTeam(), accountingTeam()],
};
