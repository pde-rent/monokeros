import { useMemo } from 'react';
import type { Task } from '@monokeros/types';

export function useTaskFiltering(
  tasks: Task[] | undefined,
  statusFilter: string[],
  search: string,
) {
  return useMemo(() => {
    let result = tasks ?? [];
    if (statusFilter.length > 0) {
      result = result.filter((t) => statusFilter.includes(t.status));
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((t) => t.title.toLowerCase().includes(q));
    }
    return result;
  }, [tasks, statusFilter, search]);
}
