import { Injectable, Logger } from '@nestjs/common';
import type { CatalogModel, ModelCatalog } from '@monokeros/types';
import { AI_PROVIDERS } from '@monokeros/constants';
import { AiProvider } from '@monokeros/types';

const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 1 day
const FETCH_TIMEOUT_MS = 15_000;

/** Reverse map: OpenRouter slug → AiProvider */
const SLUG_TO_PROVIDER = new Map<string, AiProvider>();
for (const info of Object.values(AI_PROVIDERS)) {
  if (info.openRouterSlug) {
    SLUG_TO_PROVIDER.set(info.openRouterSlug, info.provider);
  }
}

interface OpenRouterModel {
  id: string;
  name: string;
  context_length: number;
  architecture?: { input_modalities?: string[] };
  top_provider?: { max_completion_tokens?: number };
  supported_parameters?: string[];
  pricing?: { prompt?: string; completion?: string };
}

@Injectable()
export class ModelCatalogService {
  private readonly log = new Logger(ModelCatalogService.name);
  private cache: ModelCatalog | null = null;
  private fetchPromise: Promise<ModelCatalog> | null = null;

  /** Get the cached catalog, fetching if stale or missing */
  async getCatalog(forceRefresh = false): Promise<ModelCatalog> {
    if (!forceRefresh && this.cache && !this.isStale(this.cache)) {
      return this.cache;
    }

    // Deduplicate concurrent fetches
    if (!this.fetchPromise) {
      this.fetchPromise = this.fetchCatalog().finally(() => {
        this.fetchPromise = null;
      });
    }
    return this.fetchPromise;
  }

  /** Get models filtered by AiProvider (mapped via openRouterSlug) */
  async getModelsForProvider(provider: AiProvider, forceRefresh = false): Promise<CatalogModel[]> {
    const info = AI_PROVIDERS[provider];
    if (!info.openRouterSlug) {
      return [];
    }
    const catalog = await this.getCatalog(forceRefresh);
    return catalog.models.filter((m) => m.providerSlug === info.openRouterSlug);
  }

  /** Resolve an AiProvider from an OpenRouter provider slug */
  resolveProvider(slug: string): AiProvider | null {
    return SLUG_TO_PROVIDER.get(slug) ?? null;
  }

  private isStale(catalog: ModelCatalog): boolean {
    const age = Date.now() - new Date(catalog.fetchedAt).getTime();
    return age > CACHE_TTL_MS;
  }

  private async fetchCatalog(): Promise<ModelCatalog> {
    this.log.log('Fetching model catalog from OpenRouter...');
    try {
      const res = await fetch(OPENROUTER_MODELS_URL, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) {
        throw new Error(`OpenRouter API ${res.status}: ${await res.text()}`);
      }

      const data = (await res.json()) as { data: OpenRouterModel[] };
      const models = this.transform(data.data);
      const providerSlugs = [...new Set(models.map((m) => m.providerSlug))].sort();

      const catalog: ModelCatalog = {
        models,
        providerSlugs,
        fetchedAt: new Date().toISOString(),
      };

      this.cache = catalog;
      this.log.log(`Cached ${models.length} models from ${providerSlugs.length} providers`);
      return catalog;
    } catch (err) {
      this.log.warn(`Failed to fetch catalog: ${err}`);
      if (this.cache) {
        this.log.warn('Using stale cache');
        return this.cache;
      }
      return { models: [], providerSlugs: [], fetchedAt: new Date().toISOString() };
    }
  }

  private transform(raw: OpenRouterModel[]): CatalogModel[] {
    return raw.map((m) => {
      const slashIdx = m.id.indexOf('/');
      const providerSlug = slashIdx > 0 ? m.id.slice(0, slashIdx) : m.id;
      const modalities = m.architecture?.input_modalities ?? [];
      const params = m.supported_parameters ?? [];

      return {
        id: m.id,
        name: m.name,
        providerSlug,
        contextLength: m.context_length,
        maxCompletionTokens: m.top_provider?.max_completion_tokens ?? 4096,
        supportsVision: modalities.includes('image'),
        supportsAudio: modalities.includes('audio'),
        supportsTools: params.includes('tools'),
        pricing: {
          prompt: m.pricing?.prompt ?? '0',
          completion: m.pricing?.completion ?? '0',
        },
      };
    });
  }
}
