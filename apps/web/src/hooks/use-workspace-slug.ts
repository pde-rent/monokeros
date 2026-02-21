'use client';

import { useParams } from 'next/navigation';

export function useWorkspaceSlug(): string {
  const { workspace } = useParams<{ workspace: string }>();
  return workspace;
}
