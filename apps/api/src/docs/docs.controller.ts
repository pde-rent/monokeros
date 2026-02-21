import { Controller, Get, Query } from '@nestjs/common';
import { DocsService, NavManifest } from './docs.service';
import { Public } from '../auth/public.decorator';

@Public()
@Controller('docs')
export class DocsController {
  constructor(private docsService: DocsService) {}

  @Get('nav')
  getNav(): Promise<NavManifest> {
    return this.docsService.getNav();
  }

  @Get('page')
  getPage(@Query('path') path: string) {
    if (!path) return { html: '', hasMermaid: false, hasMath: false, title: '' };
    return this.docsService.getPage(path);
  }
}
