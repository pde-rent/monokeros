import { Controller, Post, Get, Body, Req, Ip } from '@nestjs/common';
import type { Workspace } from '@monokeros/types';
import { AuthService } from './auth.service';
import { MockStore } from '../store/mock-store';
import { Public } from './public.decorator';
import { Roles } from './roles.decorator';
import { PERMISSIONS } from '@monokeros/constants';
import { Permissions } from './permissions.decorator';
import { WorkspaceRole } from '@monokeros/types';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private store: MockStore,
  ) {}

  @Public()
  @Post('login')
  async login(
    @Body() body: { email: string; password: string },
    @Ip() ip: string,
  ) {
    return this.authService.login(body.email, body.password, ip);
  }

  @Get('me')
  async me(@Req() req: { user: { sub: string; role: string } }) {
    const user = this.authService.getHuman(req.user.sub);
    const member = this.authService.getMember(req.user.sub);
    const workspaces = this.authService.getUserWorkspaces(req.user.sub);
    return { user, role: member?.role ?? req.user.role, workspaces };
  }
}

@Controller('workspaces/:slug/workspace-members')
export class WorkspaceMembersController {
  constructor(private store: MockStore) {}

  @Get()
  @Roles(WorkspaceRole.ADMIN)
  @Permissions(PERMISSIONS.workspace.admin)
  list(@Req() req: { workspace: Workspace }) {
    return Array.from(this.store.workspaceMembers.values())
      .filter((wm) => wm.workspaceId === req.workspace.id)
      .map((member) => {
        const human = this.store.members.get(member.memberId);
        const { passwordHash: _, ...safeHuman } = human ?? {} as any;
        return { ...member, member: safeHuman };
      });
  }
}
