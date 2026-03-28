import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// ── Reusable value validators ───────────────────────────────────────────────

export const memberStatus = v.union(
  v.literal("idle"),
  v.literal("working"),
  v.literal("reviewing"),
  v.literal("blocked"),
  v.literal("offline"),
);

export const memberType = v.union(v.literal("agent"), v.literal("human"));

export const memberGender = v.union(v.literal(1), v.literal(2));

const workspaceStatus = v.union(v.literal("active"), v.literal("paused"), v.literal("archived"));

const workspaceIndustry = v.union(
  v.literal("software_development"),
  v.literal("marketing_communications"),
  v.literal("creative_design"),
  v.literal("management_consulting"),
  v.literal("custom"),
  v.literal("legal"),
  v.literal("financial_services"),
  v.literal("recruitment_hr"),
  v.literal("compliance_risk"),
  v.literal("translation_localization"),
  v.literal("supply_chain_logistics"),
  v.literal("data_analytics"),
  v.literal("healthcare_life_sciences"),
  v.literal("real_estate"),
  v.literal("education_training"),
);

const workspaceRole = v.union(v.literal("admin"), v.literal("validator"), v.literal("viewer"));

export const taskStatus = v.union(
  v.literal("backlog"),
  v.literal("todo"),
  v.literal("in_progress"),
  v.literal("in_review"),
  v.literal("awaiting_acceptance"),
  v.literal("done"),
);

const taskPriority = v.union(
  v.literal("critical"),
  v.literal("high"),
  v.literal("medium"),
  v.literal("low"),
  v.literal("none"),
);

const gateStatus = v.union(
  v.literal("pending"),
  v.literal("awaiting_approval"),
  v.literal("approved"),
  v.literal("rejected"),
  v.literal("bypassed"),
);

const humanAcceptanceStatus = v.union(
  v.literal("pending"),
  v.literal("accepted"),
  v.literal("rejected"),
);

const crossValidationConfidence = v.union(
  v.literal("high"),
  v.literal("medium"),
  v.literal("low"),
  v.literal("not_started"),
);

const consensusState = v.union(
  v.literal("executing"),
  v.literal("comparing"),
  v.literal("matched"),
  v.literal("discrepancy"),
  v.literal("retrying"),
  v.literal("escalated"),
  v.literal("resolved"),
);

const messageRole = v.union(
  v.literal("user"),
  v.literal("agent"),
  v.literal("system"),
  v.literal("thinking"),
);

export const conversationType = v.union(
  v.literal("agent_dm"),
  v.literal("project_chat"),
  v.literal("group_chat"),
  v.literal("task_thread"),
);

const messageReferenceType = v.union(
  v.literal("agent"),
  v.literal("issue"),
  v.literal("project"),
  v.literal("task"),
  v.literal("file"),
);

const fileEntryType = v.union(v.literal("file"), v.literal("directory"));

const driveType = v.union(
  v.literal("member"),
  v.literal("team"),
  v.literal("project"),
  v.literal("workspace"),
);

const notificationType = v.union(
  v.literal("task_completed"),
  v.literal("chat_message"),
  v.literal("file_modified"),
  v.literal("member_added"),
  v.literal("member_removed"),
  v.literal("task_assigned"),
  v.literal("human_acceptance_required"),
  v.literal("human_acceptance_resolved"),
  v.literal("gate_approval_request"),
);

const artifactType = v.union(v.literal("file"), v.literal("url"), v.literal("git_ref"));

const agentRuntimeStatus = v.union(v.literal("stopped"), v.literal("running"), v.literal("error"));

const agentRuntimeType = v.union(v.literal("zeroclaw"), v.literal("openclaw"));

const agentLifecycle = v.union(v.literal("active"), v.literal("standby"), v.literal("dormant"));

// AI provider — use string to avoid maintaining a huge union for 30+ providers
const aiProvider = v.string();

// ── Embedded object validators ──────────────────────────────────────────────

const providerConfig = v.object({
  provider: aiProvider,
  baseUrl: v.string(),
  apiKey: v.string(),
  defaultModel: v.string(),
  label: v.optional(v.string()),
});

export const agentModelConfig = v.object({
  providerId: v.optional(v.string()),
  model: v.optional(v.string()),
  apiKeyOverride: v.optional(v.string()),
  temperature: v.optional(v.float64()),
  maxTokens: v.optional(v.float64()),
});

export const memberIdentity = v.object({
  soul: v.string(),
  skills: v.array(v.string()),
  memory: v.array(v.string()),
});

const memberStats = v.object({
  tasksCompleted: v.float64(),
  avgAgreementScore: v.float64(),
  activeProjects: v.float64(),
  totalPromptTokens: v.optional(v.float64()),
  totalCompletionTokens: v.optional(v.float64()),
  totalTokens: v.optional(v.float64()),
  totalCostUsd: v.optional(v.float64()),
});

const workspaceBranding = v.object({
  logo: v.union(v.string(), v.null()),
  color: v.string(),
});

const taskTypeDefinition = v.object({
  name: v.string(),
  label: v.string(),
  color: v.string(),
});

const sdlcGate = v.object({
  id: v.string(),
  phase: v.string(),
  status: gateStatus,
  approverId: v.union(v.string(), v.null()),
  approvedAt: v.union(v.string(), v.null()),
  feedback: v.union(v.string(), v.null()),
});

const dodCriterion = v.object({
  id: v.string(),
  description: v.string(),
  required: v.boolean(),
});

const gitRepoBinding = v.object({
  url: v.string(),
  defaultBranch: v.string(),
  provider: v.union(v.string(), v.null()),
});

const gitRef = v.object({
  repo: v.string(),
  branch: v.union(v.string(), v.null()),
  commit: v.union(v.string(), v.null()),
  path: v.union(v.string(), v.null()),
});

const taskArtifact = v.object({
  id: v.string(),
  type: artifactType,
  label: v.string(),
  path: v.union(v.string(), v.null()),
  url: v.union(v.string(), v.null()),
  gitRef: v.union(gitRef, v.null()),
});

const acceptanceCriterion = v.object({
  id: v.string(),
  description: v.string(),
  met: v.boolean(),
  verifiedBy: v.union(v.string(), v.null()),
  verifiedAt: v.union(v.string(), v.null()),
});

const humanAcceptance = v.object({
  status: humanAcceptanceStatus,
  reviewerId: v.union(v.string(), v.null()),
  feedback: v.union(v.string(), v.null()),
  reviewedAt: v.union(v.string(), v.null()),
});

const memberResult = v.object({
  memberId: v.string(),
  output: v.string(),
  completedAt: v.string(),
});

const crossValidation = v.object({
  id: v.string(),
  taskId: v.string(),
  leadId: v.string(),
  memberResults: v.array(memberResult),
  agreementScore: v.float64(),
  confidence: crossValidationConfidence,
  consensusState: consensusState,
  synthesis: v.union(v.string(), v.null()),
  completedAt: v.union(v.string(), v.null()),
});

const messageReference = v.object({
  type: messageReferenceType,
  id: v.string(),
  display: v.string(),
});

const messageAttachment = v.object({
  id: v.string(),
  fileName: v.string(),
  fileSize: v.float64(),
  mimeType: v.string(),
  storagePath: v.string(),
});

const messageReaction = v.object({
  emoji: v.string(),
  count: v.float64(),
  reacted: v.boolean(),
});

// ── Schema ──────────────────────────────────────────────────────────────────

export default defineSchema({
  ...authTables,

  // ── Workspaces ──────────────────────────────────────────────────────────
  workspaces: defineTable({
    // Legacy string ID from mock data (for seed references)
    legacyId: v.optional(v.string()),
    name: v.string(),
    displayName: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    industry: workspaceIndustry,
    industrySubtype: v.union(v.string(), v.null()),
    status: workspaceStatus,
    branding: workspaceBranding,
    taskTypes: v.array(taskTypeDefinition),
    providers: v.array(providerConfig),
    defaultProviderId: aiProvider,
    telegramBotToken: v.optional(v.union(v.string(), v.null())),
    archivedAt: v.union(v.string(), v.null()),
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"]),

  // ── Workspace Members (role assignments) ────────────────────────────────
  workspaceMembers: defineTable({
    legacyId: v.optional(v.string()),
    workspaceId: v.id("workspaces"),
    memberId: v.id("members"),
    role: workspaceRole,
    joinedAt: v.string(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_member", ["memberId"])
    .index("by_workspace_member", ["workspaceId", "memberId"]),

  // ── Members ─────────────────────────────────────────────────────────────
  members: defineTable({
    legacyId: v.optional(v.string()),
    workspaceId: v.id("workspaces"),
    name: v.string(),
    type: memberType,
    title: v.string(),
    specialization: v.string(),
    teamId: v.union(v.id("teams"), v.null()),
    isLead: v.boolean(),
    system: v.boolean(),
    status: memberStatus,
    currentTaskId: v.union(v.id("tasks"), v.null()),
    currentProjectId: v.union(v.id("projects"), v.null()),
    avatarUrl: v.union(v.string(), v.null()),
    gender: memberGender,
    identity: v.union(memberIdentity, v.null()),
    stats: memberStats,
    email: v.union(v.string(), v.null()),
    passwordHash: v.union(v.string(), v.null()),
    supervisedTeamIds: v.array(v.string()),
    permissions: v.optional(v.array(v.string())),
    modelConfig: v.union(agentModelConfig, v.null()),
    runtime: v.optional(agentRuntimeType),
    desktop: v.optional(v.boolean()),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_type", ["workspaceId", "type"])
    .index("by_workspace_team", ["workspaceId", "teamId"])
    .index("by_email", ["email"])
    .searchIndex("search_name", {
      searchField: "name",
      filterFields: ["workspaceId"],
    }),

  // ── Teams ───────────────────────────────────────────────────────────────
  teams: defineTable({
    legacyId: v.optional(v.string()),
    workspaceId: v.id("workspaces"),
    name: v.string(),
    type: v.string(),
    color: v.string(),
    leadId: v.id("members"),
    memberIds: v.array(v.id("members")),
  }).index("by_workspace", ["workspaceId"]),

  // ── Projects ────────────────────────────────────────────────────────────
  projects: defineTable({
    legacyId: v.optional(v.string()),
    workspaceId: v.id("workspaces"),
    name: v.string(),
    slug: v.string(),
    description: v.string(),
    color: v.string(),
    types: v.array(v.string()),
    status: taskStatus,
    phases: v.array(v.string()),
    currentPhase: v.string(),
    gates: v.array(sdlcGate),
    assignedTeamIds: v.array(v.string()),
    assignedMemberIds: v.array(v.string()),
    gitRepo: v.union(gitRepoBinding, v.null()),
    definitionOfDone: v.array(dodCriterion),
    createdById: v.string(),
    modifiedAt: v.string(),
    conversationId: v.union(v.id("conversations"), v.null()),
    createdAt: v.string(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_status", ["workspaceId", "status"])
    .index("by_workspace_slug", ["workspaceId", "slug"])
    .searchIndex("search_name", {
      searchField: "name",
      filterFields: ["workspaceId"],
    }),

  // ── Tasks ───────────────────────────────────────────────────────────────
  tasks: defineTable({
    legacyId: v.optional(v.string()),
    workspaceId: v.id("workspaces"),
    title: v.string(),
    slug: v.optional(v.string()),
    description: v.string(),
    type: v.union(v.string(), v.null()),
    projectId: v.union(v.id("projects"), v.null()),
    parentId: v.optional(v.union(v.id("tasks"), v.null())),
    status: taskStatus,
    priority: taskPriority,
    assigneeIds: v.array(v.string()),
    teamId: v.string(),
    phase: v.string(),
    dependencies: v.array(v.string()),
    offloadable: v.boolean(),
    crossValidation: v.union(crossValidation, v.null()),
    requiresHumanAcceptance: v.boolean(),
    humanAcceptance: v.union(humanAcceptance, v.null()),
    acceptanceCriteria: v.array(acceptanceCriterion),
    inputs: v.array(taskArtifact),
    outputs: v.array(taskArtifact),
    conversationId: v.union(v.id("conversations"), v.null()),
    commentCount: v.float64(),
    updatedAt: v.string(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_status", ["workspaceId", "status"])
    .index("by_workspace_project", ["workspaceId", "projectId"])
    .index("by_workspace_project_status", ["workspaceId", "projectId", "status"])
    .index("by_workspace_slug", ["workspaceId", "slug"])
    .index("by_workspace_parent", ["workspaceId", "parentId"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["workspaceId"],
    }),

  // ── Conversations ───────────────────────────────────────────────────────
  conversations: defineTable({
    legacyId: v.optional(v.string()),
    workspaceId: v.id("workspaces"),
    createdBy: v.union(v.string(), v.null()),
    title: v.string(),
    type: conversationType,
    projectId: v.union(v.id("projects"), v.null()),
    taskId: v.optional(v.union(v.id("tasks"), v.null())),
    participantIds: v.array(v.string()),
    lastMessageAt: v.string(),
    messageCount: v.float64(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_type", ["workspaceId", "type"])
    .index("by_workspace_lastMessage", ["workspaceId", "lastMessageAt"])
    .index("by_task", ["taskId"]),

  // ── Messages ────────────────────────────────────────────────────────────
  messages: defineTable({
    legacyId: v.optional(v.string()),
    conversationId: v.id("conversations"),
    role: messageRole,
    content: v.string(),
    renderedHtml: v.optional(v.string()),
    memberId: v.union(v.string(), v.null()),
    references: v.array(messageReference),
    attachments: v.array(messageAttachment),
    reactions: v.optional(v.array(messageReaction)),
  }).index("by_conversation", ["conversationId"]),

  // ── API Keys ────────────────────────────────────────────────────────────
  apiKeys: defineTable({
    legacyId: v.optional(v.string()),
    key: v.string(), // SHA-256 hash
    prefix: v.string(), // first 11 chars for display
    memberId: v.id("members"),
    workspaceId: v.id("workspaces"),
    name: v.string(),
    permissions: v.array(v.string()),
    lastUsedAt: v.union(v.string(), v.null()),
    expiresAt: v.union(v.string(), v.null()),
    revoked: v.boolean(),
  })
    .index("by_key", ["key"])
    .index("by_workspace_member", ["workspaceId", "memberId"]),

  // ── Notifications ───────────────────────────────────────────────────────
  notifications: defineTable({
    legacyId: v.optional(v.string()),
    workspaceId: v.id("workspaces"),
    recipientId: v.string(),
    type: notificationType,
    title: v.string(),
    body: v.string(),
    read: v.boolean(),
    entityType: v.union(v.string(), v.null()),
    entityId: v.union(v.string(), v.null()),
    actorId: v.union(v.string(), v.null()),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_recipient_workspace", ["recipientId", "workspaceId"])
    .index("by_recipient_workspace_unread", ["recipientId", "workspaceId", "read"]),

  // ── Agent Runtimes (Docker containers) ──────────────────────────────────
  agentRuntimes: defineTable({
    memberId: v.id("members"),
    workspaceId: v.id("workspaces"),
    containerId: v.union(v.string(), v.null()),
    containerName: v.union(v.string(), v.null()),
    vncPort: v.union(v.float64(), v.null()),
    openclawUrl: v.union(v.string(), v.null()),
    gatewayUrl: v.optional(v.union(v.string(), v.null())),
    runtimeType: v.optional(agentRuntimeType),
    hasDesktop: v.optional(v.boolean()),
    status: agentRuntimeStatus,
    lastHealthCheck: v.union(v.string(), v.null()),
    error: v.optional(v.string()),
    retryCount: v.float64(),
    nextRetryAt: v.union(v.string(), v.null()),
    lifecycle: agentLifecycle,
  })
    .index("by_member", ["memberId"])
    .index("by_workspace", ["workspaceId"]),

  // ── Files (4-tier drive system) ─────────────────────────────────────────
  files: defineTable({
    workspaceId: v.id("workspaces"),
    driveType: driveType,
    driveOwnerId: v.string(), // memberId, teamId, projectId, or "workspace"
    name: v.string(),
    path: v.string(),
    type: fileEntryType,
    size: v.float64(),
    mimeType: v.string(),
    modifiedAt: v.string(),
    textContent: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    isKnowledge: v.optional(v.boolean()),
  })
    .index("by_workspace_drive", ["workspaceId", "driveType", "driveOwnerId"])
    .index("by_drive_path", ["driveType", "driveOwnerId", "path"])
    .searchIndex("search_knowledge", {
      searchField: "textContent",
      filterFields: ["workspaceId", "driveType", "isKnowledge"],
    }),

  // ── Token Usage (per-response event log) ──────────────────────────────
  tokenUsage: defineTable({
    workspaceId: v.id("workspaces"),
    memberId: v.id("members"),
    conversationId: v.optional(v.string()),
    model: v.string(),
    promptTokens: v.float64(),
    completionTokens: v.float64(),
    totalTokens: v.float64(),
    estimatedCostUsd: v.float64(),
  })
    .index("by_member", ["memberId"])
    .index("by_workspace", ["workspaceId"])
    .index("by_conversation", ["conversationId"]),

  // ── Resource Snapshots (sampled telemetry) ────────────────────────────
  resourceSnapshots: defineTable({
    workspaceId: v.id("workspaces"),
    memberId: v.id("members"),
    cpuPercent: v.float64(),
    memoryMb: v.float64(),
    windowCount: v.float64(),
  })
    .index("by_member", ["memberId"])
    .index("by_workspace", ["workspaceId"]),

  // ── Activities (audit log) ──────────────────────────────────────────────
  activities: defineTable({
    workspaceId: v.id("workspaces"),
    actorId: v.string(),
    action: v.string(),
    entityType: v.string(),
    entityId: v.string(),
    metadata: v.optional(v.any()),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_entity", ["workspaceId", "entityType", "entityId"]),
});
