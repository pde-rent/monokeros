import { Controller, Get, Query, BadRequestException, ForbiddenException, Req } from '@nestjs/common';
import { KnowledgeService } from './knowledge.service';
import { PERMISSIONS } from '@monokeros/constants';
import { Permissions } from '../auth/permissions.decorator';

@Controller('workspaces/:slug/knowledge')
export class KnowledgeController {
  constructor(private knowledgeService: KnowledgeService) {}

  @Get('search')
  @Permissions(PERMISSIONS.files.read)
  async search(
    @Query('query') query: string,
    @Query('memberId') memberId: string,
    @Query('scopes') scopes?: string,
    @Query('maxResults') maxResults?: string,
    @Req() req?: any,
  ) {
    if (!query?.trim()) {
      throw new BadRequestException('query parameter is required');
    }
    if (!memberId?.trim()) {
      throw new BadRequestException('memberId parameter is required');
    }

    // Verify the caller is authorized to search as this member:
    // - API key must belong to the requested memberId, OR
    // - JWT admin users can search as any member, OR
    // - Wildcard API key holders (system agents) can search as themselves
    if (req?.authMethod === 'apikey') {
      const apiKey = req.apiKey;
      if (apiKey?.memberId !== memberId && !apiKey?.permissions.includes('*')) {
        throw new ForbiddenException('Cannot search knowledge as another member');
      }
    }

    const filterScopes = scopes ? scopes.split(',') : undefined;
    const limit = maxResults ? parseInt(maxResults, 10) : undefined;

    return this.knowledgeService.search(query, memberId, filterScopes, limit);
  }
}
