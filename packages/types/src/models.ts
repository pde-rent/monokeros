import {
  AiProvider,
  ArtifactType,
  MemberStatus,
  MemberType,
  TaskStatus,
  GateStatus,
  TaskPriority,
  CrossValidationConfidence,
  ConsensusState,
  MessageRole,
  WorkspaceIndustry,
  WorkspaceRole,
  WorkspaceStatus,
  NotificationType,
  HumanAcceptanceStatus,
  ConversationType,
  MessageReferenceType,
  FileEntryType,
  KnowledgeSearchCategory,
  KnowledgeSearchScope,
} from './enums';

/** A provider credential configured at workspace level */
export interface ProviderConfig {
  provider: AiProvider;
  baseUrl: string;
  apiKey: string;
  defaultModel: string;
  label?: string;
}

/** Per-agent model override (optional fields — inherits from workspace provider) */
export interface AgentModelConfig {
  providerId?: AiProvider;
  model?: string;
  apiKeyOverride?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface MemberIdentity {
  soul: string;
  skills: string[];
  memory: string[];
}

export interface MemberStats {
  tasksCompleted: number;
  avgAgreementScore: number;
  activeProjects: number;
}

export type MemberGender = 1 | 2; // 1 = male, 2 = female

export interface Member {
  id: string;
  workspaceId: string;
  name: string;
  type: MemberType;
  title: string;
  specialization: string;
  teamId: string | null;
  isLead: boolean;
  system: boolean;
  status: MemberStatus;
  currentTaskId: string | null;
  currentProjectId: string | null;
  avatarUrl: string | null;
  gender: MemberGender;
  identity: MemberIdentity | null;
  stats: MemberStats;
  email: string | null;
  passwordHash: string | null;
  supervisedTeamIds: string[];
  permissions?: string[];
  modelConfig: AgentModelConfig | null;
}

export interface Team {
  id: string;
  workspaceId: string;
  name: string;
  type: string;
  color: string;
  leadId: string;
  memberIds: string[];
}

export interface TaskTypeDefinition {
  name: string;
  label: string;
  color: string;
}

export interface WorkspaceBranding {
  logo: string | null;
  color: string;
}

export interface Workspace {
  id: string;
  name: string;
  displayName: string;
  slug: string;
  industry: WorkspaceIndustry;
  industrySubtype: string | null;
  status: WorkspaceStatus;
  branding: WorkspaceBranding;
  taskTypes: TaskTypeDefinition[];
  providers: ProviderConfig[];
  defaultProviderId: AiProvider;
  telegramBotToken?: string | null;
  createdAt: string;
  archivedAt: string | null;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  memberId: string;
  role: WorkspaceRole;
  joinedAt: string;
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  description: string;
  color: string;
  types: string[];
  status: TaskStatus;
  phases: string[];
  currentPhase: string;
  gates: SDLCGate[];
  assignedTeamIds: string[];
  assignedMemberIds: string[];
  gitRepo: GitRepoBinding | null;
  definitionOfDone: DoDCriterion[];
  createdById: string;
  modifiedAt: string;
  conversationId: string | null;
  createdAt: string;
}

export interface SDLCGate {
  id: string;
  phase: string;
  status: GateStatus;
  approverId: string | null;
  approvedAt: string | null;
  feedback: string | null;
}

export interface HumanAcceptance {
  status: HumanAcceptanceStatus;
  reviewerId: string | null;
  feedback: string | null;
  reviewedAt: string | null;
}

/** A single acceptance criterion on a Task */
export interface AcceptanceCriterion {
  id: string;
  description: string;
  met: boolean;
  verifiedBy: string | null;
  verifiedAt: string | null;
}

/** A definition-of-done criterion on a Project (applies to all tasks) */
export interface DoDCriterion {
  id: string;
  description: string;
  required: boolean;
}

/** Git repository binding on a Project */
export interface GitRepoBinding {
  url: string;
  defaultBranch: string;
  provider: string | null;
}

/** A git reference (branch, commit, path within repo) */
export interface GitRef {
  repo: string;
  branch: string | null;
  commit: string | null;
  path: string | null;
}

/** An artifact attached to a task as input or output.
 *  Files reference paths in the project drive (or workspace drive for orphaned tasks). */
export interface TaskArtifact {
  id: string;
  type: ArtifactType;
  label: string;
  path: string | null;
  url: string | null;
  gitRef: GitRef | null;
}

export interface Task {
  id: string;
  workspaceId: string;
  title: string;
  description: string;
  type: string | null;
  projectId: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeIds: string[];
  teamId: string;
  phase: string;
  dependencies: string[];
  offloadable: boolean;
  crossValidation: CrossValidation | null;
  requiresHumanAcceptance: boolean;
  humanAcceptance: HumanAcceptance | null;
  acceptanceCriteria: AcceptanceCriterion[];
  inputs: TaskArtifact[];
  outputs: TaskArtifact[];
  conversationId: string | null;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CrossValidation {
  id: string;
  taskId: string;
  leadId: string;
  memberResults: MemberResult[];
  agreementScore: number;
  confidence: CrossValidationConfidence;
  consensusState: ConsensusState;
  synthesis: string | null;
  completedAt: string | null;
}

export interface MemberResult {
  memberId: string;
  output: string;
  completedAt: string;
}

export interface Conversation {
  id: string;
  workspaceId: string;
  createdBy: string | null;
  title: string;
  type: ConversationType;
  projectId: string | null;
  participantIds: string[];
  lastMessageAt: string;
  messageCount: number;
}

export interface CreateConversationResponse {
  conversation: Conversation;
  created: boolean;
}

export interface MessageAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
}

export interface MessageReaction {
  emoji: string;
  count: number;
  reacted: boolean;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  renderedHtml?: string;
  memberId: string | null;
  timestamp: string;
  references: MessageReference[];
  attachments: MessageAttachment[];
  reactions?: MessageReaction[];
}

export interface MessageReference {
  type: MessageReferenceType;
  id: string;
  display: string;
}

export interface FileEntry {
  id: string;
  name: string;
  path: string;
  type: FileEntryType;
  size: number;
  mimeType: string;
  modifiedAt: string;
  children?: FileEntry[];
}

export interface MemberDrive {
  memberId: string;
  memberName: string;
  rootPath: string;
  files: FileEntry[];
}

export interface TeamDrive {
  id: string;
  name: string;
  teamId: string;
  rootPath: string;
  files: FileEntry[];
}

export interface ProjectDrive {
  id: string;
  name: string;
  projectId: string;
  rootPath: string;
  files: FileEntry[];
}

export interface WorkspaceDrive {
  id: string;
  name: string;
  rootPath: string;
  files: FileEntry[];
}

export interface DriveListing {
  teamDrives: TeamDrive[];
  memberDrives: MemberDrive[];
  projectDrives: ProjectDrive[];
  workspaceDrive: WorkspaceDrive | null;
}

export interface CreateFileRequest {
  name: string;
  extension?: string;
  content?: string;
}

export interface CreateFolderRequest {
  name: string;
}

export interface RenameRequest {
  newName: string;
}

export interface UpdateFileRequest {
  content: string;
}

export interface KnowledgeSearchResult {
  category: KnowledgeSearchCategory;
  ownerId: string;
  path: string;
  fileName: string;
  scope: KnowledgeSearchScope;
  scopeLabel: string;
  snippet: string;
  score: number;
}

export type Permission =
  | 'members:read' | 'members:write' | 'members:manage'
  | 'teams:read' | 'teams:write'
  | 'projects:read' | 'projects:write' | 'projects:manage'
  | 'tasks:read' | 'tasks:write'
  | 'conversations:read' | 'conversations:write'
  | 'files:read' | 'files:write'
  | 'workspace:admin'
  | '*';

export interface ApiKey {
  id: string;
  key: string;           // SHA-256 hash of the raw key
  prefix: string;        // "mk_abc12345..." (first 11 chars for display)
  memberId: string;
  workspaceId: string;
  name: string;
  permissions: Permission[];
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revoked: boolean;
}

// ── Model Catalog (dynamic, from OpenRouter) ────────

export interface CatalogModel {
  id: string;
  name: string;
  providerSlug: string;
  contextLength: number;
  maxCompletionTokens: number;
  supportsVision: boolean;
  supportsAudio: boolean;
  supportsTools: boolean;
  pricing: { prompt: string; completion: string };
}

export interface ModelCatalog {
  models: CatalogModel[];
  providerSlugs: string[];
  fetchedAt: string;
}

export interface Notification {
  id: string;
  workspaceId: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  entityType: string | null;
  entityId: string | null;
  actorId: string | null;
  createdAt: string;
}

