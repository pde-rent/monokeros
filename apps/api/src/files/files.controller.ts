import { Controller, Get, Post, Patch, Delete, Param, Query, Body, Req } from '@nestjs/common';
import { FilesService } from './files.service';
import type {
  CreateFileRequest,
  CreateFolderRequest,
  RenameRequest,
  UpdateFileRequest,
} from '@monokeros/types';
import { PERMISSIONS } from '@monokeros/constants';
import { Permissions } from '../auth/permissions.decorator';

type DriveCategory = 'teams' | 'members' | 'projects' | 'workspace';

@Controller('workspaces/:slug/files')
export class FilesController {
  constructor(private filesService: FilesService) {}

  /** Combined listing: team + member + project + workspace drives */
  @Get('drives')
  @Permissions(PERMISSIONS.files.read)
  listDrives() {
    return this.filesService.listAllDrives();
  }

  /** @deprecated Use /drives */
  @Get('workspaces')
  @Permissions(PERMISSIONS.files.read)
  listWorkspaces() {
    return this.filesService.listAllDrives();
  }

  // ── Team Workspace Endpoints ─────────────────────────────

  @Get('teams/:teamId')
  @Permissions(PERMISSIONS.files.read)
  getTeamDrive(@Param('teamId') teamId: string) {
    return this.filesService.getTeamDrive(teamId);
  }

  @Get('teams/:teamId/file')
  @Permissions(PERMISSIONS.files.read)
  getTeamFile(
    @Param('teamId') teamId: string,
    @Query('path') path: string,
  ) {
    return this.filesService.readTeamFile(teamId, path);
  }

  // ── Member Workspace Endpoints ───────────────────────────

  @Get('members/:memberId')
  @Permissions(PERMISSIONS.files.read)
  getMemberDrive(@Param('memberId') memberId: string) {
    return this.filesService.getMemberDrive(memberId);
  }

  @Get('members/:memberId/file')
  @Permissions(PERMISSIONS.files.read)
  getMemberFile(
    @Param('memberId') memberId: string,
    @Query('path') path: string,
  ) {
    return this.filesService.readMemberFile(memberId, path);
  }

  // ── Project Drive Endpoints ──────────────────────────────

  @Get('projects/:projectId')
  @Permissions(PERMISSIONS.files.read)
  getProjectDrive(@Param('projectId') projectId: string) {
    return this.filesService.getProjectDrive(projectId);
  }

  @Get('projects/:projectId/file')
  @Permissions(PERMISSIONS.files.read)
  getProjectFile(
    @Param('projectId') projectId: string,
    @Query('path') path: string,
  ) {
    return this.filesService.readProjectFile(projectId, path);
  }

  // ── Workspace Shared Drive Endpoints ─────────────────────

  @Get('workspace')
  @Permissions(PERMISSIONS.files.read)
  getWorkspaceDrive() {
    return this.filesService.getWorkspaceDrive();
  }

  @Get('workspace/file')
  @Permissions(PERMISSIONS.files.read)
  getWorkspaceFile(@Query('path') path: string) {
    return this.filesService.readWorkspaceFile(path);
  }

  // ── Legacy Endpoints (keep existing paths working) ────────

  /** @deprecated Use /files/members/:memberId */
  @Get('agents/:agentId')
  @Permissions(PERMISSIONS.files.read)
  getAgentDriveLegacy(@Param('agentId') agentId: string) {
    return this.filesService.getMemberDrive(agentId);
  }

  /** @deprecated Use /files/members/:memberId/file */
  @Get('agents/:agentId/file')
  @Permissions(PERMISSIONS.files.read)
  getAgentFileLegacy(
    @Param('agentId') agentId: string,
    @Query('path') path: string,
  ) {
    return this.filesService.readMemberFile(agentId, path);
  }

  @Get('workspaces/:agentId')
  @Permissions(PERMISSIONS.files.read)
  getWorkspaceLegacy(@Param('agentId') agentId: string) {
    return this.filesService.getMemberDrive(agentId);
  }

  @Get('workspaces/:agentId/file')
  @Permissions(PERMISSIONS.files.read)
  getFileContentLegacy(
    @Param('agentId') agentId: string,
    @Query('path') path: string,
  ) {
    return this.filesService.readMemberFile(agentId, path);
  }

  // ── CRUD Endpoints ───────────────────────────────────────

  @Post(':category/:ownerId/file')
  @Permissions(PERMISSIONS.files.write)
  createFile(
    @Param('category') category: DriveCategory,
    @Param('ownerId') ownerId: string,
    @Query('dir') dir: string = '/',
    @Body() body: CreateFileRequest,
  ) {
    return this.filesService.createFile(category, ownerId, dir, body);
  }

  @Post(':category/:ownerId/folder')
  @Permissions(PERMISSIONS.files.write)
  createFolder(
    @Param('category') category: DriveCategory,
    @Param('ownerId') ownerId: string,
    @Query('dir') dir: string = '/',
    @Body() body: CreateFolderRequest,
  ) {
    return this.filesService.createFolder(category, ownerId, dir, body);
  }

  @Patch(':category/:ownerId/rename')
  @Permissions(PERMISSIONS.files.write)
  renameItem(
    @Param('category') category: DriveCategory,
    @Param('ownerId') ownerId: string,
    @Query('path') path: string,
    @Body() body: RenameRequest,
  ) {
    return this.filesService.renameItem(category, ownerId, path, body);
  }

  @Patch(':category/:ownerId/content')
  @Permissions(PERMISSIONS.files.write)
  updateContent(
    @Param('category') category: DriveCategory,
    @Param('ownerId') ownerId: string,
    @Query('path') path: string,
    @Body() body: UpdateFileRequest,
    @Req() req: any,
  ) {
    // Only JWT-authenticated admin users can edit system files (not API key holders)
    const isAdmin = req.authMethod === 'jwt' && req.user?.role === 'admin';
    return this.filesService.updateFileContent(category, ownerId, path, body, { isAdmin });
  }

  @Delete(':category/:ownerId/item')
  @Permissions(PERMISSIONS.files.write)
  deleteItem(
    @Param('category') category: DriveCategory,
    @Param('ownerId') ownerId: string,
    @Query('path') path: string,
  ) {
    return this.filesService.deleteItem(category, ownerId, path);
  }
}
