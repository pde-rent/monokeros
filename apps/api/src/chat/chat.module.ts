import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { AttachmentsService } from './attachments.service';
import { ZeroClawModule } from '../zeroclaw/zeroclaw.module';
import { RenderModule } from '../render/render.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MembersGateway } from '../members/members.gateway';

@Module({
  imports: [ZeroClawModule, RenderModule, NotificationsModule],
  controllers: [ChatController],
  providers: [ChatGateway, AttachmentsService, MembersGateway],
  exports: [ChatGateway],
})
export class ChatModule {}
