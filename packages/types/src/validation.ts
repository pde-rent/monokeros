import { z } from 'zod';
import {
  AiProvider,
  MemberStatus,
  TaskStatus,
  TaskPriority,
  GateStatus,
  WorkspaceIndustry,
  WorkspaceStatus,
  MessageReferenceType,
  HumanAcceptanceAction,
} from './enums';

export const DEFAULT_ENTITY_COLOR = '#6366f1';

// Task type definition schema
export const taskTypeDefinitionSchema = z.object({
  name: z.string().min(1).max(50).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  label: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

// Task schemas
export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).default(''),
  type: z.string().min(1).max(50).nullable().default(null),
  projectId: z.string(),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  assigneeIds: z.array(z.string()).default([]),
  teamId: z.string(),
  phase: z.string().min(1),
  dependencies: z.array(z.string()).default([]),
  offloadable: z.boolean().default(false),
  requiresHumanAcceptance: z.boolean().default(false),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  type: z.string().min(1).max(50).nullable().optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  assigneeIds: z.array(z.string()).optional(),
  dependencies: z.array(z.string()).optional(),
  offloadable: z.boolean().optional(),
  requiresHumanAcceptance: z.boolean().optional(),
});

export const moveTaskSchema = z.object({
  status: z.nativeEnum(TaskStatus),
});

export const assignTaskSchema = z.object({
  assigneeIds: z.array(z.string()),
});

// Provider & model config schemas
export const providerConfigSchema = z.object({
  provider: z.nativeEnum(AiProvider),
  baseUrl: z.string().url(),
  apiKey: z.string().min(1),
  defaultModel: z.string().min(1),
  label: z.string().max(100).optional(),
});

export const agentModelConfigSchema = z.object({
  providerId: z.nativeEnum(AiProvider).optional(),
  model: z.string().min(1).max(100).optional(),
  apiKeyOverride: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
});

export const updateWorkspaceProvidersSchema = z.object({
  providers: z.array(providerConfigSchema).optional(),
  defaultProviderId: z.nativeEnum(AiProvider).optional(),
});

// Member schemas
export const memberGenderSchema = z.union([z.literal(1), z.literal(2)]);

export const createMemberSchema = z.object({
  name: z.string().min(1).max(100),
  title: z.string().min(1).max(100),
  specialization: z.string().min(1).max(200),
  teamId: z.string(),
  isLead: z.boolean().default(false),
  avatarUrl: z.string().nullable().optional(),
  gender: memberGenderSchema.optional(),
  identity: z.object({
    soul: z.string().min(1).max(5000),
    skills: z.array(z.string().min(1)).min(1),
    memory: z.array(z.string()).default([]),
  }),
  permissions: z.array(z.string()).default([]),
  modelConfig: agentModelConfigSchema.nullable().optional(),
});

export const updateMemberSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  title: z.string().min(1).max(100).optional(),
  specialization: z.string().min(1).max(200).optional(),
  teamId: z.string().optional(),
  isLead: z.boolean().optional(),
  avatarUrl: z.string().nullable().optional(),
  gender: memberGenderSchema.optional(),
  identity: z.object({
    soul: z.string().min(1).max(5000),
    skills: z.array(z.string().min(1)).min(1),
    memory: z.array(z.string()).default([]),
  }).optional(),
  modelConfig: agentModelConfigSchema.nullable().optional(),
  permissions: z.array(z.string()).optional(),
});

export const updateMemberStatusSchema = z.object({
  status: z.nativeEnum(MemberStatus),
});

// Project schemas
export const updateGateSchema = z.object({
  phase: z.string().min(1),
  status: z.nativeEnum(GateStatus),
  feedback: z.string().nullable().optional(),
});

// Project CRUD schemas
export const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(60).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().max(2000).default(''),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default(DEFAULT_ENTITY_COLOR),
  types: z.array(z.string().min(1)).min(1),
  phases: z.array(z.string().min(1)).min(1),
  assignedTeamIds: z.array(z.string()).default([]),
  assignedMemberIds: z.array(z.string()).default([]),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(60).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  description: z.string().max(2000).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  types: z.array(z.string().min(1)).min(1).optional(),
  phases: z.array(z.string().min(1)).min(1).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  assignedTeamIds: z.array(z.string()).optional(),
  assignedMemberIds: z.array(z.string()).optional(),
});

// Team schemas
export const createTeamSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default(DEFAULT_ENTITY_COLOR),
  leadId: z.string(),
  memberIds: z.array(z.string()).default([]),
});

export const updateTeamSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  leadId: z.string().optional(),
  memberIds: z.array(z.string()).optional(),
});

// Workspace schemas
export const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
  displayName: z.string().min(1).max(100),
  slug: z.string().min(1).max(60).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  industry: z.nativeEnum(WorkspaceIndustry).default(WorkspaceIndustry.SOFTWARE_DEVELOPMENT),
  branding: z.object({
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default(DEFAULT_ENTITY_COLOR),
    logo: z.string().optional(),
  }).optional(),
  taskTypes: z.array(taskTypeDefinitionSchema).optional(),
  providers: z.array(providerConfigSchema).optional(),
  defaultProviderId: z.nativeEnum(AiProvider).optional(),
  telegramBotToken: z.string().nullable().optional(),
});

export const updateWorkspaceSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(60).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  industry: z.nativeEnum(WorkspaceIndustry).optional(),
  industrySubtype: z.string().nullable().optional(),
  branding: z.object({
    logo: z.string().nullable().optional(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  }).optional(),
  taskTypes: z.array(taskTypeDefinitionSchema).optional(),
  status: z.nativeEnum(WorkspaceStatus).optional(),
  providers: z.array(providerConfigSchema).optional(),
  defaultProviderId: z.nativeEnum(AiProvider).optional(),
  telegramBotToken: z.string().nullable().optional(),
});

// Console schemas
export const createConversationSchema = z.object({
  participantIds: z.array(z.string()).min(1),
  title: z.string().min(1).max(100).optional(),
});

export const renameConversationSchema = z.object({
  title: z.string().min(1).max(100),
});

export const sendMessageSchema = z.object({
  content: z.string().min(1).max(10000),
  references: z.array(z.object({
    type: z.nativeEnum(MessageReferenceType),
    id: z.string(),
    display: z.string(),
  })).default([]),
});

// API key schemas
export const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  memberId: z.string(),
  permissions: z.array(z.string()).min(1),
  expiresAt: z.string().nullable().default(null),
});

// Human acceptance schemas
export const humanAcceptanceActionSchema = z.object({
  action: z.nativeEnum(HumanAcceptanceAction),
  feedback: z.string().max(2000).optional(),
});

// Type exports
export type HumanAcceptanceActionInput = z.infer<typeof humanAcceptanceActionSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type MoveTaskInput = z.infer<typeof moveTaskSchema>;
export type AssignTaskInput = z.infer<typeof assignTaskSchema>;
export type CreateMemberInput = z.infer<typeof createMemberSchema>;
export type UpdateMemberStatusInput = z.infer<typeof updateMemberStatusSchema>;
export type UpdateGateInput = z.infer<typeof updateGateSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type RenameConversationInput = z.infer<typeof renameConversationSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type ProviderConfigInput = z.infer<typeof providerConfigSchema>;
export type AgentModelConfigInput = z.infer<typeof agentModelConfigSchema>;
export type UpdateWorkspaceProvidersInput = z.infer<typeof updateWorkspaceProvidersSchema>;
