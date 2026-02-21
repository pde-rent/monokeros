import { NotFoundException } from '@nestjs/common';

export function findOrThrow<T>(map: Map<string, T>, id: string, entityName: string): T {
  const item = map.get(id);
  if (!item) throw new NotFoundException(`${entityName} not found`);
  return item;
}
