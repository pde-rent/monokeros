import { Module } from '@nestjs/common';
import { WorkspacesController, WorkspaceConfigController } from './workspace.controller';
import { SystemAgentsService } from './system-agents.service';
import { FilesModule } from '../files/files.module';
import { AuthModule } from '../auth/auth.module';
import { TelegramModule } from '../telegram/telegram.module';
import { OpenClawModule } from '../openclaw/openclaw.module';

@Module({
  imports: [FilesModule, AuthModule, TelegramModule, OpenClawModule],
  controllers: [WorkspacesController, WorkspaceConfigController],
  providers: [SystemAgentsService],
  exports: [SystemAgentsService],
})
export class WorkspaceModule {}
