import { Controller, Get, Post, Param, Body, Query, Req, NotFoundException } from '@nestjs/common';
import { TemplatesService } from './templates.service';

@Controller('templates')
export class TemplatesController {
  constructor(private templatesService: TemplatesService) {}

  @Get()
  list(@Query('category') category?: string) {
    return this.templatesService.listTemplates(category);
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    const tpl = this.templatesService.getTemplate(id);
    if (!tpl) throw new NotFoundException(`Template "${id}" not found`);
    return tpl;
  }

  @Post(':id/apply')
  apply(
    @Param('id') id: string,
    @Body() body: {
      slug: string;
      displayName: string;
      branding?: { color: string; logo?: string };
      description?: string;
      includeAgents?: string[];
      includeTeams?: string[];
    },
    @Req() req: { user: { sub: string } },
  ) {
    return this.templatesService.applyTemplate(id, body, req.user.sub);
  }
}
