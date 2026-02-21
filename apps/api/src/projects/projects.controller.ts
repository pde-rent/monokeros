import { Controller, Get, Post, Param, Patch, Body, Query, NotFoundException, ForbiddenException, ConflictException, Req } from '@nestjs/common';
import { MockStore } from '../store/mock-store';
import { ProjectsGateway } from './projects.gateway';
import { GateStatus, TaskStatus, NotificationType, updateGateSchema, createProjectSchema, updateProjectSchema } from '@monokeros/types';
import type { Project, ApiKey, UpdateGateInput, CreateProjectInput, UpdateProjectInput } from '@monokeros/types';
import { BaseCrudController } from '../common/base-crud.controller';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { generateId, now } from '@monokeros/utils';
import { DEFAULT_ENTITY_COLOR, PERMISSIONS } from '@monokeros/constants';
import { Permissions } from '../auth/permissions.decorator';
import { FilesService } from '../files/files.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { JwtPayload } from '../auth/auth.service';

@Controller('workspaces/:slug/projects')
export class ProjectsController extends BaseCrudController<Project> {
  constructor(
    store: MockStore,
    private gateway: ProjectsGateway,
    private filesService: FilesService,
    private notificationsService: NotificationsService,
  ) {
    super(store, 'projects', 'Project');
  }

  @Get()
  @Permissions(PERMISSIONS.projects.read)
  override list(
    @Req() req?: any,
    @Query('status') status?: TaskStatus,
    @Query('type') type?: string,
    @Query('search') search?: string,
  ) {
    let projects = this.getAll(req?.workspace?.id);
    if (status) {
      projects = projects.filter((p) => p.status === status);
    }
    if (type) {
      projects = projects.filter((p) => p.types.includes(type));
    }
    if (search) {
      const q = search.toLowerCase();
      projects = projects.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.types.some((t) => t.toLowerCase().includes(q)),
      );
    }
    return projects;
  }

  private findByIdOrSlug(idOrSlug: string): Project {
    const byId = this.store.projects.get(idOrSlug);
    if (byId) return byId;
    for (const project of this.store.projects.values()) {
      if (project.slug === idOrSlug) return project;
    }
    throw new NotFoundException('Project not found');
  }

  @Get(':id')
  @Permissions(PERMISSIONS.projects.read)
  override detail(@Param('id') idOrSlug: string) {
    return this.findByIdOrSlug(idOrSlug);
  }

  @Post()
  @Permissions(PERMISSIONS.projects.write)
  create(
    @Body(new ZodValidationPipe(createProjectSchema)) body: CreateProjectInput,
    @Req() req: { user: JwtPayload; workspace: { id: string } },
  ) {
    // Ensure slug uniqueness within workspace
    for (const existing of this.store.projects.values()) {
      if (existing.workspaceId === req.workspace.id && existing.slug === body.slug) {
        throw new ConflictException(`A project with slug "${body.slug}" already exists`);
      }
    }

    const timestamp = now();
    const phases = body.phases;
    const project: Project = {
      id: generateId('proj'),
      workspaceId: req.workspace.id,
      name: body.name,
      slug: body.slug,
      description: body.description ?? '',
      color: body.color ?? DEFAULT_ENTITY_COLOR,
      types: body.types,
      status: TaskStatus.BACKLOG,
      phases,
      currentPhase: phases[0],
      gates: phases.map((phase) => ({
        id: generateId('gate'),
        phase,
        status: GateStatus.PENDING,
        approverId: null,
        approvedAt: null,
        feedback: null,
      })),
      assignedTeamIds: body.assignedTeamIds ?? [],
      assignedMemberIds: body.assignedMemberIds ?? [],
      createdById: req.user.sub,
      modifiedAt: timestamp,
      conversationId: null,
      createdAt: timestamp,
    };
    this.store.projects.set(project.id, project);
    this.filesService.ensureProjectDrive(project.id);
    return project;
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.projects.write)
  update(
    @Param('id') idOrSlug: string,
    @Body(new ZodValidationPipe(updateProjectSchema)) body: UpdateProjectInput,
    @Req() req: { user: JwtPayload; apiKey?: ApiKey },
  ) {
    const project = this.findByIdOrSlug(idOrSlug);

    const userId = req.user.sub;
    const isAdmin = req.user.role === 'admin';
    const isProjectCreator = project.createdById === userId;
    const hasManagePermission = req.apiKey?.permissions.includes('projects:manage');

    // Check if caller is lead PM
    const member = this.store.members.get(userId);
    const isLeadPM = member?.isLead && member.teamId === 'team_pm';

    if (!isAdmin && !isLeadPM && !isProjectCreator && !hasManagePermission) {
      throw new ForbiddenException(
        'Only the project creator, Lead PM, or an admin can modify project metadata',
      );
    }

    Object.assign(project, body, { modifiedAt: now() });
    return project;
  }

  @Patch(':id/gate')
  @Permissions(PERMISSIONS.projects.write)
  updateGate(
    @Param('id') idOrSlug: string,
    @Body(new ZodValidationPipe(updateGateSchema)) body: UpdateGateInput,
    @Req() req: { user: JwtPayload; workspace: { id: string } },
  ) {
    const project = this.findByIdOrSlug(idOrSlug);
    const gate = project.gates.find((g) => g.phase === body.phase);
    if (!gate) throw new NotFoundException('Gate not found');
    gate.status = body.status;
    if (body.feedback) gate.feedback = body.feedback;
    if (body.status === GateStatus.APPROVED) {
      gate.approvedAt = now();
    }
    this.gateway.emitGateUpdated(project.id, gate);

    // Notify human admin/validators when gate is awaiting approval
    if (body.status === GateStatus.AWAITING_APPROVAL) {
      const humans = this.store.getHumanMembers()
        .filter((m) => m.workspaceId === req.workspace.id);
      this.notificationsService.createForMany(
        humans.map((h) => h.id),
        {
          workspaceId: req.workspace.id,
          type: NotificationType.GATE_APPROVAL_REQUEST,
          title: 'Gate approval needed',
          body: `${project.name} ${body.phase} gate is awaiting approval.`,
          entityType: 'project',
          entityId: project.id,
          actorId: req.user.sub,
        },
      );
    }

    return project;
  }
}
