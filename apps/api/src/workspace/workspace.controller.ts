import { Controller, Get, Post, Patch, Delete, Param, Body, Req, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { MockStore } from '../store/mock-store';
import { AiProvider, WorkspaceStatus, updateWorkspaceSchema, createWorkspaceSchema, providerConfigSchema } from '@monokeros/types';
import type { Workspace, UpdateWorkspaceInput, CreateWorkspaceInput, ProviderConfig, WorkspaceRole } from '@monokeros/types';
import { generateId, now } from '@monokeros/utils';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { DEFAULT_ENTITY_COLOR, PERMISSIONS, INDUSTRY_TASK_TYPES } from '@monokeros/constants';
import { Permissions } from '../auth/permissions.decorator';
import { SystemAgentsService } from './system-agents.service';
import { TelegramService } from '../telegram/telegram.service';
import { OpenClawService } from '../openclaw/openclaw.service';

/** Top-level workspace management (no workspace scope) */
@Controller('workspaces')
export class WorkspacesController {
  constructor(
    private store: MockStore,
    private systemAgents: SystemAgentsService,
    private telegramService: TelegramService,
    private openClawService: OpenClawService,
  ) {}

  @Get()
  list(@Req() req: { user: { sub: string } }) {
    const memberId = req.user.sub;
    const memberships = Array.from(this.store.workspaceMembers.values())
      .filter((m) => m.memberId === memberId);

    return memberships.map((m) => {
      const ws = this.store.workspaces.get(m.workspaceId);
      if (!ws) return null;
      return { id: ws.id, slug: ws.slug, displayName: ws.displayName, role: m.role, branding: ws.branding, industry: ws.industry };
    }).filter(Boolean);
  }

  @Post()
  async create(
    @Req() req: { user: { sub: string } },
    @Body(new ZodValidationPipe(createWorkspaceSchema)) body: CreateWorkspaceInput,
  ) {
    const existing = Array.from(this.store.workspaces.values()).find((w) => w.slug === body.slug);
    if (existing) throw new ConflictException('Workspace slug already taken');

    const id = generateId('ws');
    const ws: Workspace = {
      id,
      name: body.name,
      displayName: body.displayName,
      slug: body.slug,
      industry: body.industry,
      industrySubtype: null,
      status: WorkspaceStatus.ACTIVE,
      branding: {
        logo: body.branding?.logo ?? null,
        color: body.branding?.color ?? DEFAULT_ENTITY_COLOR,
      },
      taskTypes: body.taskTypes ?? INDUSTRY_TASK_TYPES[body.industry] ?? [],
      providers: body.providers ?? [],
      defaultProviderId: body.defaultProviderId ?? AiProvider.ZAI,
      telegramBotToken: body.telegramBotToken ?? null,
      createdAt: now(),
      archivedAt: null,
    };
    this.store.workspaces.set(id, ws);

    const wmId = generateId('wm');
    this.store.workspaceMembers.set(wmId, {
      id: wmId,
      workspaceId: id,
      memberId: req.user.sub,
      role: 'admin' as WorkspaceRole,
      joinedAt: now(),
    });

    // Bootstrap system agents (Mono + Keros)
    await this.systemAgents.bootstrap(id, body.displayName);

    // Auto-start Telegram bot if token was provided
    if (ws.telegramBotToken) {
      await this.telegramService.refreshBot(ws);
    }

    return { ...ws, role: 'admin' };
  }

  @Delete(':slug')
  async delete(
    @Req() req: { user: { sub: string } },
    @Param('slug') slug: string,
    @Body() body: { confirmName: string },
  ) {
    const ws = Array.from(this.store.workspaces.values()).find((w) => w.slug === slug);
    if (!ws) throw new NotFoundException('Workspace not found');

    // Verify membership as admin
    const membership = Array.from(this.store.workspaceMembers.values())
      .find((m) => m.workspaceId === ws.id && m.memberId === req.user.sub && m.role === 'admin');
    if (!membership) throw new BadRequestException('Only admins can delete workspaces');

    // Confirm name must match slug
    if (body.confirmName !== ws.slug) {
      throw new BadRequestException('Confirmation name does not match workspace slug');
    }

    // Stop all agent runtimes for this workspace
    const wsMembers = [...this.store.members.values()].filter((m) => m.workspaceId === ws.id && m.type === 'agent');
    await Promise.all(wsMembers.map((m) => this.openClawService.stop(m.id).catch(() => {})));

    // Stop Telegram bot
    await this.telegramService.stopBot(ws.id);

    // Delete all workspace-scoped data
    for (const [id, m] of this.store.members) if (m.workspaceId === ws.id) this.store.members.delete(id);
    for (const [id, t] of this.store.teams) if (t.workspaceId === ws.id) this.store.teams.delete(id);
    for (const [id, p] of this.store.projects) if (p.workspaceId === ws.id) this.store.projects.delete(id);
    for (const [id, t] of this.store.tasks) if (t.workspaceId === ws.id) this.store.tasks.delete(id);
    for (const [id, c] of this.store.conversations) if (c.workspaceId === ws.id) {
      // Delete messages for this conversation
      for (const [mid, msg] of this.store.messages) if (msg.conversationId === c.id) this.store.messages.delete(mid);
      this.store.conversations.delete(id);
    }
    for (const [id, wm] of this.store.workspaceMembers) if (wm.workspaceId === ws.id) this.store.workspaceMembers.delete(id);
    for (const [id, n] of this.store.notifications) if ((n as any).workspaceId === ws.id) this.store.notifications.delete(id);
    this.store.workspaces.delete(ws.id);

    return { success: true };
  }
}

/** Workspace config — scoped under workspaces/:slug/ */
@Controller('workspaces/:slug/config')
export class WorkspaceConfigController {
  constructor(
    private store: MockStore,
    private telegramService: TelegramService,
  ) {}

  @Get()
  @Permissions(PERMISSIONS.workspace.admin)
  get(@Req() req: { workspace: Workspace }) {
    return req.workspace;
  }

  @Patch()
  @Permissions(PERMISSIONS.workspace.admin)
  async update(
    @Req() req: { workspace: Workspace },
    @Body(new ZodValidationPipe(updateWorkspaceSchema)) body: UpdateWorkspaceInput,
  ) {
    const ws = req.workspace;
    const tokenChanged = 'telegramBotToken' in body && body.telegramBotToken !== ws.telegramBotToken;
    const { branding, ...rest } = body;
    if (branding) ws.branding = { ...ws.branding, ...branding };
    Object.assign(ws, rest);

    // Auto-refresh Telegram bot when token changes
    if (tokenChanged) {
      await this.telegramService.refreshBot(ws);
    }

    return ws;
  }

  // ── Provider Management ────────────────────────────

  @Get('providers')
  @Permissions(PERMISSIONS.workspace.admin)
  listProviders(@Req() req: { workspace: Workspace }) {
    const providers = this.store.getWorkspaceProviders(req.workspace.id);
    // Mask API keys in responses
    return providers.map((p) => ({
      ...p,
      apiKey: p.apiKey ? `${p.apiKey.slice(0, 8)}${'*'.repeat(Math.max(0, p.apiKey.length - 8))}` : '',
    }));
  }

  @Post('providers')
  @Permissions(PERMISSIONS.workspace.admin)
  addProvider(
    @Req() req: { workspace: Workspace },
    @Body(new ZodValidationPipe(providerConfigSchema)) body: ProviderConfig,
  ) {
    const config = this.store.addProvider(req.workspace.id, body);
    return { ...config, apiKey: `${config.apiKey.slice(0, 8)}${'*'.repeat(Math.max(0, config.apiKey.length - 8))}` };
  }

  @Patch('providers/:provider')
  @Permissions(PERMISSIONS.workspace.admin)
  updateProvider(
    @Req() req: { workspace: Workspace },
    @Param('provider') provider: string,
    @Body() body: Partial<ProviderConfig>,
  ) {
    if (!Object.values(AiProvider).includes(provider as AiProvider)) {
      throw new BadRequestException(`Invalid provider: ${provider}`);
    }
    const config = this.store.updateProvider(req.workspace.id, provider as AiProvider, body);
    return { ...config, apiKey: `${config.apiKey.slice(0, 8)}${'*'.repeat(Math.max(0, config.apiKey.length - 8))}` };
  }

  @Delete('providers/:provider')
  @Permissions(PERMISSIONS.workspace.admin)
  removeProvider(
    @Req() req: { workspace: Workspace },
    @Param('provider') provider: string,
  ) {
    if (!Object.values(AiProvider).includes(provider as AiProvider)) {
      throw new BadRequestException(`Invalid provider: ${provider}`);
    }
    this.store.removeProvider(req.workspace.id, provider as AiProvider);
    return { success: true };
  }

  @Patch('default-provider')
  @Permissions(PERMISSIONS.workspace.admin)
  setDefaultProvider(
    @Req() req: { workspace: Workspace },
    @Body() body: { defaultProviderId: string },
  ) {
    if (!Object.values(AiProvider).includes(body.defaultProviderId as AiProvider)) {
      throw new BadRequestException(`Invalid provider: ${body.defaultProviderId}`);
    }
    req.workspace.defaultProviderId = body.defaultProviderId as AiProvider;
    return { defaultProviderId: req.workspace.defaultProviderId };
  }
}
