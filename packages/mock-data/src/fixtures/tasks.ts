import {
  TaskStatus,
  TaskPriority,
  CrossValidationConfidence,
  ConsensusState,
} from '@monokeros/types';
import type { Task } from '@monokeros/types';

export const tasks: Task[] = [
  // E-Commerce Platform (proj_01) - Development phase
  {
    workspaceId: 'ws_01', id: 'task_01', title: 'Define API schema for product catalog', description: 'Create OpenAPI spec for product CRUD endpoints including variants, categories, and inventory.', type: 'feature', projectId: 'proj_01', status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH, assigneeIds: ['agent_pm_lead'], teamId: 'team_pm', phase: 'development', dependencies: [], offloadable: false,
    crossValidation: { id: 'cv_01', taskId: 'task_01', leadId: 'agent_pm_lead', memberResults: [], agreementScore: 0, confidence: CrossValidationConfidence.NOT_STARTED, consensusState: ConsensusState.EXECUTING, synthesis: null, completedAt: null }, requiresHumanAcceptance: false, humanAcceptance: null, acceptanceCriteria: [], inputs: [], outputs: [], conversationId: null, commentCount: 3, createdAt: '2026-02-10T09:00:00Z', updatedAt: '2026-02-17T14:00:00Z',
  },
  {
    workspaceId: 'ws_01', id: 'task_02', title: 'Gather checkout flow requirements', description: 'Interview stakeholders and document checkout process including payment, shipping, and tax calculation.', type: 'research', projectId: 'proj_01', status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH, assigneeIds: ['agent_pm_01', 'agent_pm_02'], teamId: 'team_pm', phase: 'development', dependencies: [], offloadable: false,
    crossValidation: { id: 'cv_02', taskId: 'task_02', leadId: 'agent_pm_lead', memberResults: [{ memberId: 'agent_pm_01', output: 'Multi-step checkout with guest option recommended.', completedAt: '2026-02-16T10:00:00Z' }], agreementScore: 0, confidence: CrossValidationConfidence.NOT_STARTED, consensusState: ConsensusState.EXECUTING, synthesis: null, completedAt: null }, requiresHumanAcceptance: false, humanAcceptance: null, acceptanceCriteria: [], inputs: [], outputs: [], conversationId: null, commentCount: 5, createdAt: '2026-02-10T09:30:00Z', updatedAt: '2026-02-17T11:00:00Z',
  },
  {
    workspaceId: 'ws_01', id: 'task_03', title: 'Implement product listing page', description: 'Build product grid with filtering, sorting, pagination, and search.', type: 'feature', projectId: 'proj_01', status: TaskStatus.TODO, priority: TaskPriority.HIGH, assigneeIds: ['agent_dev_01'], teamId: 'team_dev', phase: 'development', dependencies: ['task_01'], offloadable: false,
    crossValidation: null, requiresHumanAcceptance: false, humanAcceptance: null, acceptanceCriteria: [], inputs: [], outputs: [], conversationId: null, commentCount: 1, createdAt: '2026-02-11T09:00:00Z', updatedAt: '2026-02-11T09:00:00Z',
  },
  {
    workspaceId: 'ws_01', id: 'task_04', title: 'Set up payment gateway integration', description: 'Integrate Stripe for payment processing with support for cards and wallets.', type: 'feature', projectId: 'proj_01', status: TaskStatus.BACKLOG, priority: TaskPriority.CRITICAL, assigneeIds: [], teamId: 'team_dev', phase: 'development', dependencies: ['task_02'], offloadable: false,
    crossValidation: null, requiresHumanAcceptance: false, humanAcceptance: null, acceptanceCriteria: [], inputs: [], outputs: [], conversationId: null, commentCount: 0, createdAt: '2026-02-11T10:00:00Z', updatedAt: '2026-02-11T10:00:00Z',
  },

  // Brand Redesign (proj_02) - Design phase
  {
    workspaceId: 'ws_01', id: 'task_05', title: 'Review logo concepts', description: 'Evaluate three logo concepts against brand guidelines and target audience preferences.', type: 'design', projectId: 'proj_02', status: TaskStatus.IN_REVIEW, priority: TaskPriority.HIGH, assigneeIds: ['agent_design_01', 'agent_design_02'], teamId: 'team_design', phase: 'design', dependencies: [], offloadable: false,
    crossValidation: { id: 'cv_05', taskId: 'task_05', leadId: 'agent_design_lead', memberResults: [
      { memberId: 'agent_design_01', output: 'Concept B strongest - clean, modern, versatile across media.', completedAt: '2026-02-15T14:00:00Z' },
      { memberId: 'agent_design_02', output: 'Concept B preferred - excellent scalability and brand recall.', completedAt: '2026-02-15T15:00:00Z' },
    ], agreementScore: 94, confidence: CrossValidationConfidence.HIGH, consensusState: ConsensusState.MATCHED, synthesis: 'Both agents agree on Concept B. Strong alignment on scalability and brand fit.', completedAt: '2026-02-15T16:00:00Z' }, requiresHumanAcceptance: true, humanAcceptance: null, acceptanceCriteria: [], inputs: [], outputs: [], conversationId: null, commentCount: 8, createdAt: '2026-02-08T09:00:00Z', updatedAt: '2026-02-15T16:00:00Z',
  },
  {
    workspaceId: 'ws_01', id: 'task_06', title: 'Design color palette system', description: 'Create primary, secondary, and accent color scales with accessibility compliance (WCAG AA).', type: 'design', projectId: 'proj_02', status: TaskStatus.IN_PROGRESS, priority: TaskPriority.MEDIUM, assigneeIds: ['agent_design_01'], teamId: 'team_design', phase: 'design', dependencies: ['task_05'], offloadable: false,
    crossValidation: { id: 'cv_06', taskId: 'task_06', leadId: 'agent_design_lead', memberResults: [{ memberId: 'agent_design_01', output: 'Warm neutral base with vibrant accent. All combos pass AA.', completedAt: '2026-02-17T10:00:00Z' }], agreementScore: 0, confidence: CrossValidationConfidence.NOT_STARTED, consensusState: ConsensusState.EXECUTING, synthesis: null, completedAt: null }, requiresHumanAcceptance: false, humanAcceptance: null, acceptanceCriteria: [], inputs: [], outputs: [], conversationId: null, commentCount: 2, createdAt: '2026-02-10T09:00:00Z', updatedAt: '2026-02-17T10:00:00Z',
  },
  {
    workspaceId: 'ws_01', id: 'task_07', title: 'Define typography system', description: 'Select typefaces and define scale for headings, body, captions, and UI elements.', type: 'design', projectId: 'proj_02', status: TaskStatus.IN_PROGRESS, priority: TaskPriority.MEDIUM, assigneeIds: ['agent_design_02'], teamId: 'team_design', phase: 'design', dependencies: ['task_05'], offloadable: true,
    crossValidation: null, requiresHumanAcceptance: false, humanAcceptance: null, acceptanceCriteria: [], inputs: [], outputs: [], conversationId: null, commentCount: 1, createdAt: '2026-02-10T10:00:00Z', updatedAt: '2026-02-16T09:00:00Z',
  },

  // E-Commerce (proj_01) - more dev tasks
  {
    workspaceId: 'ws_01', id: 'task_08', title: 'Architect microservices boundaries', description: 'Define service boundaries, API contracts, and data ownership for product, order, and user services.', type: 'feature', projectId: 'proj_01', status: TaskStatus.IN_PROGRESS, priority: TaskPriority.CRITICAL, assigneeIds: ['agent_dev_01', 'agent_dev_02'], teamId: 'team_dev', phase: 'development', dependencies: [], offloadable: false,
    crossValidation: { id: 'cv_08', taskId: 'task_08', leadId: 'agent_dev_lead', memberResults: [
      { memberId: 'agent_dev_01', output: 'Recommend 3 services: product-catalog, order-mgmt, user-auth. Shared event bus.', completedAt: '2026-02-16T11:00:00Z' },
      { memberId: 'agent_dev_02', output: 'Suggest 4 services: product, order, user, notification. Event-driven with CQRS.', completedAt: '2026-02-16T12:00:00Z' },
    ], agreementScore: 78, confidence: CrossValidationConfidence.MEDIUM, consensusState: ConsensusState.RESOLVED, synthesis: 'Core 3 services agreed. Notification service debated - deferring to phase 2.', completedAt: '2026-02-16T14:00:00Z' }, requiresHumanAcceptance: false, humanAcceptance: null, acceptanceCriteria: [], inputs: [], outputs: [], conversationId: null, commentCount: 12, createdAt: '2026-02-08T09:00:00Z', updatedAt: '2026-02-16T14:00:00Z',
  },
  {
    workspaceId: 'ws_01', id: 'task_09', title: 'Build shopping cart component', description: 'React component for cart with add/remove items, quantity updates, and price calculations.', type: 'feature', projectId: 'proj_01', status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH, assigneeIds: ['agent_dev_01'], teamId: 'team_dev', phase: 'development', dependencies: ['task_08'], offloadable: false,
    crossValidation: null, requiresHumanAcceptance: false, humanAcceptance: null, acceptanceCriteria: [], inputs: [], outputs: [], conversationId: null, commentCount: 4, createdAt: '2026-02-12T09:00:00Z', updatedAt: '2026-02-17T10:00:00Z',
  },
  {
    workspaceId: 'ws_01', id: 'task_10', title: 'Implement order API endpoints', description: 'REST endpoints for order creation, status updates, and order history.', type: 'feature', projectId: 'proj_01', status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH, assigneeIds: ['agent_dev_02'], teamId: 'team_dev', phase: 'development', dependencies: ['task_08'], offloadable: false,
    crossValidation: null, requiresHumanAcceptance: false, humanAcceptance: null, acceptanceCriteria: [], inputs: [], outputs: [], conversationId: null, commentCount: 2, createdAt: '2026-02-12T10:00:00Z', updatedAt: '2026-02-17T09:00:00Z',
  },
  {
    workspaceId: 'ws_01', id: 'task_11', title: 'Set up CI/CD pipeline for staging', description: 'Configure GitHub Actions for automated build, test, and deploy to staging environment.', type: 'devops', projectId: 'proj_01', status: TaskStatus.DONE, priority: TaskPriority.HIGH, assigneeIds: ['agent_devops_01', 'agent_devops_02'], teamId: 'team_devops', phase: 'development', dependencies: [], offloadable: true,
    crossValidation: { id: 'cv_11', taskId: 'task_11', leadId: 'agent_devops_lead', memberResults: [
      { memberId: 'agent_devops_01', output: 'GHA workflow with Docker build, unit tests, and Kubernetes deploy.', completedAt: '2026-02-14T10:00:00Z' },
      { memberId: 'agent_devops_02', output: 'GHA pipeline: lint, test, build Docker image, deploy to K8s staging.', completedAt: '2026-02-14T11:00:00Z' },
    ], agreementScore: 96, confidence: CrossValidationConfidence.HIGH, consensusState: ConsensusState.MATCHED, synthesis: 'Full agreement on GHA + Docker + K8s approach. Pipeline operational.', completedAt: '2026-02-14T13:00:00Z' }, requiresHumanAcceptance: false, humanAcceptance: null, acceptanceCriteria: [], inputs: [], outputs: [], conversationId: null, commentCount: 6, createdAt: '2026-02-06T09:00:00Z', updatedAt: '2026-02-14T13:00:00Z',
  },
  {
    workspaceId: 'ws_01', id: 'task_12', title: 'Write unit tests for product service', description: 'Unit test coverage for product CRUD operations targeting 80% coverage.', type: 'testing', projectId: 'proj_01', status: TaskStatus.TODO, priority: TaskPriority.MEDIUM, assigneeIds: [], teamId: 'team_dev', phase: 'development', dependencies: ['task_03'], offloadable: true,
    crossValidation: null, requiresHumanAcceptance: false, humanAcceptance: null, acceptanceCriteria: [], inputs: [], outputs: [], conversationId: null, commentCount: 0, createdAt: '2026-02-13T09:00:00Z', updatedAt: '2026-02-13T09:00:00Z',
  },

  // Brand Redesign (proj_02) - more tasks
  {
    workspaceId: 'ws_01', id: 'task_13', title: 'Create brand guidelines document', description: 'Comprehensive brand book covering logo usage, colors, typography, imagery, and tone of voice.', type: 'documentation', projectId: 'proj_02', status: TaskStatus.BACKLOG, priority: TaskPriority.MEDIUM, assigneeIds: [], teamId: 'team_design', phase: 'design', dependencies: ['task_05', 'task_06', 'task_07'], offloadable: true,
    crossValidation: null, requiresHumanAcceptance: false, humanAcceptance: null, acceptanceCriteria: [], inputs: [], outputs: [], conversationId: null, commentCount: 0, createdAt: '2026-02-10T11:00:00Z', updatedAt: '2026-02-10T11:00:00Z',
  },
  {
    workspaceId: 'ws_01', id: 'task_14', title: 'Design responsive component library', description: 'Figma component library with responsive variants for buttons, forms, cards, and navigation.', type: 'design', projectId: 'proj_02', status: TaskStatus.TODO, priority: TaskPriority.HIGH, assigneeIds: ['agent_design_01'], teamId: 'team_design', phase: 'design', dependencies: ['task_06', 'task_07'], offloadable: false,
    crossValidation: null, requiresHumanAcceptance: false, humanAcceptance: null, acceptanceCriteria: [], inputs: [], outputs: [], conversationId: null, commentCount: 1, createdAt: '2026-02-10T12:00:00Z', updatedAt: '2026-02-12T10:00:00Z',
  },

  // Mobile App MVP (proj_03) - Testing phase
  {
    workspaceId: 'ws_01', id: 'task_15', title: 'Write E2E tests for auth flow', description: 'End-to-end test suite covering signup, login, password reset, and social auth.', type: 'testing', projectId: 'proj_03', status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH, assigneeIds: ['agent_qa_01'], teamId: 'team_qa', phase: 'testing', dependencies: ['task_23'], offloadable: false,
    crossValidation: null, requiresHumanAcceptance: false, humanAcceptance: null, acceptanceCriteria: [], inputs: [], outputs: [], conversationId: null, commentCount: 3, createdAt: '2026-02-14T09:00:00Z', updatedAt: '2026-02-17T10:00:00Z',
  },
  {
    workspaceId: 'ws_01', id: 'task_16', title: 'Manual QA: notification system', description: 'Manually test push notifications, in-app alerts, and email notifications across devices.', type: 'testing', projectId: 'proj_03', status: TaskStatus.IN_REVIEW, priority: TaskPriority.MEDIUM, assigneeIds: ['agent_qa_01', 'agent_qa_02'], teamId: 'team_qa', phase: 'testing', dependencies: [], offloadable: false,
    crossValidation: { id: 'cv_16', taskId: 'task_16', leadId: 'agent_qa_lead', memberResults: [
      { memberId: 'agent_qa_01', output: 'Push: pass. In-app: pass. Email: 2 issues found (formatting, delay).', completedAt: '2026-02-17T09:00:00Z' },
      { memberId: 'agent_qa_02', output: 'Push: pass. In-app: pass. Email: 2 issues (template broken on Outlook, 30s delay).', completedAt: '2026-02-17T10:00:00Z' },
    ], agreementScore: 91, confidence: CrossValidationConfidence.HIGH, consensusState: ConsensusState.MATCHED, synthesis: 'Agreement on email issues. Two bugs filed: MOBILE-142 (Outlook template), MOBILE-143 (delivery delay).', completedAt: '2026-02-17T11:00:00Z' }, requiresHumanAcceptance: true, humanAcceptance: null, acceptanceCriteria: [], inputs: [], outputs: [], conversationId: null, commentCount: 5, createdAt: '2026-02-14T10:00:00Z', updatedAt: '2026-02-17T11:00:00Z',
  },
  {
    workspaceId: 'ws_01', id: 'task_17', title: 'Configure monitoring dashboards', description: 'Set up Grafana dashboards for API latency, error rates, and user engagement metrics.', type: 'devops', projectId: 'proj_01', status: TaskStatus.IN_PROGRESS, priority: TaskPriority.MEDIUM, assigneeIds: ['agent_devops_lead'], teamId: 'team_devops', phase: 'development', dependencies: ['task_11'], offloadable: true,
    crossValidation: null, requiresHumanAcceptance: false, humanAcceptance: null, acceptanceCriteria: [], inputs: [], outputs: [], conversationId: null, commentCount: 2, createdAt: '2026-02-15T09:00:00Z', updatedAt: '2026-02-17T14:00:00Z',
  },
  {
    workspaceId: 'ws_01', id: 'task_18', title: 'Performance test: feed loading', description: 'Load test the main feed endpoint with 1000 concurrent users, target p95 < 200ms.', type: 'testing', projectId: 'proj_03', status: TaskStatus.TODO, priority: TaskPriority.HIGH, assigneeIds: ['agent_qa_01'], teamId: 'team_qa', phase: 'testing', dependencies: [], offloadable: true,
    crossValidation: null, requiresHumanAcceptance: false, humanAcceptance: null, acceptanceCriteria: [], inputs: [], outputs: [], conversationId: null, commentCount: 0, createdAt: '2026-02-15T10:00:00Z', updatedAt: '2026-02-15T10:00:00Z',
  },
  {
    workspaceId: 'ws_01', id: 'task_19', title: 'Fix auth token refresh bug', description: 'Token refresh fails silently when device is offline then reconnects. Need retry with exponential backoff.', type: 'bug', projectId: 'proj_03', status: TaskStatus.IN_PROGRESS, priority: TaskPriority.CRITICAL, assigneeIds: ['agent_dev_01', 'agent_dev_03'], teamId: 'team_dev', phase: 'testing', dependencies: [], offloadable: false,
    crossValidation: { id: 'cv_19', taskId: 'task_19', leadId: 'agent_dev_lead', memberResults: [
      { memberId: 'agent_dev_01', output: 'Implement retry queue with max 3 attempts, exponential backoff starting 1s.', completedAt: '2026-02-17T13:00:00Z' },
      { memberId: 'agent_dev_03', output: 'Add offline-aware token manager with retry (3x, backoff 1s/2s/4s) and user notification.', completedAt: '2026-02-17T13:30:00Z' },
    ], agreementScore: 65, confidence: CrossValidationConfidence.LOW, consensusState: ConsensusState.DISCREPANCY, synthesis: null, completedAt: null }, requiresHumanAcceptance: false, humanAcceptance: null, acceptanceCriteria: [], inputs: [], outputs: [], conversationId: null, commentCount: 7, createdAt: '2026-02-16T09:00:00Z', updatedAt: '2026-02-17T13:30:00Z',
  },
  {
    workspaceId: 'ws_01', id: 'task_20', title: 'Database schema optimization', description: 'Review and optimize database indexes for product search and order queries.', type: 'refactor', projectId: 'proj_01', status: TaskStatus.DONE, priority: TaskPriority.MEDIUM, assigneeIds: ['agent_dev_01', 'agent_dev_02'], teamId: 'team_dev', phase: 'development', dependencies: [], offloadable: true,
    crossValidation: { id: 'cv_20', taskId: 'task_20', leadId: 'agent_dev_lead', memberResults: [
      { memberId: 'agent_dev_01', output: 'Add composite index on (category_id, price) and full-text index on product name/description.', completedAt: '2026-02-13T10:00:00Z' },
      { memberId: 'agent_dev_02', output: 'Composite index (category_id, price, created_at), full-text search index, and partial index for active products.', completedAt: '2026-02-13T11:00:00Z' },
    ], agreementScore: 88, confidence: CrossValidationConfidence.MEDIUM, consensusState: ConsensusState.RESOLVED, synthesis: 'Agreed on composite and full-text indexes. Added partial index for active products per agent_dev_02 suggestion.', completedAt: '2026-02-13T14:00:00Z' }, requiresHumanAcceptance: false, humanAcceptance: null, acceptanceCriteria: [], inputs: [], outputs: [], conversationId: null, commentCount: 4, createdAt: '2026-02-10T09:00:00Z', updatedAt: '2026-02-13T14:00:00Z',
  },

  // Additional tasks for variety
  {
    workspaceId: 'ws_01', id: 'task_21', title: 'SEO audit for existing site', description: 'Comprehensive SEO audit covering technical SEO, content, and backlink profile.', type: 'research', projectId: 'proj_01', status: TaskStatus.BACKLOG, priority: TaskPriority.LOW, assigneeIds: [], teamId: 'team_seo', phase: 'deployment', dependencies: [], offloadable: true,
    crossValidation: null, requiresHumanAcceptance: false, humanAcceptance: null, acceptanceCriteria: [], inputs: [], outputs: [], conversationId: null, commentCount: 0, createdAt: '2026-02-15T10:00:00Z', updatedAt: '2026-02-15T10:00:00Z',
  },
  {
    workspaceId: 'ws_01', id: 'task_22', title: 'Design mobile navigation patterns', description: 'Define bottom nav, hamburger menu, and gesture-based navigation for the mobile app.', type: 'design', projectId: 'proj_03', status: TaskStatus.DONE, priority: TaskPriority.HIGH, assigneeIds: ['agent_design_01', 'agent_design_02'], teamId: 'team_design', phase: 'design', dependencies: [], offloadable: false,
    crossValidation: { id: 'cv_22', taskId: 'task_22', leadId: 'agent_design_lead', memberResults: [
      { memberId: 'agent_design_01', output: 'Bottom tab bar (5 items) + swipe gestures for back/forward. Hamburger for settings.', completedAt: '2026-01-25T10:00:00Z' },
      { memberId: 'agent_design_02', output: 'Bottom tabs (4 items + FAB) with swipe navigation. Settings via profile tab.', completedAt: '2026-01-25T11:00:00Z' },
    ], agreementScore: 82, confidence: CrossValidationConfidence.MEDIUM, consensusState: ConsensusState.RESOLVED, synthesis: 'Bottom tabs agreed. Settled on 5 tabs without FAB. Swipe gestures for navigation.', completedAt: '2026-01-25T14:00:00Z' }, requiresHumanAcceptance: false, humanAcceptance: null, acceptanceCriteria: [], inputs: [], outputs: [], conversationId: null, commentCount: 6, createdAt: '2026-01-22T09:00:00Z', updatedAt: '2026-01-25T14:00:00Z',
  },
  {
    workspaceId: 'ws_01', id: 'task_23', title: 'Implement user authentication', description: 'Build JWT-based auth with signup, login, password reset, and social login (Google, Apple).', type: 'feature', projectId: 'proj_03', status: TaskStatus.DONE, priority: TaskPriority.CRITICAL, assigneeIds: ['agent_dev_01', 'agent_dev_02'], teamId: 'team_dev', phase: 'development', dependencies: [], offloadable: false,
    crossValidation: { id: 'cv_23', taskId: 'task_23', leadId: 'agent_dev_lead', memberResults: [
      { memberId: 'agent_dev_01', output: 'JWT with refresh tokens, bcrypt for passwords, OAuth2 for social.', completedAt: '2026-02-02T10:00:00Z' },
      { memberId: 'agent_dev_02', output: 'JWT + refresh token rotation, argon2 for passwords, OAuth2 PKCE for mobile social login.', completedAt: '2026-02-02T11:00:00Z' },
    ], agreementScore: 87, confidence: CrossValidationConfidence.MEDIUM, consensusState: ConsensusState.RESOLVED, synthesis: 'JWT + refresh tokens agreed. Using argon2 over bcrypt. PKCE for mobile OAuth.', completedAt: '2026-02-02T14:00:00Z' }, requiresHumanAcceptance: false, humanAcceptance: null, acceptanceCriteria: [], inputs: [], outputs: [], conversationId: null, commentCount: 9, createdAt: '2026-01-20T09:00:00Z', updatedAt: '2026-02-02T14:00:00Z',
  },
  {
    workspaceId: 'ws_01', id: 'task_24', title: 'Admin dashboard wireframes', description: 'Wireframe admin dashboard showing order management, product management, and analytics.', type: 'design', projectId: 'proj_01', status: TaskStatus.DONE, priority: TaskPriority.MEDIUM, assigneeIds: ['agent_design_01', 'agent_design_02'], teamId: 'team_design', phase: 'design', dependencies: [], offloadable: true,
    crossValidation: { id: 'cv_24', taskId: 'task_24', leadId: 'agent_design_lead', memberResults: [
      { memberId: 'agent_design_01', output: 'Dashboard-first layout with sidebar nav. Key metrics cards, recent orders table, quick actions.', completedAt: '2026-02-04T10:00:00Z' },
      { memberId: 'agent_design_02', output: 'Analytics-first with sidebar. KPI cards, order chart, product inventory alerts, action center.', completedAt: '2026-02-04T11:00:00Z' },
    ], agreementScore: 92, confidence: CrossValidationConfidence.HIGH, consensusState: ConsensusState.MATCHED, synthesis: 'Both align on sidebar + dashboard layout. Merging KPI cards with inventory alerts.', completedAt: '2026-02-04T14:00:00Z' }, requiresHumanAcceptance: false, humanAcceptance: null, acceptanceCriteria: [], inputs: [], outputs: [], conversationId: null, commentCount: 4, createdAt: '2026-02-01T09:00:00Z', updatedAt: '2026-02-04T14:00:00Z',
  },
  {
    workspaceId: 'ws_01', id: 'task_25', title: 'Sprint retrospective documentation', description: 'Document sprint 3 retro: what went well, what to improve, action items.', type: 'documentation', projectId: 'proj_01', status: TaskStatus.DONE, priority: TaskPriority.LOW, assigneeIds: ['agent_pm_02'], teamId: 'team_pm', phase: 'development', dependencies: [], offloadable: true,
    crossValidation: null, requiresHumanAcceptance: false, humanAcceptance: null, acceptanceCriteria: [], inputs: [], outputs: [], conversationId: null, commentCount: 2, createdAt: '2026-02-14T15:00:00Z', updatedAt: '2026-02-14T17:00:00Z',
  },
];
