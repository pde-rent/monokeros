import { Controller, Get, Post, Patch, Delete, Param, Body, Req } from '@nestjs/common';
import { MockStore } from '../store/mock-store';
import { createTeamSchema, updateTeamSchema } from '@monokeros/types';
import type { Team, CreateTeamInput, UpdateTeamInput } from '@monokeros/types';
import { BaseCrudController } from '../common/base-crud.controller';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { generateId } from '@monokeros/utils';
import { DEFAULT_ENTITY_COLOR, PERMISSIONS } from '@monokeros/constants';
import { Permissions } from '../auth/permissions.decorator';
import { FilesService } from '../files/files.service';

@Controller('workspaces/:slug/teams')
export class TeamsController extends BaseCrudController<Team> {
  constructor(
    store: MockStore,
    private filesService: FilesService,
  ) {
    super(store, 'teams', 'Team');
  }

  @Get()
  @Permissions(PERMISSIONS.teams.read)
  override list(@Req() req: any) {
    return super.list(req);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.teams.read)
  override detail(@Param('id') id: string) {
    const team = this.find(id);
    const members = this.store.getMembersByTeam(id);
    return { ...team, members };
  }

  @Post()
  @Permissions(PERMISSIONS.teams.write)
  create(
    @Body(new ZodValidationPipe(createTeamSchema)) body: CreateTeamInput,
    @Req() req: any,
  ) {
    const team: Team = {
      id: generateId('team'),
      workspaceId: req.workspace.id,
      name: body.name,
      type: body.type,
      color: body.color ?? DEFAULT_ENTITY_COLOR,
      leadId: body.leadId,
      memberIds: body.memberIds ?? [],
    };
    this.store.teams.set(team.id, team);
    this.filesService.ensureTeamDrive(team.id);
    return team;
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.teams.write)
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateTeamSchema)) body: UpdateTeamInput,
  ) {
    const team = this.find(id);
    Object.assign(team, body);
    return team;
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.teams.write)
  remove(@Param('id') id: string) {
    this.find(id); // throws 404 if not found
    this.store.teams.delete(id);
    return { success: true };
  }
}
