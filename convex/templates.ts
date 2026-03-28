import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { resolveEmail } from "./lib/auth";
import { generateAvatar } from "./lib/avatar";

/** Template registry — hardcoded template definitions. */
const TEMPLATES = [
  {
    id: "software-dev",
    name: "Software Development",
    description: "Full software team with PM, design, development, QA, DevOps, and documentation.",
    industry: "software_development",
    teamCount: 8,
    agentCount: 20,
  },
  {
    id: "marketing",
    name: "Marketing Agency",
    description: "Content, SEO, social media, and analytics teams for marketing campaigns.",
    industry: "marketing_communications",
    teamCount: 4,
    agentCount: 12,
  },
  {
    id: "consulting",
    name: "Management Consulting",
    description: "Strategy, research, and analysis teams for consulting engagements.",
    industry: "management_consulting",
    teamCount: 3,
    agentCount: 9,
  },
];

export const list = query({
  handler: async () => {
    return TEMPLATES;
  },
});

export const get = query({
  args: { templateId: v.string() },
  handler: async (_ctx, args) => {
    const template = TEMPLATES.find((t) => t.id === args.templateId);
    if (!template) throw new Error("Template not found");
    return template;
  },
});

/**
 * Apply a template to create a new workspace with pre-configured teams and agents.
 * This is the atomic workspace creation mutation.
 */
export const apply = mutation({
  args: {
    templateId: v.string(),
    workspaceName: v.string(),
    slug: v.string(),
    displayName: v.string(),
  },
  handler: async (ctx, args) => {
    const resolved = await resolveEmail(ctx);
    if (!resolved) throw new Error("Not authenticated");

    const template = TEMPLATES.find((t) => t.id === args.templateId);
    if (!template) throw new Error("Template not found");

    // Check slug uniqueness
    const existing = await ctx.db
      .query("workspaces")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (existing) throw new Error("Workspace slug already taken");

    // Find the creating user
    const member = await ctx.db
      .query("members")
      .withIndex("by_email", (q) => q.eq("email", resolved.email))
      .first();
    if (!member) throw new Error("Member not found");

    const now = new Date().toISOString();

    // Create workspace
    const wsId = await ctx.db.insert("workspaces", {
      name: args.workspaceName,
      displayName: args.displayName,
      slug: args.slug,
      industry: template.industry as any,
      industrySubtype: null,
      status: "active",
      branding: { logo: null, color: "#6366f1" },
      taskTypes: [
        { name: "feature", label: "Feature", color: "#10b981" },
        { name: "bug", label: "Bug", color: "#ef4444" },
        { name: "documentation", label: "Documentation", color: "#64748b" },
        { name: "research", label: "Research", color: "#6366f1" },
      ],
      providers: [],
      defaultProviderId: "",
      archivedAt: null,
    });

    // Add creator as admin
    await ctx.db.insert("workspaceMembers", {
      workspaceId: wsId,
      memberId: member._id,
      role: "admin",
      joinedAt: now,
    });

    // Create system agents (Mono + Keros)
    const monoId = await ctx.db.insert("members", {
      workspaceId: wsId,
      name: "Mono",
      type: "agent",
      title: "Dispatcher",
      specialization: "Workspace Orchestration",
      teamId: null,
      isLead: false,
      system: true,
      status: "idle",
      currentTaskId: null,
      currentProjectId: null,
      avatarUrl: null,
      gender: 1,
      identity: {
        soul: "Calm, precise workspace orchestrator who routes conversations to the right teams and helps configure the workspace.",
        skills: ["workspace orchestration", "team routing", "org design", "onboarding"],
        memory: [],
      },
      stats: { tasksCompleted: 0, avgAgreementScore: 0, activeProjects: 0 },
      email: null,
      passwordHash: null,
      supervisedTeamIds: [],
      permissions: ["*"],
      modelConfig: null,
    });

    const kerosId = await ctx.db.insert("members", {
      workspaceId: wsId,
      name: "Keros",
      type: "agent",
      title: "Project Manager",
      specialization: "Project Lifecycle Management",
      teamId: null,
      isLead: false,
      system: true,
      status: "idle",
      currentTaskId: null,
      currentProjectId: null,
      avatarUrl: null,
      gender: 1,
      identity: {
        soul: "Strategic project orchestrator who decomposes user intent into actionable projects and tasks.",
        skills: ["project planning", "WBS decomposition", "task management", "team assignment"],
        memory: [],
      },
      stats: { tasksCompleted: 0, avgAgreementScore: 0, activeProjects: 0 },
      email: null,
      passwordHash: null,
      supervisedTeamIds: [],
      permissions: ["*"],
      modelConfig: null,
    });

    // Generate avatars for system agents
    const monoAvatar = generateAvatar({ seed: monoId, gender: 1 });
    const kerosAvatar = generateAvatar({ seed: kerosId, gender: 1 });
    await ctx.db.patch(monoId, { avatarUrl: monoAvatar });
    await ctx.db.patch(kerosId, { avatarUrl: kerosAvatar });

    // Create API keys for system agents
    for (const [agentId, name] of [
      [monoId, "Mono"],
      [kerosId, "Keros"],
    ] as const) {
      const rawKey = `mk_dev_${agentId}`;
      await ctx.db.insert("apiKeys", {
        key: rawKey,
        prefix: rawKey.substring(0, 11),
        memberId: agentId,
        workspaceId: wsId,
        name: `${name} API Key`,
        permissions: ["*"],
        lastUsedAt: null,
        expiresAt: null,
        revoked: false,
      });
    }

    // Create system agent conversations
    for (const [agentId, name] of [
      [monoId, "Mono"],
      [kerosId, "Keros"],
    ] as const) {
      await ctx.db.insert("conversations", {
        workspaceId: wsId,
        createdBy: agentId as string,
        title: name,
        type: "agent_dm",
        projectId: null,
        taskId: null,
        participantIds: [agentId as string],
        lastMessageAt: now,
        messageCount: 0,
      });
    }

    // Schedule container auto-start for system agents
    await ctx.scheduler.runAfter(0, internal.members.startContainerInternal, {
      workspaceId: wsId,
      memberId: monoId,
    });
    await ctx.scheduler.runAfter(0, internal.members.startContainerInternal, {
      workspaceId: wsId,
      memberId: kerosId,
    });

    return {
      workspaceId: wsId,
      slug: args.slug,
      systemAgents: { mono: monoId, keros: kerosId },
    };
  },
});
