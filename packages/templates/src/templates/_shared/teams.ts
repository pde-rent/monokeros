import type { TeamManifest } from '@monokeros/types';

/** Helper to build a TeamManifest. */
function team(
  name: string,
  displayName: string,
  type: string,
  color: string,
  lead: string,
  members: string[],
): TeamManifest {
  return {
    apiVersion: 'v1',
    kind: 'Team',
    metadata: { name, labels: {}, annotations: {} },
    spec: { displayName, type, color, lead, members, drive: { enabled: true, maxSizeMb: 200 } },
  };
}

// ── Shared: Software Agency Teams ──────────────────────

export const pmTeam = (): TeamManifest =>
  team('product-management', 'Product Management', 'management', '#8b5cf6', 'pm-lead', ['pm-analyst']);

export const designTeam = (): TeamManifest =>
  team('design', 'UI/UX Design', 'design', '#ec4899', 'design-lead', ['ux-designer']);

export const qaTeam = (): TeamManifest =>
  team('qa', 'Quality Assurance', 'engineering', '#14b8a6', 'qa-lead', ['qa-engineer']);

export const devopsTeam = (): TeamManifest =>
  team('devops', 'DevOps', 'engineering', '#f59e0b', 'devops-lead', ['devops-infra']);

export const accountingTeam = (): TeamManifest =>
  team('accounting', 'Accounting', 'operations', '#6b7280', 'accounting-lead', ['accounting-analyst']);

// ── Web Dev Agency Specific ────────────────────────────

export const webDevTeam = (): TeamManifest =>
  team('development', 'Web Development', 'engineering', '#3b82f6', 'frontend-lead', ['backend-dev', 'fullstack-dev']);

export const seoTeam = (): TeamManifest =>
  team('seo-sea', 'SEO/SEA', 'marketing', '#10b981', 'seo-lead', ['sea-specialist', 'content-strategist']);

export const webDesignTeam = (): TeamManifest =>
  team('design', 'UI/UX Design', 'design', '#ec4899', 'design-lead', ['ux-designer', 'web-designer']);

// ── Mobile Dev Agency Specific ─────────────────────────

export const mobileDevTeam = (): TeamManifest =>
  team('mobile-dev', 'Mobile Development', 'engineering', '#3b82f6', 'mobile-lead', ['ios-dev', 'android-dev', 'flutter-dev']);

export const asoTeam = (): TeamManifest =>
  team('aso', 'App Store Optimization', 'marketing', '#10b981', 'app-store-lead', []);

export const mobileDesignTeam = (): TeamManifest =>
  team('design', 'UI/UX Design', 'design', '#ec4899', 'design-lead', ['ux-designer', 'mobile-designer']);

// ── Law Firm Teams ─────────────────────────────────────

export const litigationTeam = (): TeamManifest =>
  team('litigation', 'Litigation', 'legal', '#ef4444', 'litigation-lead', ['litigation-associate', 'paralegal']);

export const corporateTeam = (): TeamManifest =>
  team('corporate', 'Corporate', 'legal', '#3b82f6', 'corporate-lead', ['corporate-associate']);

export const complianceTeam = (): TeamManifest =>
  team('compliance', 'Compliance & Research', 'legal', '#f59e0b', 'compliance-officer', ['legal-researcher']);

export const clientServicesTeam = (): TeamManifest =>
  team('client-services', 'Client Services', 'operations', '#8b5cf6', 'client-relations', []);

// ── Article Writing / Content Production Teams ───────

export const trendTeam = (): TeamManifest =>
  team('trend-identification', 'Trend Identification', 'research', '#6366f1', 'trend-analyst', ['data-scout']);

export const deepResearchTeam = (): TeamManifest =>
  team('deep-research', 'Deep Research', 'research', '#8b5cf6', 'research-lead', ['source-auditor']);

export const contentStructuringTeam = (): TeamManifest =>
  team('content-structuring', 'Content Structuring', 'content', '#14b8a6', 'content-architect', []);

export const copywritingTeam = (): TeamManifest =>
  team('copywriting', 'Copywriting', 'content', '#ec4899', 'copywriter-lead', ['content-editor']);

export const contentDevTeam = (): TeamManifest =>
  team('content-dev', 'Dev (Blog Platform)', 'engineering', '#3b82f6', 'content-dev-lead', ['content-frontend-dev']);

export const publishingOpsTeam = (): TeamManifest =>
  team('publishing-ops', 'Publishing Ops', 'operations', '#f59e0b', 'ops-lead', ['distribution-specialist']);

export const contentSeoTeam = (): TeamManifest =>
  team('content-seo', 'SEO', 'marketing', '#10b981', 'content-seo-lead', ['analytics-specialist']);

export const advertisementTeam = (): TeamManifest =>
  team('advertisement', 'Advertisement', 'marketing', '#f97316', 'ad-lead', ['affiliate-specialist']);
