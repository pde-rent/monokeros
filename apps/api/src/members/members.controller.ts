import { Controller, Get, Post, Delete, Param, Patch, Body, Query, BadRequestException, Req } from '@nestjs/common';
import { MockStore } from '../store/mock-store';
import { MembersGateway } from './members.gateway';
import { MemberStatus, ZeroClawStatus, NotificationType, MemberType, updateMemberStatusSchema, createMemberSchema, updateMemberSchema } from '@monokeros/types';
import type { Member, UpdateMemberStatusInput, CreateMemberInput, UpdateMemberInput, MemberGender } from '@monokeros/types';
import { OpenClawService } from '../openclaw/openclaw.service';
import { ApiKeyService } from '../auth/api-key.service';
import { BaseCrudController } from '../common/base-crud.controller';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { generateId } from '@monokeros/utils';
import { PERMISSIONS, DEFAULT_AGENT_PERMISSIONS } from '@monokeros/constants';
import { Permissions } from '../auth/permissions.decorator';
import { FilesService } from '../files/files.service';
import { generateAvatar } from '@monokeros/avatar';
import { NotificationsService } from '../notifications/notifications.service';
import { IdentityService } from '../identity/identity.service';

@Controller('workspaces/:slug/members')
export class MembersController extends BaseCrudController<Member> {
  constructor(
    store: MockStore,
    private gateway: MembersGateway,
    private openclaw: OpenClawService,
    private apiKeyService: ApiKeyService,
    private filesService: FilesService,
    private notificationsService: NotificationsService,
    private identityService: IdentityService,
  ) {
    super(store, 'members', 'Member');
  }

  @Get()
  @Permissions(PERMISSIONS.members.read)
  override list(@Req() req: any) {
    return super.list(req);
  }

  @Get('avatar/preview')
  @Permissions(PERMISSIONS.members.read)
  previewAvatar(
    @Query('seed') seed?: string,
    @Query('teamId') teamId?: string,
    @Query('gender') gender?: string,
  ) {
    const teamColor = teamId ? this.store.teams.get(teamId)?.color : undefined;
    const genderValue = gender ? (Number(gender) as MemberGender) : undefined;
    return {
      avatarUrl: generateAvatar({
        seed: seed || generateId('member'),
        backgroundColor: teamColor,
        gender: genderValue,
      }),
    };
  }

  @Get('identity/preview')
  @Permissions(PERMISSIONS.members.read)
  async previewIdentity(@Query('gender') gender?: string) {
    const genderValue = gender ? (Number(gender) as MemberGender) : undefined;
    if (genderValue) {
      const identity = await this.identityService.generateIdentityForGender(genderValue);
      return identity;
    }
    return this.identityService.generateIdentity();
  }

  @Get(':id')
  @Permissions(PERMISSIONS.members.read)
  override detail(@Param('id') id: string) {
    return super.detail(id);
  }

  @Post()
  @Permissions(PERMISSIONS.members.manage)
  async create(
    @Body(new ZodValidationPipe(createMemberSchema)) body: CreateMemberInput,
    @Req() req: any,
  ) {
    const id = generateId('member');
    const teamColor = this.store.teams.get(body.teamId)?.color;
    const gender = body.gender ?? (Math.random() < 0.5 ? 1 : 2) as MemberGender;
    const member: Member = {
      id,
      workspaceId: req.workspace.id,
      name: body.name,
      type: MemberType.AGENT,
      title: body.title,
      specialization: body.specialization,
      teamId: body.teamId,
      isLead: body.isLead,
      system: false,
      status: MemberStatus.IDLE,
      currentTaskId: null,
      currentProjectId: null,
      avatarUrl: body.avatarUrl || generateAvatar({ seed: id, backgroundColor: teamColor, gender }),
      gender,
      // Avatar files (SVG+PNG) are saved below after drive creation
      identity: body.identity,
      stats: { tasksCompleted: 0, avgAgreementScore: 0, activeProjects: 0 },
      email: null,
      passwordHash: null,
      supervisedTeamIds: [],
      permissions: body.permissions,
      modelConfig: body.modelConfig ?? null,
    };
    this.store.members.set(member.id, member);
    if (member.type === MemberType.AGENT) {
      this.filesService.ensureMemberDrive(member.id);
      if (!body.avatarUrl) {
        // Save SVG + PNG to member drive (fire and forget)
        this.filesService.generateAndSaveAvatar(member.id, teamColor, gender);
      }
    }
    this.gateway.emitMemberCreated(member);

    // Auto-generate API key for agent members
    const { rawKey } = await this.apiKeyService.create({
      name: `${member.name} daemon key`,
      memberId: member.id,
      permissions: body.permissions?.length ? body.permissions : DEFAULT_AGENT_PERMISSIONS,
      expiresAt: null,
    }, req.workspace.id);

    // Notify human workspace members
    const humans = this.store.getHumanMembers()
      .filter((m) => m.workspaceId === req.workspace.id && m.id !== req.user?.sub);
    this.notificationsService.createForMany(
      humans.map((h) => h.id),
      {
        workspaceId: req.workspace.id,
        type: NotificationType.MEMBER_ADDED,
        title: 'New member',
        body: `${member.name} has been added to the workspace.`,
        entityType: 'member',
        entityId: member.id,
        actorId: req.user?.sub ?? null,
      },
    );

    return { ...member, apiKey: rawKey };
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.members.manage)
  async updateMember(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateMemberSchema)) body: UpdateMemberInput,
  ) {
    const member = this.find(id);
    const modelChanged = body.modelConfig !== undefined
      && JSON.stringify(body.modelConfig) !== JSON.stringify(member.modelConfig);
    const newGender = body.gender;
    const genderChanged = newGender !== undefined && newGender !== member.gender;

    // If gender is changing, regenerate avatar
    if (genderChanged && member.type === 'agent' && newGender) {
      const teamColor = member.teamId ? this.store.teams.get(member.teamId)?.color : undefined;
      member.gender = newGender;
      member.avatarUrl = generateAvatar({ seed: id, backgroundColor: teamColor, gender: newGender });
      // Regenerate avatar files in background
      this.filesService.generateAndSaveAvatar(id, teamColor, newGender);
    }

    this.store.updateMember(id, body);

    // Restart daemon if model config changed and agent is running
    if (modelChanged && member.type === 'agent') {
      const rt = this.openclaw.getRuntime(id);
      if (rt?.status === ZeroClawStatus.RUNNING) {
        await this.openclaw.stop(id);
        await this.openclaw.start(id);
      }
    }

    this.gateway.emitMemberUpdated(member);
    return this.store.members.get(id);
  }

  @Post(':id/reroll-name')
  @Permissions(PERMISSIONS.members.manage)
  async rerollName(@Param('id') id: string) {
    const member = this.find(id);
    if (member.type !== 'agent') {
      throw new BadRequestException('Only agent members can have their name rerolled');
    }

    // Generate new name with current gender
    const identity = await this.identityService.generateIdentityForGender(member.gender);
    member.name = identity.firstName;

    this.gateway.emitMemberUpdated(member);
    return member;
  }

  @Post(':id/reroll-identity')
  @Permissions(PERMISSIONS.members.manage)
  async rerollIdentity(@Param('id') id: string) {
    const member = this.find(id);
    if (member.type !== 'agent') {
      throw new BadRequestException('Only agent members can have their identity rerolled');
    }

    // Generate new name and gender
    const identity = await this.identityService.generateIdentity();
    member.name = identity.firstName;
    member.gender = identity.gender;

    // Regenerate avatar with new gender
    const teamColor = member.teamId ? this.store.teams.get(member.teamId)?.color : undefined;
    member.avatarUrl = generateAvatar({ seed: id, backgroundColor: teamColor, gender: identity.gender });
    this.filesService.generateAndSaveAvatar(id, teamColor, identity.gender);

    this.gateway.emitMemberUpdated(member);
    return member;
  }

  @Patch(':id/status')
  @Permissions(PERMISSIONS.members.write)
  updateStatus(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateMemberStatusSchema)) body: UpdateMemberStatusInput,
  ) {
    const member = this.find(id);
    member.status = body.status;
    this.gateway.emitStatusChanged(id, body.status);
    return member;
  }

  @Post(':id/start')
  @Permissions(PERMISSIONS.members.manage)
  async startMember(@Param('id') id: string) {
    const member = this.find(id);
    if (member.type !== 'agent') {
      throw new BadRequestException('Only agent members can be started');
    }
    return this.openclaw.start(id);
  }

  @Post(':id/stop')
  @Permissions(PERMISSIONS.members.manage)
  async stopMember(@Param('id') id: string) {
    const member = this.find(id);
    if (member.type !== 'agent') {
      throw new BadRequestException('Only agent members can be stopped');
    }
    await this.openclaw.stop(id);
    return { success: true };
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.members.manage)
  async deleteMember(
    @Param('id') id: string,
    @Req() req: { user?: { sub: string }; workspace: { id: string } },
  ) {
    const member = this.find(id);
    if (member.system) {
      throw new BadRequestException('Cannot delete system agent');
    }
    // Stop agent if running
    if (member.type === 'agent') {
      await this.openclaw.stop(id);
    }
    this.store.members.delete(id);

    // Notify human workspace members
    const humans = this.store.getHumanMembers()
      .filter((m) => m.workspaceId === req.workspace.id && m.id !== req.user?.sub);
    this.notificationsService.createForMany(
      humans.map((h) => h.id),
      {
        workspaceId: req.workspace.id,
        type: NotificationType.MEMBER_REMOVED,
        title: 'Member removed',
        body: `${member.name} has been removed from the workspace.`,
        entityType: 'member',
        entityId: member.id,
        actorId: req.user?.sub ?? null,
      },
    );

    return { success: true };
  }

  @Get(':id/runtime')
  @Permissions(PERMISSIONS.members.read)
  getRuntime(@Param('id') id: string) {
    return this.openclaw.getRuntime(id) ?? { memberId: id, status: ZeroClawStatus.STOPPED };
  }
}
