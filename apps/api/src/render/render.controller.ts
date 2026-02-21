import { Controller, Post, Body } from '@nestjs/common';
import { RenderService } from './render.service';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { z } from 'zod';
import type { RenderResult } from '@monokeros/renderer';

const renderMarkdownSchema = z.object({
  content: z.string().max(500_000),
});

const renderFileSchema = z.object({
  content: z.string().max(500_000),
  fileName: z.string().min(1).max(255),
});

@Controller('workspaces/:slug/render')
export class RenderController {
  constructor(private renderService: RenderService) {}

  @Post('markdown')
  async renderMarkdown(
    @Body(new ZodValidationPipe(renderMarkdownSchema)) body: { content: string },
  ): Promise<RenderResult> {
    return this.renderService.renderMarkdown(body.content);
  }

  @Post('file')
  async renderFile(
    @Body(new ZodValidationPipe(renderFileSchema)) body: { content: string; fileName: string },
  ): Promise<{ html: string }> {
    return { html: await this.renderService.renderFile(body.content, body.fileName) };
  }
}
