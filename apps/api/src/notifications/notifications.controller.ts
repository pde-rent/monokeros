import { Controller, Get, Patch, Param, Req, NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PERMISSIONS } from '@monokeros/constants';
import { Permissions } from '../auth/permissions.decorator';
import type { JwtPayload } from '../auth/auth.service';

@Controller('workspaces/:slug/notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  @Permissions(PERMISSIONS.members.read)
  list(@Req() req: { user: JwtPayload; workspace: { id: string } }) {
    return this.notificationsService.getForRecipient(req.user.sub, req.workspace.id);
  }

  @Get('counts')
  @Permissions(PERMISSIONS.members.read)
  counts(@Req() req: { user: JwtPayload; workspace: { id: string } }) {
    return this.notificationsService.getUnreadCounts(req.user.sub, req.workspace.id);
  }

  @Patch(':id/read')
  @Permissions(PERMISSIONS.members.read)
  markRead(@Param('id') id: string) {
    const notification = this.notificationsService.markRead(id);
    if (!notification) throw new NotFoundException('Notification not found');
    return notification;
  }

  @Patch('read-all')
  @Permissions(PERMISSIONS.members.read)
  markAllRead(@Req() req: { user: JwtPayload; workspace: { id: string } }) {
    const count = this.notificationsService.markAllRead(req.user.sub, req.workspace.id);
    return { count };
  }
}
