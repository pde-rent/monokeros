import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { TelegramController } from './telegram.controller';
import { OpenClawModule } from '../openclaw/openclaw.module';
import { ChatModule } from '../chat/chat.module';
import { RenderModule } from '../render/render.module';

@Module({
  imports: [OpenClawModule, ChatModule, RenderModule],
  controllers: [TelegramController],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
