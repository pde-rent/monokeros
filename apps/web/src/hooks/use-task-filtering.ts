import { useMemo } from "react";
import type { Task } from "@monokeros/types";
import { createTextFilter } from "@monokeros/utils";

const filterTasks = createTextFilter<Task>("title");

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
    result = filterTasks(result, search);
    return result;
  }, [tasks, statusFilter, search]);
}
