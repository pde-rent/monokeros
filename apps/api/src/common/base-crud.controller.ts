import { Get, Param, Req } from '@nestjs/common';
import { MockStore } from '../store/mock-store';
import { findOrThrow } from './find-or-throw';

/**
 * Base controller providing standard list() and detail() endpoints
 * for entities stored in MockStore maps.
 *
 * All entities are filtered by the workspace resolved from the request.
 * Subclasses must call super() with the store map key and entity label.
 */
export abstract class BaseCrudController<T> {
  constructor(
    protected readonly store: MockStore,
    private readonly mapKey: keyof MockStore,
    private readonly entityName: string,
  ) {}

  /** Look up an entity by ID or throw 404. */
  protected find(id: string): T {
    return findOrThrow(this.store[this.mapKey] as Map<string, T>, id, this.entityName);
  }

  /** Return all entities from the map, filtered by workspace when available. */
  protected getAll(workspaceId?: string): T[] {
    const all = Array.from((this.store[this.mapKey] as Map<string, T>).values());
    if (workspaceId) return all.filter((item: any) => item.workspaceId === workspaceId);
    return all;
  }

  @Get()
  list(@Req() req?: any): T[] {
    return this.getAll(req?.workspace?.id);
  }

  @Get(':id')
  detail(@Param('id') id: string): T {
    return this.find(id);
  }
}
