import { Controller, Get, Param, Query } from '@nestjs/common';
import { ModelCatalogService } from './model-catalog.service';
import { AiProvider } from '@monokeros/types';
import { AI_PROVIDERS } from '@monokeros/constants';
import { Public } from '../auth/public.decorator';

@Public()
@Controller('models')
export class ModelsController {
  constructor(private catalog: ModelCatalogService) {}

  /** GET /api/models — full catalog (cached 1 day) */
  @Get()
  async list(@Query('refresh') refresh?: string) {
    return this.catalog.getCatalog(refresh === 'true');
  }

  /** GET /api/models/providers — provider registry with OpenRouter slug mapping */
  @Get('providers')
  providers() {
    return Object.values(AI_PROVIDERS).map((p) => ({
      provider: p.provider,
      displayName: p.displayName,
      baseUrl: p.baseUrl,
      requiresApiKey: p.requiresApiKey,
      supportsToolCalling: p.supportsToolCalling,
      defaultModel: p.defaultModel,
      openRouterSlug: p.openRouterSlug,
    }));
  }

  /** GET /api/models/:provider — models for a specific AiProvider */
  @Get(':provider')
  async forProvider(
    @Param('provider') provider: string,
    @Query('refresh') refresh?: string,
  ) {
    const aiProvider = Object.values(AiProvider).find((v) => v === provider);
    if (!aiProvider) {
      return { error: `Unknown provider: ${provider}`, models: [] };
    }
    const models = await this.catalog.getModelsForProvider(aiProvider, refresh === 'true');
    return { provider: aiProvider, models };
  }
}
