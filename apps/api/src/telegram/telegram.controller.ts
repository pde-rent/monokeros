import { Controller, Get, Put, Body, BadRequestException, Req } from '@nestjs/common';
import { MockStore } from '../store/mock-store';
import { TelegramService } from './telegram.service';
import { Permissions } from '../auth/permissions.decorator';
import { PERMISSIONS } from '@monokeros/constants';
import type { Workspace } from '@monokeros/types';

@Controller('workspaces/:slug/telegram')
export class TelegramController {
  constructor(
    private store: MockStore,
    private telegramService: TelegramService,
  ) {}

  @Get()
  @Permissions(PERMISSIONS.workspace.admin)
  async getStatus(@Req() req: { workspace: Workspace }) {
    return this.telegramService.getBotInfo(req.workspace.id);
  }

  @Put()
  @Permissions(PERMISSIONS.workspace.admin)
  async setToken(
    @Req() req: { workspace: Workspace },
    @Body() body: { botToken: string | null },
  ) {
    const { botToken } = body;

    // Basic token format validation (digits:alphanumeric)
    if (botToken !== null && botToken !== '') {
      if (!/^\d+:[A-Za-z0-9_-]+$/.test(botToken)) {
        throw new BadRequestException('Invalid Telegram bot token format. Expected: digits:alphanumeric');
      }
    }

    const workspace = req.workspace;
    workspace.telegramBotToken = botToken || null;

    await this.telegramService.refreshBot(workspace);

    return { enabled: !!workspace.telegramBotToken };
  }
}
