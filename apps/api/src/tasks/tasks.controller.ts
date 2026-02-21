import { Controller, Get, Post, Patch, Param, Body, Query, ForbiddenException, NotFoundException, BadRequestException, Req } from '@nestjs/common';
import { MockStore } from '../store/mock-store';
import { TasksGateway } from './tasks.gateway';
import { TaskStatus, HumanAcceptanceStatus, NotificationType, createTaskSchema, updateTaskSchema, moveTaskSchema, assignTaskSchema, humanAcceptanceActionSchema } from '@monokeros/types';
import type { Task, ApiKey, CreateTaskInput, UpdateTaskInput, MoveTaskInput, AssignTaskInput, HumanAcceptanceActionInput } from '@monokeros/types';
import { generateId, now } from '@monokeros/utils';
import { BaseCrudController } from '../common/base-crud.controller';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { PERMISSIONS } from '@monokeros/constants';
import { Permissions } from '../auth/permissions.decorator';
import type { JwtPayload } from '../auth/auth.service';
import { NotificationsService } from '../notifications/notifications.service';

@Controller('workspaces/:slug/tasks')
export class TasksController extends BaseCrudController<Task> {
  constructor(
    store: MockStore,
    private gateway: TasksGateway,
    private notificationsService: NotificationsService,
  ) {
    super(store, 'tasks', 'Task');
  }

  @Get()
  @Permissions(PERMISSIONS.tasks.read)
  override list(
    @Req() req?: any,
    @Query('projectId') projectId?: string,
    @Query('status') status?: TaskStatus,
    @Query('assigneeId') assigneeId?: string,
    @Query('type') type?: string,
  ) {
    let tasks = this.getAll(req?.workspace?.id);
    if (projectId) tasks = tasks.filter((t) => t.projectId === projectId);
    if (status) tasks = tasks.filter((t) => t.status === status);
    if (assigneeId) tasks = tasks.filter((t) => t.assigneeIds.includes(assigneeId));
    if (type) tasks = tasks.filter((t) => t.type === type);
    return tasks;
  }

  @Get(':id')
  @Permissions(PERMISSIONS.tasks.read)
  override detail(@Param('id') id: string) {
    return super.detail(id);
  }

  @Post()
  @Permissions(PERMISSIONS.tasks.write)
  create(
    @Body(new ZodValidationPipe(createTaskSchema)) body: CreateTaskInput,
    @Req() req: { user: JwtPayload; apiKey?: ApiKey; workspace: { id: string } },
  ) {
    // API key auth: agents can only create tasks in assigned projects (system agents exempt)
    if (req.apiKey) {
      const callerMember = this.store.members.get(req.user.sub);
      if (!callerMember?.system) {
        const project = this.store.projects.get(body.projectId);
        if (!project) throw new NotFoundException('Project not found');
        if (!project.assignedMemberIds.includes(req.user.sub)) {
          throw new ForbiddenException(
            'Agent can only create tasks in projects they are assigned to',
          );
        }
      }
    }

    const task: Task = {
      id: generateId('task'),
      workspaceId: req.workspace.id,
      title: body.title,
      description: body.description || '',
      type: body.type ?? null,
      projectId: body.projectId,
      status: TaskStatus.BACKLOG,
      priority: body.priority,
      assigneeIds: body.assigneeIds,
      teamId: body.teamId,
      phase: body.phase,
      dependencies: body.dependencies,
      offloadable: body.offloadable,
      crossValidation: null,
      requiresHumanAcceptance: body.requiresHumanAcceptance,
      humanAcceptance: null,
      conversationId: null,
      commentCount: 0,
      createdAt: now(),
      updatedAt: now(),
    };
    this.store.tasks.set(task.id, task);
    this.gateway.emitTaskCreated(task);

    // Notify assignees
    if (task.assigneeIds.length > 0) {
      const humanAssignees = task.assigneeIds.filter((id) => {
        const m = this.store.members.get(id);
        return m?.type === 'human';
      });
      this.notificationsService.createForMany(humanAssignees, {
        workspaceId: req.workspace.id,
        type: NotificationType.TASK_ASSIGNED,
        title: 'Task assigned',
        body: `You were assigned to "${task.title}".`,
        entityType: 'task',
        entityId: task.id,
        actorId: req.user.sub,
      });
    }

    return task;
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.tasks.write)
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateTaskSchema)) body: UpdateTaskInput,
  ) {
    const task = this.find(id);
    Object.assign(task, body, { updatedAt: now() });
    this.gateway.emitTaskUpdated(task);
    return task;
  }

  @Patch(':id/move')
  @Permissions(PERMISSIONS.tasks.write)
  move(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(moveTaskSchema)) body: MoveTaskInput,
    @Req() req: { user: JwtPayload; workspace: { id: string } },
  ) {
    const task = this.find(id);
    const from = task.status;

    // Intercept: if moving from IN_REVIEW → DONE on a requiresHumanAcceptance task,
    // redirect to AWAITING_ACCEPTANCE instead
    if (
      body.status === TaskStatus.DONE &&
      task.requiresHumanAcceptance &&
      from === TaskStatus.IN_REVIEW
    ) {
      task.status = TaskStatus.AWAITING_ACCEPTANCE;
      task.humanAcceptance = {
        status: HumanAcceptanceStatus.PENDING,
        reviewerId: null,
        feedback: null,
        reviewedAt: null,
      };
      task.updatedAt = now();
      this.gateway.emitTaskMoved(id, from, TaskStatus.AWAITING_ACCEPTANCE);

      // Notify human workspace members that acceptance is required
      const humans = this.store.getHumanMembers()
        .filter((m) => m.workspaceId === req.workspace.id);
      this.notificationsService.createForMany(
        humans.map((h) => h.id),
        {
          workspaceId: req.workspace.id,
          type: NotificationType.HUMAN_ACCEPTANCE_REQUIRED,
          title: 'Acceptance required',
          body: `"${task.title}" is awaiting your acceptance.`,
          entityType: 'task',
          entityId: task.id,
          actorId: req.user.sub,
        },
      );

      return task;
    }

    task.status = body.status;
    task.updatedAt = now();
    this.gateway.emitTaskMoved(id, from, body.status);

    // Notify on completion
    if (body.status === TaskStatus.DONE) {
      const humans = this.store.getHumanMembers()
        .filter((m) => m.workspaceId === req.workspace.id);
      this.notificationsService.createForMany(
        humans.map((h) => h.id),
        {
          workspaceId: req.workspace.id,
          type: NotificationType.TASK_COMPLETED,
          title: 'Task completed',
          body: `"${task.title}" has been completed.`,
          entityType: 'task',
          entityId: task.id,
          actorId: req.user.sub,
        },
      );
    }

    return task;
  }

  @Patch(':id/acceptance')
  @Permissions(PERMISSIONS.tasks.write)
  acceptance(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(humanAcceptanceActionSchema)) body: HumanAcceptanceActionInput,
    @Req() req: { user: JwtPayload; workspace: { id: string } },
  ) {
    const task = this.find(id);

    if (task.status !== TaskStatus.AWAITING_ACCEPTANCE) {
      throw new BadRequestException('Task is not awaiting acceptance');
    }

    const from = task.status;

    if (body.action === 'accept') {
      task.humanAcceptance = {
        status: HumanAcceptanceStatus.ACCEPTED,
        reviewerId: req.user.sub,
        feedback: body.feedback ?? null,
        reviewedAt: now(),
      };
      task.status = TaskStatus.DONE;
      task.updatedAt = now();
      this.gateway.emitTaskMoved(id, from, TaskStatus.DONE);

      // Notify assignees of acceptance
      const humanAssignees = task.assigneeIds.filter((aid) => {
        const m = this.store.members.get(aid);
        return m?.type === 'human';
      });
      this.notificationsService.createForMany(humanAssignees, {
        workspaceId: req.workspace.id,
        type: NotificationType.HUMAN_ACCEPTANCE_RESOLVED,
        title: 'Task accepted',
        body: `"${task.title}" has been accepted.`,
        entityType: 'task',
        entityId: task.id,
        actorId: req.user.sub,
      });
    } else {
      task.humanAcceptance = {
        status: HumanAcceptanceStatus.REJECTED,
        reviewerId: req.user.sub,
        feedback: body.feedback ?? null,
        reviewedAt: now(),
      };
      task.status = TaskStatus.IN_PROGRESS;
      task.updatedAt = now();
      this.gateway.emitTaskMoved(id, from, TaskStatus.IN_PROGRESS);

      // Notify assignees of rejection
      const humanAssignees = task.assigneeIds.filter((aid) => {
        const m = this.store.members.get(aid);
        return m?.type === 'human';
      });
      this.notificationsService.createForMany(humanAssignees, {
        workspaceId: req.workspace.id,
        type: NotificationType.HUMAN_ACCEPTANCE_RESOLVED,
        title: 'Task rejected',
        body: `"${task.title}" has been rejected${body.feedback ? `: ${body.feedback}` : ''}.`,
        entityType: 'task',
        entityId: task.id,
        actorId: req.user.sub,
      });
    }

    return task;
  }

  @Patch(':id/assign')
  @Permissions(PERMISSIONS.tasks.write)
  assign(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(assignTaskSchema)) body: AssignTaskInput,
  ) {
    const task = this.find(id);
    task.assigneeIds = body.assigneeIds;
    task.updatedAt = now();
    this.gateway.emitTaskUpdated(task);
    return task;
  }
}
