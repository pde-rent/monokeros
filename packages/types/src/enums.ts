export enum MemberStatus {
  IDLE = "idle",
  WORKING = "working",
  REVIEWING = "reviewing",
  BLOCKED = "blocked",
  OFFLINE = "offline",
}

export enum MemberType {
  AGENT = "agent",
  HUMAN = "human",
}

export enum WorkspaceStatus {
  ACTIVE = "active",
  PAUSED = "paused",
  ARCHIVED = "archived",
}

export enum TaskStatus {
  BACKLOG = "backlog",
  TODO = "todo",
  IN_PROGRESS = "in_progress",
  IN_REVIEW = "in_review",
  AWAITING_ACCEPTANCE = "awaiting_acceptance",
  DONE = "done",
}

export enum NotificationType {
  TASK_COMPLETED = "task_completed",
  CHAT_MESSAGE = "chat_message",
  FILE_MODIFIED = "file_modified",
  MEMBER_ADDED = "member_added",
  MEMBER_REMOVED = "member_removed",
  TASK_ASSIGNED = "task_assigned",
  HUMAN_ACCEPTANCE_REQUIRED = "human_acceptance_required",
  HUMAN_ACCEPTANCE_RESOLVED = "human_acceptance_resolved",
  GATE_APPROVAL_REQUEST = "gate_approval_request",
}

export enum HumanAcceptanceStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
}

export enum GateStatus {
  PENDING = "pending",
  AWAITING_APPROVAL = "awaiting_approval",
  APPROVED = "approved",
  REJECTED = "rejected",
  BYPASSED = "bypassed",
}

export enum TaskPriority {
  CRITICAL = "critical",
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
  NONE = "none",
}

export enum CrossValidationConfidence {
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
  NOT_STARTED = "not_started",
}

export enum ConsensusState {
  EXECUTING = "executing",
  COMPARING = "comparing",
  MATCHED = "matched",
  DISCREPANCY = "discrepancy",
  RETRYING = "retrying",
  ESCALATED = "escalated",
  RESOLVED = "resolved",
}

export enum MessageRole {
  USER = "user",
  AGENT = "agent",
  SYSTEM = "system",
  THINKING = "thinking",
}

export enum DiagramViewMode {
  WORKFORCE = "workforce",
  MANAGEMENT = "management",
  PROJECT = "project",
}

export enum WorkspaceIndustry {
  SOFTWARE_DEVELOPMENT = "software_development",
  MARKETING_COMMUNICATIONS = "marketing_communications",
  CREATIVE_DESIGN = "creative_design",
  MANAGEMENT_CONSULTING = "management_consulting",
  CUSTOM = "custom",
  // Deferred post-launch:
  LEGAL = "legal",
  FINANCIAL_SERVICES = "financial_services",
  RECRUITMENT_HR = "recruitment_hr",
  COMPLIANCE_RISK = "compliance_risk",
  TRANSLATION_LOCALIZATION = "translation_localization",
  SUPPLY_CHAIN_LOGISTICS = "supply_chain_logistics",
  DATA_ANALYTICS = "data_analytics",
  HEALTHCARE_LIFE_SCIENCES = "healthcare_life_sciences",
  REAL_ESTATE = "real_estate",
  EDUCATION_TRAINING = "education_training",
}

export enum WorkspaceRole {
  ADMIN = "admin",
  VALIDATOR = "validator",
  VIEWER = "viewer",
}

export enum AiProvider {
  ZAI = "zai",
  OPENAI = "openai",
  ANTHROPIC = "anthropic",
  GOOGLE = "google",
  DEEPSEEK = "deepseek",
  XAI = "xai",
  MISTRAL = "mistral",
  OPENROUTER = "openrouter",
  OLLAMA = "ollama",
  GROQ = "groq",
  ZHIPU = "zhipu",
  QWEN = "qwen",
  TOGETHER = "together",
  FIREWORKS = "fireworks",
  PERPLEXITY = "perplexity",
  COHERE = "cohere",
  BEDROCK = "bedrock",
  AZURE_OPENAI = "azure_openai",
  VENICE = "venice",
  MOONSHOT = "moonshot",
  BAICHUAN = "baichuan",
  AI21 = "ai21",
  REPLICATE = "replicate",
  NVIDIA = "nvidia",
  MINIMAX = "minimax",
  VERCEL = "vercel",
  CLOUDFLARE = "cloudflare",
  VLLM = "vllm",
  LM_STUDIO = "lm_studio",
  LLAMA_CPP = "llama_cpp",
  CUSTOM = "custom",
}

export enum ProjectViewMode {
  KANBAN = "kanban",
  GANTT = "gantt",
  LIST = "list",
  QUEUE = "queue",
}

export enum ConversationType {
  AGENT_DM = "agent_dm",
  PROJECT_CHAT = "project_chat",
  GROUP_CHAT = "group_chat",
  TASK_THREAD = "task_thread",
}

export enum MessageReferenceType {
  AGENT = "agent",
  ISSUE = "issue",
  PROJECT = "project",
  TASK = "task",
  FILE = "file",
}

export enum FileEntryType {
  FILE = "file",
  DIRECTORY = "directory",
}

export enum DriveType {
  MEMBER = "member",
  TEAM = "team",
  PROJECT = "project",
  WORKSPACE = "workspace",
}

export enum DriveAccessLevel {
  READ = "read",
  WRITE = "write",
  ADMIN = "admin",
}

export enum HumanAcceptanceAction {
  ACCEPT = "accept",
  REJECT = "reject",
}

export enum ArtifactType {
  FILE = "file",
  URL = "url",
  GIT_REF = "git_ref",
}

export type AgentRuntimeType = "zeroclaw" | "openclaw";
