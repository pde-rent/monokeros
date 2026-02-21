import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { AttachmentsService } from './attachments.service';
import { OpenClawModule } from '../openclaw/openclaw.module';
import { RenderModule } from '../render/render.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MembersGateway } from '../members/members.gateway';

@Module({
  imports: [OpenClawModule, RenderModule, NotificationsModule],
  controllers: [ChatController],
  providers: [ChatGateway, AttachmentsService, MembersGateway],
  exports: [ChatGateway],
})
export class ChatModule {}
