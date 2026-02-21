import { Module } from '@nestjs/common';
import { DocsController } from './docs.controller';
import { DocsService } from './docs.service';
import { RenderModule } from '../render/render.module';

@Module({
  imports: [RenderModule],
  controllers: [DocsController],
  providers: [DocsService],
})
export class DocsModule {}
