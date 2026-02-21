import type { Team, Permission, TaskTypeDefinition } from '@monokeros/types';
import {
  ConsensusState,
  TaskStatus,
  MemberStatus,
  TaskPriority,
  DiagramViewMode,
  WorkspaceIndustry,
  HumanAcceptanceStatus,
  DEFAULT_ENTITY_COLOR,
} from '@monokeros/types';

// ── Defaults ────────────────────────────────────────

export { DEFAULT_ENTITY_COLOR };

// ── Permissions ─────────────────────────────────────

export const PERMISSIONS = {
  members: { read: 'members:read', write: 'members:write', manage: 'members:manage' },
  teams: { read: 'teams:read', write: 'teams:write' },
  projects: { read: 'projects:read', write: 'projects:write', manage: 'projects:manage' },
  tasks: { read: 'tasks:read', write: 'tasks:write' },
  conversations: { read: 'conversations:read', write: 'conversations:write' },
  files: { read: 'files:read', write: 'files:write' },
  workspace: { admin: 'workspace:admin' },
} as const;

export const DEFAULT_AGENT_PERMISSIONS: Permission[] = [
  PERMISSIONS.members.read, PERMISSIONS.teams.read, PERMISSIONS.projects.read,
  PERMISSIONS.tasks.read, PERMISSIONS.tasks.write,
  PERMISSIONS.conversations.read, PERMISSIONS.conversations.write,
  PERMISSIONS.files.read, PERMISSIONS.files.write,
];

/** Preset colors for workspace/project/team color pickers */
export const PRESET_COLORS: string[] = [
  '#8b5cf6', // purple (violet-500)
  '#3b82f6', // blue (blue-500)
  '#06b6d4', // cyan (cyan-500)
  '#10b981', // green (emerald-500)
  '#f59e0b', // amber (amber-500)
  '#ef4444', // red (red-500)
  '#ec4899', // pink (pink-500)
  '#6366f1', // indigo (indigo-500)
];

// ── Team ─────────────────────────────────────────────

export function getTeamColor(team?: Team | null): string {
  return team?.color ?? 'var(--color-accent-purple)';
}

// ── Member Status ───────────────────────────────────

export const MEMBER_STATUS_COLORS: Record<MemberStatus, string> = {
  [MemberStatus.IDLE]: 'var(--color-status-idle)',
  [MemberStatus.WORKING]: 'var(--color-status-working)',
  [MemberStatus.REVIEWING]: 'var(--color-status-reviewing)',
  [MemberStatus.BLOCKED]: 'var(--color-status-blocked)',
  [MemberStatus.OFFLINE]: 'var(--color-status-offline)',
};

export const MEMBER_STATUS_LABELS: Record<MemberStatus, string> = {
  [MemberStatus.IDLE]: 'Idle',
  [MemberStatus.WORKING]: 'Working',
  [MemberStatus.REVIEWING]: 'Reviewing',
  [MemberStatus.BLOCKED]: 'Blocked',
  [MemberStatus.OFFLINE]: 'Offline',
};

export const MEMBER_STATUS_ORDER: Record<MemberStatus, number> = {
  [MemberStatus.WORKING]: 0,
  [MemberStatus.REVIEWING]: 1,
  [MemberStatus.IDLE]: 2,
  [MemberStatus.BLOCKED]: 3,
  [MemberStatus.OFFLINE]: 4,
};

// ── Task Status ──────────────────────────────────────

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  [TaskStatus.BACKLOG]: 'var(--color-status-offline)',
  [TaskStatus.TODO]: 'var(--color-status-idle)',
  [TaskStatus.IN_PROGRESS]: 'var(--color-status-working)',
  [TaskStatus.IN_REVIEW]: 'var(--color-status-reviewing)',
  [TaskStatus.AWAITING_ACCEPTANCE]: 'var(--color-status-reviewing)',
  [TaskStatus.DONE]: 'var(--color-accent-green)',
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  [TaskStatus.BACKLOG]: 'Backlog',
  [TaskStatus.TODO]: 'To Do',
  [TaskStatus.IN_PROGRESS]: 'In Progress',
  [TaskStatus.IN_REVIEW]: 'In Review',
  [TaskStatus.AWAITING_ACCEPTANCE]: 'Awaiting Acceptance',
  [TaskStatus.DONE]: 'Done',
};

export const TASK_STATUS_COLUMNS: { status: TaskStatus; label: string }[] = Object.values(TaskStatus).map(
  (status) => ({ status, label: TASK_STATUS_LABELS[status] }),
);

// ── Task Priority ────────────────────────────────────

export const PRIORITY_COLORS = {
  critical: 'var(--color-priority-critical)',
  high: 'var(--color-priority-high)',
  medium: 'var(--color-priority-medium)',
  low: 'var(--color-priority-low)',
  none: 'var(--color-priority-none)',
} as const;

export const PRIORITY_ORDER: Record<TaskPriority, number> = {
  [TaskPriority.CRITICAL]: 0,
  [TaskPriority.HIGH]: 1,
  [TaskPriority.MEDIUM]: 2,
  [TaskPriority.LOW]: 3,
  [TaskPriority.NONE]: 4,
};

// ── Cross Validation ─────────────────────────────────

export const CONFIDENCE_COLORS = {
  high: 'var(--color-confidence-high)',
  medium: 'var(--color-confidence-medium)',
  low: 'var(--color-confidence-low)',
  not_started: 'var(--color-confidence-not-started)',
} as const;

export const CONSENSUS_STATE_COLORS: Record<ConsensusState, string> = {
  [ConsensusState.EXECUTING]: 'var(--color-consensus-executing)',
  [ConsensusState.COMPARING]: 'var(--color-consensus-comparing)',
  [ConsensusState.MATCHED]: 'var(--color-consensus-matched)',
  [ConsensusState.DISCREPANCY]: 'var(--color-consensus-discrepancy)',
  [ConsensusState.RETRYING]: 'var(--color-consensus-retrying)',
  [ConsensusState.ESCALATED]: 'var(--color-consensus-escalated)',
  [ConsensusState.RESOLVED]: 'var(--color-consensus-resolved)',
};

export const CONSENSUS_STATE_LABELS: Record<ConsensusState, string> = {
  [ConsensusState.EXECUTING]: 'Executing',
  [ConsensusState.COMPARING]: 'Comparing',
  [ConsensusState.MATCHED]: 'Matched',
  [ConsensusState.DISCREPANCY]: 'Discrepancy',
  [ConsensusState.RETRYING]: 'Retrying',
  [ConsensusState.ESCALATED]: 'Escalated',
  [ConsensusState.RESOLVED]: 'Resolved',
};

// ── Human Acceptance ─────────────────────────────────

export const HUMAN_ACCEPTANCE_STATUS_LABELS: Record<HumanAcceptanceStatus, string> = {
  [HumanAcceptanceStatus.PENDING]: 'Pending',
  [HumanAcceptanceStatus.ACCEPTED]: 'Accepted',
  [HumanAcceptanceStatus.REJECTED]: 'Rejected',
};

export const HUMAN_ACCEPTANCE_STATUS_COLORS: Record<HumanAcceptanceStatus, string> = {
  [HumanAcceptanceStatus.PENDING]: 'var(--color-status-reviewing)',
  [HumanAcceptanceStatus.ACCEPTED]: 'var(--color-accent-green)',
  [HumanAcceptanceStatus.REJECTED]: 'var(--color-priority-critical)',
};

// ── Notifications ───────────────────────────────────

export const NOTIFICATION_POLL_INTERVAL_MS = 30_000;

// ── Industry Presets ─────────────────────────────────

export interface IndustrySubtype {
  value: string;
  label: string;
}

export interface IndustryDefaultTeam {
  name: string;
  type: string;
  displayName: string;
  color: string;
}

export interface IndustryPreset {
  label: string;
  description: string;
  icon: string;
  subtypes: IndustrySubtype[];
  defaultTeams: IndustryDefaultTeam[];
  defaultPhases: string[];
}

export const INDUSTRY_SUBTYPES: Record<WorkspaceIndustry, string[]> = {
  [WorkspaceIndustry.SOFTWARE_DEVELOPMENT]: ['web', 'mobile', 'web3', 'ai_ml', 'gaming', 'embedded', 'desktop'],
  [WorkspaceIndustry.MARKETING_COMMUNICATIONS]: ['digital_marketing', 'advertising', 'pr_comms', 'growth'],
  [WorkspaceIndustry.CREATIVE_DESIGN]: ['branding', 'ux_product', 'content_production', 'web_design'],
  [WorkspaceIndustry.MANAGEMENT_CONSULTING]: ['strategy', 'operations', 'technology', 'organizational'],
  [WorkspaceIndustry.CUSTOM]: [],
  [WorkspaceIndustry.LEGAL]: ['corporate', 'litigation', 'ip', 'compliance'],
  [WorkspaceIndustry.FINANCIAL_SERVICES]: ['banking', 'insurance', 'investment', 'fintech'],
  [WorkspaceIndustry.RECRUITMENT_HR]: ['executive_search', 'staffing', 'hr_consulting', 'talent_acquisition'],
  [WorkspaceIndustry.COMPLIANCE_RISK]: ['regulatory', 'audit', 'risk_management', 'data_privacy'],
  [WorkspaceIndustry.TRANSLATION_LOCALIZATION]: ['document', 'software', 'multimedia', 'transcreation'],
  [WorkspaceIndustry.SUPPLY_CHAIN_LOGISTICS]: ['procurement', 'warehousing', 'transportation', 'planning'],
  [WorkspaceIndustry.DATA_ANALYTICS]: ['business_intelligence', 'data_engineering', 'ml_ops', 'research'],
  [WorkspaceIndustry.HEALTHCARE_LIFE_SCIENCES]: ['clinical', 'pharmaceutical', 'medical_devices', 'health_it'],
  [WorkspaceIndustry.REAL_ESTATE]: ['commercial', 'residential', 'property_management', 'development'],
  [WorkspaceIndustry.EDUCATION_TRAINING]: ['k12', 'higher_ed', 'corporate_training', 'edtech'],
};

function mapSubtypes(industry: WorkspaceIndustry, ...replacements: [RegExp, string][]): IndustrySubtype[] {
  return INDUSTRY_SUBTYPES[industry].map((s) => {
    let label = s.replace(/_/g, ' ');
    for (const [re, rep] of replacements) label = label.replace(re, rep);
    return { value: s, label: label.replace(/\b\w/g, (c) => c.toUpperCase()) };
  });
}

export const WORKSPACE_INDUSTRIES: Record<WorkspaceIndustry, IndustryPreset> = {
  [WorkspaceIndustry.SOFTWARE_DEVELOPMENT]: {
    label: 'Software Development',
    description: 'Build software products with engineering, design, QA, and DevOps teams',
    icon: 'code',
    subtypes: mapSubtypes(WorkspaceIndustry.SOFTWARE_DEVELOPMENT, [/\bai ml\b/, 'AI/ML']),
    defaultTeams: [
      { name: 'product-management', type: 'product', displayName: 'Product Management', color: '#8b5cf6' },
      { name: 'ui-ux-design', type: 'design', displayName: 'UI/UX Design', color: '#ec4899' },
      { name: 'development', type: 'engineering', displayName: 'Development', color: '#10b981' },
      { name: 'testing-qa', type: 'qa', displayName: 'Testing/QA', color: '#f59e0b' },
      { name: 'devops', type: 'infrastructure', displayName: 'DevOps', color: '#06b6d4' },
      { name: 'seo-marketing', type: 'marketing', displayName: 'SEO/Marketing', color: '#f97316' },
      { name: 'research', type: 'research', displayName: 'Research', color: '#6366f1' },
      { name: 'documentation', type: 'docs', displayName: 'Documentation', color: '#64748b' },
    ],
    defaultPhases: ['intake', 'discovery', 'prd-proposal', 'kickoff', 'design', 'development', 'testing', 'deployment', 'handoff'],
  },
  [WorkspaceIndustry.MARKETING_COMMUNICATIONS]: {
    label: 'Marketing & Communications',
    description: 'Plan and execute marketing campaigns, content, and communications',
    icon: 'megaphone',
    subtypes: mapSubtypes(WorkspaceIndustry.MARKETING_COMMUNICATIONS, [/\bpr comms\b/, 'PR & Communications']),
    defaultTeams: [
      { name: 'strategy', type: 'strategy', displayName: 'Strategy', color: '#8b5cf6' },
      { name: 'content', type: 'content', displayName: 'Content', color: '#ec4899' },
      { name: 'creative', type: 'creative', displayName: 'Creative', color: '#f59e0b' },
      { name: 'analytics', type: 'analytics', displayName: 'Analytics', color: '#06b6d4' },
      { name: 'media', type: 'media', displayName: 'Media', color: '#10b981' },
    ],
    defaultPhases: ['brief', 'research', 'strategy', 'creative-development', 'production', 'review', 'launch', 'reporting'],
  },
  [WorkspaceIndustry.CREATIVE_DESIGN]: {
    label: 'Creative & Design',
    description: 'Branding, UX/product design, content production, and web design',
    icon: 'palette',
    subtypes: mapSubtypes(WorkspaceIndustry.CREATIVE_DESIGN, [/\bux product\b/, 'UX/Product']),
    defaultTeams: [
      { name: 'design', type: 'design', displayName: 'Design', color: '#ec4899' },
      { name: 'art-direction', type: 'creative', displayName: 'Art Direction', color: '#f59e0b' },
      { name: 'copywriting', type: 'content', displayName: 'Copywriting', color: '#8b5cf6' },
      { name: 'production', type: 'production', displayName: 'Production', color: '#10b981' },
    ],
    defaultPhases: ['brief', 'discovery', 'concept', 'design', 'refinement', 'production', 'delivery'],
  },
  [WorkspaceIndustry.MANAGEMENT_CONSULTING]: {
    label: 'Management Consulting',
    description: 'Strategy, operations, technology, and organizational consulting',
    icon: 'briefcase',
    subtypes: mapSubtypes(WorkspaceIndustry.MANAGEMENT_CONSULTING),
    defaultTeams: [
      { name: 'engagement', type: 'engagement', displayName: 'Engagement', color: '#8b5cf6' },
      { name: 'research', type: 'research', displayName: 'Research', color: '#06b6d4' },
      { name: 'analysis', type: 'analysis', displayName: 'Analysis', color: '#10b981' },
      { name: 'delivery', type: 'delivery', displayName: 'Delivery', color: '#f59e0b' },
    ],
    defaultPhases: ['scoping', 'discovery', 'analysis', 'synthesis', 'recommendations', 'presentation', 'implementation-support'],
  },
  [WorkspaceIndustry.CUSTOM]: {
    label: 'Custom / Blank',
    description: 'Start from scratch with your own teams and phases',
    icon: 'settings',
    subtypes: [],
    defaultTeams: [],
    defaultPhases: [],
  },
  [WorkspaceIndustry.LEGAL]: {
    label: 'Legal',
    description: 'Legal services including corporate, litigation, IP, and compliance',
    icon: 'scale',
    subtypes: mapSubtypes(WorkspaceIndustry.LEGAL, [/\bip\b/, 'IP']),
    defaultTeams: [
      { name: 'litigation', type: 'litigation', displayName: 'Litigation', color: '#ef4444' },
      { name: 'corporate', type: 'corporate', displayName: 'Corporate', color: '#8b5cf6' },
      { name: 'contracts', type: 'contracts', displayName: 'Contracts', color: '#10b981' },
      { name: 'compliance', type: 'compliance', displayName: 'Compliance', color: '#f59e0b' },
      { name: 'research', type: 'research', displayName: 'Research', color: '#6366f1' },
      { name: 'paralegal', type: 'paralegal', displayName: 'Paralegal', color: '#64748b' },
    ],
    defaultPhases: ['intake', 'research', 'analysis', 'drafting', 'review', 'filing', 'resolution'],
  },
  [WorkspaceIndustry.FINANCIAL_SERVICES]: {
    label: 'Financial Services',
    description: 'Banking, insurance, investment, and fintech operations',
    icon: 'landmark',
    subtypes: mapSubtypes(WorkspaceIndustry.FINANCIAL_SERVICES),
    defaultTeams: [
      { name: 'advisory', type: 'advisory', displayName: 'Advisory', color: '#8b5cf6' },
      { name: 'risk-management', type: 'risk', displayName: 'Risk Management', color: '#ef4444' },
      { name: 'compliance', type: 'compliance', displayName: 'Compliance', color: '#f59e0b' },
      { name: 'operations', type: 'operations', displayName: 'Operations', color: '#10b981' },
      { name: 'analytics', type: 'analytics', displayName: 'Analytics', color: '#3b82f6' },
      { name: 'client-services', type: 'client-services', displayName: 'Client Services', color: '#06b6d4' },
    ],
    defaultPhases: ['intake', 'due-diligence', 'analysis', 'modeling', 'review', 'approval', 'execution', 'reporting'],
  },
  [WorkspaceIndustry.RECRUITMENT_HR]: {
    label: 'Recruitment & HR',
    description: 'Talent acquisition, staffing, and HR consulting',
    icon: 'users',
    subtypes: mapSubtypes(WorkspaceIndustry.RECRUITMENT_HR, [/\bhr\b/, 'HR']),
    defaultTeams: [
      { name: 'talent-acquisition', type: 'sourcing', displayName: 'Talent Acquisition', color: '#8b5cf6' },
      { name: 'screening', type: 'screening', displayName: 'Screening', color: '#f59e0b' },
      { name: 'hr-operations', type: 'hr-ops', displayName: 'HR Operations', color: '#10b981' },
      { name: 'onboarding', type: 'onboarding', displayName: 'Onboarding', color: '#06b6d4' },
      { name: 'compensation', type: 'compensation', displayName: 'Compensation', color: '#3b82f6' },
      { name: 'training', type: 'training', displayName: 'Training', color: '#ec4899' },
    ],
    defaultPhases: ['requisition', 'sourcing', 'screening', 'interview', 'offer', 'onboarding', 'follow-up'],
  },
  [WorkspaceIndustry.COMPLIANCE_RISK]: {
    label: 'Compliance & Risk',
    description: 'Regulatory compliance, audit, risk management, and data privacy',
    icon: 'shield',
    subtypes: mapSubtypes(WorkspaceIndustry.COMPLIANCE_RISK),
    defaultTeams: [
      { name: 'audit', type: 'audit', displayName: 'Audit', color: '#ef4444' },
      { name: 'risk-assessment', type: 'risk', displayName: 'Risk Assessment', color: '#f59e0b' },
      { name: 'regulatory', type: 'regulatory', displayName: 'Regulatory', color: '#8b5cf6' },
      { name: 'policy', type: 'policy', displayName: 'Policy', color: '#10b981' },
      { name: 'data-privacy', type: 'privacy', displayName: 'Data Privacy', color: '#06b6d4' },
      { name: 'monitoring', type: 'monitoring', displayName: 'Monitoring', color: '#3b82f6' },
    ],
    defaultPhases: ['scoping', 'assessment', 'testing', 'findings', 'remediation', 'validation', 'reporting'],
  },
  [WorkspaceIndustry.TRANSLATION_LOCALIZATION]: {
    label: 'Translation & Localization',
    description: 'Document, software, multimedia, and transcreation services',
    icon: 'globe',
    subtypes: mapSubtypes(WorkspaceIndustry.TRANSLATION_LOCALIZATION),
    defaultTeams: [
      { name: 'translation', type: 'translation', displayName: 'Translation', color: '#8b5cf6' },
      { name: 'review-editing', type: 'review', displayName: 'Review & Editing', color: '#f59e0b' },
      { name: 'localization-engineering', type: 'engineering', displayName: 'Localization Engineering', color: '#10b981' },
      { name: 'terminology', type: 'terminology', displayName: 'Terminology', color: '#06b6d4' },
      { name: 'project-management', type: 'project', displayName: 'Project Management', color: '#ec4899' },
    ],
    defaultPhases: ['analysis', 'preparation', 'translation', 'review', 'localization', 'qa', 'delivery'],
  },
  [WorkspaceIndustry.SUPPLY_CHAIN_LOGISTICS]: {
    label: 'Supply Chain & Logistics',
    description: 'Procurement, warehousing, transportation, and planning',
    icon: 'truck',
    subtypes: mapSubtypes(WorkspaceIndustry.SUPPLY_CHAIN_LOGISTICS),
    defaultTeams: [
      { name: 'procurement', type: 'procurement', displayName: 'Procurement', color: '#8b5cf6' },
      { name: 'warehousing', type: 'warehousing', displayName: 'Warehousing', color: '#f59e0b' },
      { name: 'transportation', type: 'transportation', displayName: 'Transportation', color: '#10b981' },
      { name: 'planning', type: 'planning', displayName: 'Planning', color: '#3b82f6' },
      { name: 'quality-control', type: 'quality', displayName: 'Quality Control', color: '#ef4444' },
      { name: 'analytics', type: 'analytics', displayName: 'Analytics', color: '#06b6d4' },
    ],
    defaultPhases: ['planning', 'sourcing', 'procurement', 'production', 'logistics', 'delivery', 'review'],
  },
  [WorkspaceIndustry.DATA_ANALYTICS]: {
    label: 'Data & Analytics',
    description: 'Business intelligence, data engineering, ML ops, and research',
    icon: 'chart',
    subtypes: mapSubtypes(WorkspaceIndustry.DATA_ANALYTICS, [/\bml ops\b/, 'ML Ops']),
    defaultTeams: [
      { name: 'data-engineering', type: 'engineering', displayName: 'Data Engineering', color: '#10b981' },
      { name: 'analytics', type: 'analytics', displayName: 'Analytics', color: '#3b82f6' },
      { name: 'data-science', type: 'data-science', displayName: 'Data Science', color: '#8b5cf6' },
      { name: 'visualization', type: 'visualization', displayName: 'Visualization', color: '#ec4899' },
      { name: 'ml-ops', type: 'ml-ops', displayName: 'ML Ops', color: '#f59e0b' },
      { name: 'governance', type: 'governance', displayName: 'Governance', color: '#64748b' },
    ],
    defaultPhases: ['requirements', 'data-collection', 'processing', 'analysis', 'modeling', 'validation', 'deployment', 'monitoring'],
  },
  [WorkspaceIndustry.HEALTHCARE_LIFE_SCIENCES]: {
    label: 'Healthcare & Life Sciences',
    description: 'Clinical, pharmaceutical, medical devices, and health IT',
    icon: 'heart-pulse',
    subtypes: mapSubtypes(WorkspaceIndustry.HEALTHCARE_LIFE_SCIENCES, [/\bhealth it\b/, 'Health IT']),
    defaultTeams: [
      { name: 'clinical', type: 'clinical', displayName: 'Clinical', color: '#ef4444' },
      { name: 'regulatory', type: 'regulatory', displayName: 'Regulatory', color: '#f59e0b' },
      { name: 'research', type: 'research', displayName: 'Research', color: '#8b5cf6' },
      { name: 'quality-assurance', type: 'quality', displayName: 'Quality Assurance', color: '#10b981' },
      { name: 'patient-services', type: 'patient-services', displayName: 'Patient Services', color: '#06b6d4' },
      { name: 'health-it', type: 'health-it', displayName: 'Health IT', color: '#3b82f6' },
    ],
    defaultPhases: ['discovery', 'protocol', 'study', 'data-collection', 'analysis', 'review', 'submission', 'monitoring'],
  },
  [WorkspaceIndustry.REAL_ESTATE]: {
    label: 'Real Estate',
    description: 'Commercial, residential, property management, and development',
    icon: 'building',
    subtypes: mapSubtypes(WorkspaceIndustry.REAL_ESTATE),
    defaultTeams: [
      { name: 'acquisitions', type: 'acquisitions', displayName: 'Acquisitions', color: '#8b5cf6' },
      { name: 'property-management', type: 'management', displayName: 'Property Management', color: '#10b981' },
      { name: 'leasing', type: 'leasing', displayName: 'Leasing', color: '#f59e0b' },
      { name: 'marketing', type: 'marketing', displayName: 'Marketing', color: '#ec4899' },
      { name: 'legal', type: 'legal', displayName: 'Legal', color: '#64748b' },
      { name: 'finance', type: 'finance', displayName: 'Finance', color: '#3b82f6' },
    ],
    defaultPhases: ['prospecting', 'due-diligence', 'negotiation', 'closing', 'onboarding', 'management', 'reporting'],
  },
  [WorkspaceIndustry.EDUCATION_TRAINING]: {
    label: 'Education & Training',
    description: 'K-12, higher education, corporate training, and edtech',
    icon: 'graduation-cap',
    subtypes: mapSubtypes(WorkspaceIndustry.EDUCATION_TRAINING, [/\bk12\b/, 'K-12'], [/\bhigher ed\b/, 'Higher Education']),
    defaultTeams: [
      { name: 'curriculum', type: 'curriculum', displayName: 'Curriculum', color: '#8b5cf6' },
      { name: 'instruction', type: 'instruction', displayName: 'Instruction', color: '#10b981' },
      { name: 'assessment', type: 'assessment', displayName: 'Assessment', color: '#f59e0b' },
      { name: 'edtech', type: 'edtech', displayName: 'EdTech', color: '#3b82f6' },
      { name: 'administration', type: 'administration', displayName: 'Administration', color: '#64748b' },
      { name: 'student-services', type: 'student-services', displayName: 'Student Services', color: '#06b6d4' },
    ],
    defaultPhases: ['planning', 'design', 'development', 'review', 'pilot', 'delivery', 'evaluation', 'iteration'],
  },
};

/** Industries available for launch (not behind feature flag) */
export const LAUNCH_INDUSTRIES: WorkspaceIndustry[] = [
  WorkspaceIndustry.SOFTWARE_DEVELOPMENT,
  WorkspaceIndustry.MARKETING_COMMUNICATIONS,
  WorkspaceIndustry.CREATIVE_DESIGN,
  WorkspaceIndustry.MANAGEMENT_CONSULTING,
  WorkspaceIndustry.CUSTOM,
];

// ── Team Presets ────────────────────────────────────

export const TEAM_PRESETS: IndustryDefaultTeam[] = [
  { name: 'development', type: 'engineering', displayName: 'Development', color: '#10b981' },
  { name: 'design', type: 'design', displayName: 'Design', color: '#ec4899' },
  { name: 'product-management', type: 'product', displayName: 'Product Management', color: '#8b5cf6' },
  { name: 'project-management', type: 'project', displayName: 'Project Management', color: '#a855f7' },
  { name: 'qa', type: 'qa', displayName: 'QA', color: '#f59e0b' },
  { name: 'devops', type: 'infrastructure', displayName: 'DevOps', color: '#06b6d4' },
  { name: 'marketing', type: 'marketing', displayName: 'Marketing', color: '#f97316' },
  { name: 'sales', type: 'sales', displayName: 'Sales', color: '#22c55e' },
  { name: 'customer-support', type: 'support', displayName: 'Customer Support', color: '#14b8a6' },
  { name: 'hr', type: 'hr', displayName: 'HR', color: '#e879f9' },
  { name: 'finance', type: 'finance', displayName: 'Finance', color: '#eab308' },
  { name: 'accounting', type: 'accounting', displayName: 'Accounting', color: '#a3e635' },
  { name: 'legal', type: 'legal', displayName: 'Legal', color: '#64748b' },
  { name: 'compliance', type: 'compliance', displayName: 'Compliance', color: '#94a3b8' },
  { name: 'research', type: 'research', displayName: 'Research', color: '#6366f1' },
  { name: 'data', type: 'data', displayName: 'Data', color: '#3b82f6' },
  { name: 'security', type: 'security', displayName: 'Security', color: '#ef4444' },
  { name: 'operations', type: 'operations', displayName: 'Operations', color: '#78716c' },
  { name: 'content', type: 'content', displayName: 'Content', color: '#fb923c' },
  { name: 'training', type: 'training', displayName: 'Training', color: '#38bdf8' },
];

// ── Industry Task Types ─────────────────────────────

export const INDUSTRY_TASK_TYPES: Record<WorkspaceIndustry, TaskTypeDefinition[]> = {
  [WorkspaceIndustry.SOFTWARE_DEVELOPMENT]: [
    { name: 'feature', label: 'Feature', color: '#10b981' },
    { name: 'bug', label: 'Bug', color: '#ef4444' },
    { name: 'devops', label: 'DevOps', color: '#06b6d4' },
    { name: 'design', label: 'Design', color: '#ec4899' },
    { name: 'documentation', label: 'Documentation', color: '#64748b' },
    { name: 'research', label: 'Research', color: '#6366f1' },
    { name: 'testing', label: 'Testing', color: '#f59e0b' },
    { name: 'refactor', label: 'Refactor', color: '#8b5cf6' },
  ],
  [WorkspaceIndustry.MARKETING_COMMUNICATIONS]: [
    { name: 'campaign', label: 'Campaign', color: '#ec4899' },
    { name: 'content', label: 'Content', color: '#8b5cf6' },
    { name: 'analytics', label: 'Analytics', color: '#06b6d4' },
    { name: 'creative', label: 'Creative', color: '#f59e0b' },
    { name: 'strategy', label: 'Strategy', color: '#10b981' },
    { name: 'media-buy', label: 'Media Buy', color: '#f97316' },
  ],
  [WorkspaceIndustry.CREATIVE_DESIGN]: [
    { name: 'design', label: 'Design', color: '#ec4899' },
    { name: 'art-direction', label: 'Art Direction', color: '#f59e0b' },
    { name: 'copywriting', label: 'Copywriting', color: '#8b5cf6' },
    { name: 'production', label: 'Production', color: '#10b981' },
    { name: 'review', label: 'Review', color: '#06b6d4' },
  ],
  [WorkspaceIndustry.MANAGEMENT_CONSULTING]: [
    { name: 'analysis', label: 'Analysis', color: '#10b981' },
    { name: 'research', label: 'Research', color: '#6366f1' },
    { name: 'deliverable', label: 'Deliverable', color: '#8b5cf6' },
    { name: 'engagement', label: 'Engagement', color: '#f59e0b' },
    { name: 'presentation', label: 'Presentation', color: '#ec4899' },
  ],
  [WorkspaceIndustry.LEGAL]: [
    { name: 'case-work', label: 'Case Work', color: '#ef4444' },
    { name: 'contract', label: 'Contract', color: '#10b981' },
    { name: 'research', label: 'Research', color: '#6366f1' },
    { name: 'filing', label: 'Filing', color: '#f59e0b' },
    { name: 'review', label: 'Review', color: '#06b6d4' },
    { name: 'compliance', label: 'Compliance', color: '#8b5cf6' },
  ],
  [WorkspaceIndustry.FINANCIAL_SERVICES]: [
    { name: 'analysis', label: 'Analysis', color: '#3b82f6' },
    { name: 'audit', label: 'Audit', color: '#ef4444' },
    { name: 'compliance', label: 'Compliance', color: '#f59e0b' },
    { name: 'reporting', label: 'Reporting', color: '#64748b' },
    { name: 'risk', label: 'Risk', color: '#8b5cf6' },
    { name: 'client-service', label: 'Client Service', color: '#06b6d4' },
  ],
  [WorkspaceIndustry.RECRUITMENT_HR]: [
    { name: 'sourcing', label: 'Sourcing', color: '#8b5cf6' },
    { name: 'screening', label: 'Screening', color: '#f59e0b' },
    { name: 'interview', label: 'Interview', color: '#10b981' },
    { name: 'onboarding', label: 'Onboarding', color: '#06b6d4' },
    { name: 'policy', label: 'Policy', color: '#64748b' },
    { name: 'training', label: 'Training', color: '#ec4899' },
  ],
  [WorkspaceIndustry.COMPLIANCE_RISK]: [
    { name: 'audit', label: 'Audit', color: '#ef4444' },
    { name: 'assessment', label: 'Assessment', color: '#f59e0b' },
    { name: 'remediation', label: 'Remediation', color: '#10b981' },
    { name: 'reporting', label: 'Reporting', color: '#64748b' },
    { name: 'policy', label: 'Policy', color: '#8b5cf6' },
    { name: 'monitoring', label: 'Monitoring', color: '#3b82f6' },
  ],
  [WorkspaceIndustry.TRANSLATION_LOCALIZATION]: [
    { name: 'translation', label: 'Translation', color: '#8b5cf6' },
    { name: 'review', label: 'Review', color: '#f59e0b' },
    { name: 'localization', label: 'Localization', color: '#10b981' },
    { name: 'terminology', label: 'Terminology', color: '#06b6d4' },
    { name: 'qa', label: 'QA', color: '#ef4444' },
  ],
  [WorkspaceIndustry.SUPPLY_CHAIN_LOGISTICS]: [
    { name: 'procurement', label: 'Procurement', color: '#8b5cf6' },
    { name: 'logistics', label: 'Logistics', color: '#10b981' },
    { name: 'inventory', label: 'Inventory', color: '#f59e0b' },
    { name: 'planning', label: 'Planning', color: '#3b82f6' },
    { name: 'compliance', label: 'Compliance', color: '#64748b' },
    { name: 'reporting', label: 'Reporting', color: '#06b6d4' },
  ],
  [WorkspaceIndustry.DATA_ANALYTICS]: [
    { name: 'analysis', label: 'Analysis', color: '#3b82f6' },
    { name: 'pipeline', label: 'Pipeline', color: '#10b981' },
    { name: 'visualization', label: 'Visualization', color: '#ec4899' },
    { name: 'modeling', label: 'Modeling', color: '#8b5cf6' },
    { name: 'data-quality', label: 'Data Quality', color: '#f59e0b' },
    { name: 'research', label: 'Research', color: '#6366f1' },
  ],
  [WorkspaceIndustry.HEALTHCARE_LIFE_SCIENCES]: [
    { name: 'clinical', label: 'Clinical', color: '#ef4444' },
    { name: 'regulatory', label: 'Regulatory', color: '#f59e0b' },
    { name: 'research', label: 'Research', color: '#8b5cf6' },
    { name: 'documentation', label: 'Documentation', color: '#64748b' },
    { name: 'quality', label: 'Quality', color: '#10b981' },
    { name: 'patient-care', label: 'Patient Care', color: '#06b6d4' },
  ],
  [WorkspaceIndustry.REAL_ESTATE]: [
    { name: 'listing', label: 'Listing', color: '#8b5cf6' },
    { name: 'transaction', label: 'Transaction', color: '#10b981' },
    { name: 'inspection', label: 'Inspection', color: '#f59e0b' },
    { name: 'marketing', label: 'Marketing', color: '#ec4899' },
    { name: 'legal', label: 'Legal', color: '#64748b' },
    { name: 'management', label: 'Management', color: '#3b82f6' },
  ],
  [WorkspaceIndustry.EDUCATION_TRAINING]: [
    { name: 'curriculum', label: 'Curriculum', color: '#8b5cf6' },
    { name: 'content', label: 'Content', color: '#ec4899' },
    { name: 'assessment', label: 'Assessment', color: '#f59e0b' },
    { name: 'delivery', label: 'Delivery', color: '#10b981' },
    { name: 'research', label: 'Research', color: '#6366f1' },
    { name: 'administration', label: 'Administration', color: '#64748b' },
  ],
  [WorkspaceIndustry.CUSTOM]: [],
};

// ── View Modes ───────────────────────────────────────

export const DIAGRAM_VIEW_MODE_LABELS: Record<DiagramViewMode, string> = {
  [DiagramViewMode.WORKFORCE]: 'Workforce',
  [DiagramViewMode.MANAGEMENT]: 'Management',
  [DiagramViewMode.PROJECT]: 'Project',
};

// ── File System ─────────────────────────────────────

/** System files that cannot be renamed or deleted */
export const SYSTEM_FILES = new Set([
  // ZeroClaw canonical (subset we use)
  'SOUL.md',
  'IDENTITY.md',
  'AGENTS.md',
  'SKILLS.md',
  // MonokerOS extensions
  'FOUNDATION.md',
  'config.toml',
  'MONOKEROS.md',
  // Avatar files
  'avatar.svg',
  'avatar.png',
]);

/** Directories that cannot be renamed or deleted */
export const PROTECTED_DIRECTORIES = new Set(['KNOWLEDGE']);

// ── System Agent ────────────────────────────────────

export const SYSTEM_AGENT_MONO = 'system_mono';
export const SYSTEM_AGENT_KEROS = 'system_keros';
export const SYSTEM_AGENTS = [SYSTEM_AGENT_MONO, SYSTEM_AGENT_KEROS] as const;

// ── Knowledge System ────────────────────────────────

export const KNOWLEDGE_DIR = 'KNOWLEDGE';
export const KNOWLEDGE_SEARCH_MAX_RESULTS = 20;
export const KNOWLEDGE_MAX_FILE_SIZE = 512 * 1024;

// ── Gateway Config (shared between API gateways) ────

export const WS_OPEN = 1;

export const WS_GATEWAY_CONFIG = {
  cors: { origin: 'http://localhost:3000' },
} as const;

// ── Network / Ports ─────────────────────────────────

export const API_PORT = 3001;

// ── Timeouts (ms) ───────────────────────────────────

export const LLM_TIMEOUT_MS = 300_000;
export const HEALTH_CHECK_TIMEOUT_MS = 2_000;
export const STARTUP_TIMEOUT_MS = 15_000;
export const GRACEFUL_SHUTDOWN_MS = 3_000;
export const TOOL_REQUEST_TIMEOUT_MS = 15_000;
export const LOGIN_TIMEOUT_MS = 10_000;
export const INIT_TIMEOUT_MS = 5_000;
export const FILE_FETCH_TIMEOUT_MS = 5_000;
export const API_REQUEST_TIMEOUT_MS = 30_000;
export const MESSAGE_SEND_TIMEOUT_MS = 130_000;

// ── Cache ───────────────────────────────────────────

export const RENDER_CACHE_TTL_MS = 5 * 60 * 1000;
export const RENDER_CACHE_MAX_ENTRIES = 1_000;

// ── Polling / Stale Times (ms) ──────────────────────

export const QUERY_STALE_TIME_MS = 30_000;
export const RENDER_STALE_TIME_MS = 60_000;
export const RUNTIME_POLL_INTERVAL_MS = 10_000;
export const LATENCY_PING_INTERVAL_MS = 10_000;

// ── Auth Lockout ────────────────────────────────────

export const AUTH_MAX_ATTEMPTS = 5;
export const AUTH_LOCKOUT_MS = 15 * 60 * 1000;
export const AUTH_ATTEMPT_WINDOW_MS = 5 * 60 * 1000;
export const AUTH_BACKOFF_DELAYS_MS = [0, 1_000, 2_000, 4_000, 8_000];

// ── Streaming ──────────────────────────────────────

/** Delay between emitting each paragraph chunk (ms) */
export const STREAM_PARAGRAPH_DELAY_MS = 600;

// ── ZeroClaw Daemon ─────────────────────────────────

export const DAEMON_MAX_HISTORY = 50;
export const DEFAULT_ZAI_BASE_URL = 'https://api.z.ai/api/coding/paas/v4';
export const DEFAULT_ZAI_MODEL = 'glm-5';

// ── AI Providers ────────────────────────────────────

export { AI_PROVIDERS } from './providers';
export type { AiProviderInfo } from './providers';

// ── Layout / Sizing ───────────────────────────────────

/** Diagram layout constants */
export const DIAGRAM_LAYOUT = {
  /** Standard node width */
  NODE_WIDTH: 160,
  /** Lead agent node width */
  NODE_WIDTH_LEAD: 180,
  /** Group container width */
  GROUP_WIDTH: 260,
  /** Group header height */
  GROUP_HEADER_H: 40,
  /** Horizontal padding inside groups */
  GROUP_PAD_X: 30,
  /** Vertical padding inside groups */
  GROUP_PAD_Y: 20,
  /** Gap between nodes */
  NODE_GAP: 12,
  /** Gap between groups */
  GROUP_GAP: 50,
} as const;

/** Gantt chart layout constants */
export const GANTT_LAYOUT = {
  /** Width per day in pixels */
  DAY_WIDTH: 24,
  /** Default number of days to show */
  DEFAULT_DAYS: 30,
  /** Width of task label column */
  LABEL_WIDTH: 240,
  /** Height of each row */
  ROW_HEIGHT: 36,
} as const;

/** Panel layout constants */
export const PANEL_LAYOUT = {
  /** Default expanded panel width */
  DEFAULT_WIDTH: 280,
  /** Minimum panel width */
  MIN_WIDTH: 180,
  /** Maximum panel width */
  MAX_WIDTH: 450,
  /** Notch width for collapsed panels */
  NOTCH_WIDTH: 40,
} as const;

/** Common UI element sizes */
export const UI_SIZES = {
  /** Command palette width */
  COMMAND_PALETTE_WIDTH: 480,
  /** Dropdown minimum width */
  DROPDOWN_MIN_WIDTH: 140,
  /** FAB minimum width */
  FAB_MIN_WIDTH: 160,
  /** File tree indentation per level */
  FILE_TREE_INDENT: 12,
  /** Small row height */
  ROW_HEIGHT_SM: 28,
  /** Standard row height */
  ROW_HEIGHT: 36,
} as const;

