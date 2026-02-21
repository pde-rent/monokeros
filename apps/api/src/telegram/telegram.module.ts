import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { TelegramController } from './telegram.controller';
import { ZeroClawModule } from '../zeroclaw/zeroclaw.module';
import { ChatModule } from '../chat/chat.module';
import { RenderModule } from '../render/render.module';

@Module({
  imports: [ZeroClawModule, ChatModule, RenderModule],
  controllers: [TelegramController],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
