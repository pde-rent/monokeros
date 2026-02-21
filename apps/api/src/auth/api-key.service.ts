import { Injectable } from '@nestjs/common';
import { MockStore } from '../store/mock-store';
import type { ApiKey, Permission, CreateApiKeyInput } from '@monokeros/types';
import { generateId, now } from '@monokeros/utils';

@Injectable()
export class ApiKeyService {
  constructor(private store: MockStore) {}

  generateRawKey(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(20));
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `mk_${hex}`;
  }

  async hashKey(rawKey: string): Promise<string> {
    const data = new TextEncoder().encode(rawKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer), (b) => b.toString(16).padStart(2, '0')).join('');
  }

  async create(input: CreateApiKeyInput, workspaceId: string): Promise<{ apiKey: ApiKey; rawKey: string }> {
    const rawKey = this.generateRawKey();
    const hash = await this.hashKey(rawKey);

    const apiKey: ApiKey = {
      id: generateId('apikey'),
      key: hash,
      prefix: rawKey.slice(0, 11) + '...',
      memberId: input.memberId,
      workspaceId,
      name: input.name,
      permissions: input.permissions as Permission[],
      createdAt: now(),
      lastUsedAt: null,
      expiresAt: input.expiresAt ?? null,
      revoked: false,
    };

    this.store.apiKeys.set(apiKey.id, apiKey);
    return { apiKey, rawKey };
  }

  async verify(rawKey: string): Promise<ApiKey | null> {
    // Dev mode: mk_dev_ keys are stored as raw values
    if (rawKey.startsWith('mk_dev_')) {
      const apiKey = this.store.getApiKeyByHash(rawKey);
      if (!apiKey) return null;
      if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) return null;
      apiKey.lastUsedAt = now();
      return apiKey;
    }

    // Production: hash and lookup
    const hash = await this.hashKey(rawKey);
    const apiKey = this.store.getApiKeyByHash(hash);
    if (!apiKey) return null;
    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) return null;
    apiKey.lastUsedAt = now();
    return apiKey;
  }

  revoke(id: string): boolean {
    const key = this.store.apiKeys.get(id);
    if (!key) return false;
    key.revoked = true;
    return true;
  }

  listByMember(memberId: string): Omit<ApiKey, 'key'>[] {
    return this.store.getApiKeysByMember(memberId).map(({ key: _, ...rest }) => rest);
  }
}
