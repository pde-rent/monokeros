import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import type { Member, Team, Workspace, WorkspaceMember, WorkspaceRole } from '@monokeros/types';
import { AiProvider, MemberStatus, MemberType, WorkspaceStatus, ZeroClawStatus } from '@monokeros/types';
import { TEMPLATE_REGISTRY, type TemplateListing, type TemplateManifest } from '@monokeros/templates';
import { generateId, now } from '@monokeros/utils';
import { DEFAULT_AGENT_PERMISSIONS, DEFAULT_ENTITY_COLOR } from '@monokeros/constants';
import { generateAvatar } from '@monokeros/avatar';
import { MockStore } from '../store/mock-store';
import { FilesService } from '../files/files.service';
import { ApiKeyService } from '../auth/api-key.service';
import { IdentityService } from '../identity/identity.service';
import { SystemAgentsService } from '../workspace/system-agents.service';
import { OpenClawService } from '../openclaw/openclaw.service';

@Injectable()
export class TemplatesService {
  private readonly log = new Logger(TemplatesService.name);

  constructor(
    private store: MockStore,
    private filesService: FilesService,
    private apiKeyService: ApiKeyService,
    private identityService: IdentityService,
    private systemAgents: SystemAgentsService,
    private openclaw: OpenClawService,
  ) {}

  listTemplates(category?: string): TemplateListing[] {
    const listings: TemplateListing[] = [];
    for (const tpl of TEMPLATE_REGISTRY.values()) {
      if (category && tpl.category !== category) continue;
      const { workspace: _, agents: _a, teams: _t, longDescription: _l, ...listing } = tpl;
      listings.push(listing);
    }
    return listings;
  }

  getTemplate(id: string): TemplateManifest | null {
    return TEMPLATE_REGISTRY.get(id) ?? null;
  }

  async applyTemplate(
    templateId: string,
    overrides: {
      slug: string;
      displayName: string;
      branding?: { color: string; logo?: string };
      description?: string;
      includeAgents?: string[];
      includeTeams?: string[];
    },
    userId: string,
  ): Promise<Workspace> {
    const tpl = TEMPLATE_REGISTRY.get(templateId);
    if (!tpl) throw new NotFoundException(`Template "${templateId}" not found`);

    // Check slug uniqueness
    const existing = Array.from(this.store.workspaces.values()).find((w) => w.slug === overrides.slug);
    if (existing) throw new ConflictException('Workspace slug already taken');

    const wsId = generateId('ws');
    const timestamp = now();

    // Determine which agents/teams to include (default: all)
    const includeAgents = overrides.includeAgents ?? tpl.agents.map((a) => a.metadata.name);
    const includeTeams = overrides.includeTeams ?? tpl.teams.map((t) => t.metadata.name);

    // 1. Create workspace
    const ws: Workspace = {
      id: wsId,
      name: overrides.slug,
      displayName: overrides.displayName,
      slug: overrides.slug,
      industry: tpl.workspace.spec.industry,
      industrySubtype: tpl.workspace.spec.industrySubtype,
      status: WorkspaceStatus.ACTIVE,
      branding: {
        logo: overrides.branding?.logo ?? null,
        color: overrides.branding?.color ?? tpl.workspace.spec.branding?.color ?? DEFAULT_ENTITY_COLOR,
      },
      taskTypes: [],
      providers: [],
      defaultProviderId: AiProvider.ZAI,
      createdAt: timestamp,
      archivedAt: null,
    };
    this.store.workspaces.set(wsId, ws);

    // 2. Create workspace member (admin) for the caller
    const wmId = generateId('wm');
    this.store.workspaceMembers.set(wmId, {
      id: wmId,
      workspaceId: wsId,
      memberId: userId,
      role: 'admin' as WorkspaceRole,
      joinedAt: timestamp,
    } satisfies WorkspaceMember);

    // 3. Bootstrap system agents (Mono + Keros) — drives, avatars, conversations, API keys
    const context = `Workspace "${overrides.displayName}" created from template "${tpl.displayName}"`;
    const { monoId: _monoId, kerosId: _kerosId } = await this.systemAgents.bootstrap(wsId, overrides.displayName, context);

    // 4. Create agents from manifest, track name→id mapping (filter by includeAgents)
    const nameToId = new Map<string, string>();
    for (const agentManifest of tpl.agents) {
      if (!includeAgents.includes(agentManifest.metadata.name)) continue;
      const agentId = generateId('agent');
      const name = agentManifest.metadata.name;
      nameToId.set(name, agentId);

      const soul = 'soul' in agentManifest.spec.identity
        ? agentManifest.spec.identity.soul
        : '';

      // Generate human first name and gender from randomuser.me
      const generatedIdentity = await this.identityService.generateIdentity();

      const member: Member = {
        id: agentId,
        workspaceId: wsId,
        name: generatedIdentity.firstName, // Human first name (e.g., "Nicole", "Marcus")
        type: MemberType.AGENT,
        title: agentManifest.spec.title, // Title remains unchanged (e.g., "Frontend Lead")
        specialization: agentManifest.spec.specialization,
        teamId: null, // Set when teams are created
        isLead: false, // Set when teams are created
        system: false,
        status: MemberStatus.OFFLINE,
        currentTaskId: null,
        currentProjectId: null,
        avatarUrl: generateAvatar({ seed: agentId, gender: generatedIdentity.gender }),
        gender: generatedIdentity.gender,
        identity: {
          soul,
          skills: [agentManifest.spec.specialization],
          memory: [],
        },
        stats: { tasksCompleted: 0, avgAgreementScore: 0, activeProjects: 0 },
        email: null,
        passwordHash: null,
        supervisedTeamIds: [],
        permissions: [...DEFAULT_AGENT_PERMISSIONS],
        modelConfig: null,
      };
      this.store.members.set(agentId, member);
      this.filesService.ensureMemberDrive(agentId);
    }

    // 5. Create teams, resolve name→id references (filter by includeTeams)
    for (const teamManifest of tpl.teams) {
      if (!includeTeams.includes(teamManifest.metadata.name)) continue;
      const teamId = generateId('team');
      const leadId = nameToId.get(teamManifest.spec.lead) ?? '';
      const memberIds = teamManifest.spec.members.map((n) => nameToId.get(n)).filter(Boolean) as string[];

      const team: Team = {
        id: teamId,
        workspaceId: wsId,
        name: teamManifest.spec.displayName,
        type: teamManifest.spec.type,
        color: teamManifest.spec.color,
        leadId,
        memberIds: [leadId, ...memberIds],
      };
      this.store.teams.set(teamId, team);
      this.filesService.ensureTeamDrive(teamId);

      // Update agent teamId and isLead
      if (leadId) {
        const lead = this.store.members.get(leadId);
        if (lead) {
          lead.teamId = teamId;
          lead.isLead = true;
        }
      }
      for (const mid of memberIds) {
        const member = this.store.members.get(mid);
        if (member) member.teamId = teamId;
      }
    }

    // 5b. Now that teams exist, regenerate avatars with team background colors and save files
    const avatarSaveJobs: Promise<void>[] = [];
    for (const [, agentId] of nameToId) {
      const member = this.store.members.get(agentId);
      if (!member) continue;
      const teamColor = member.teamId ? this.store.teams.get(member.teamId)?.color : undefined;
      member.avatarUrl = generateAvatar({ seed: agentId, backgroundColor: teamColor, gender: member.gender });
      avatarSaveJobs.push(
        this.filesService.generateAndSaveAvatar(agentId, teamColor, member.gender).then(() => {}),
      );
    }
    // Don't block on file I/O — save in background
    Promise.all(avatarSaveJobs);

    // 6. Generate API keys for template agents
    for (const [name, agentId] of nameToId) {
      await this.apiKeyService.create(
        { memberId: agentId, name: `${name} daemon key`, permissions: DEFAULT_AGENT_PERMISSIONS, expiresAt: null },
        wsId,
      );
    }

    // 7. Start template agent daemons in background (system agents already started by bootstrap)
    const agentIds = [...nameToId.values()];
    Promise.allSettled(agentIds.map((id) => this.openclaw.start(id)))
      .then((results) => {
        const running = results.filter((r) => r.status === 'fulfilled' && r.value.status === ZeroClawStatus.RUNNING).length;
        this.log.log(`Template agents started: ${running}/${agentIds.length} running`);
      });

    return ws;
  }
}
