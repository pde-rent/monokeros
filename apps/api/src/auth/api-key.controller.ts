import { Controller, Post, Get, Delete, Body, Param, Req } from '@nestjs/common';
import { ApiKeyService } from './api-key.service';
import { PERMISSIONS } from '@monokeros/constants';
import { Permissions } from './permissions.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { createApiKeySchema } from '@monokeros/types';
import type { CreateApiKeyInput } from '@monokeros/types';
import type { JwtPayload } from './auth.service';

@Controller('workspaces/:slug/api-keys')
export class ApiKeyController {
  constructor(private apiKeyService: ApiKeyService) {}

  @Post()
  @Permissions(PERMISSIONS.workspace.admin)
  async create(
    @Body(new ZodValidationPipe(createApiKeySchema)) body: CreateApiKeyInput,
    @Req() req: { user: JwtPayload },
  ) {
    const { apiKey, rawKey } = await this.apiKeyService.create(body, req.user.workspaceId);
    const { key: _, ...safe } = apiKey;
    return { ...safe, rawKey };
  }

  @Get()
  list(@Req() req: { user: JwtPayload }) {
    return this.apiKeyService.listByMember(req.user.sub);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.workspace.admin)
  revoke(@Param('id') id: string) {
    const success = this.apiKeyService.revoke(id);
    return { success };
  }
}
