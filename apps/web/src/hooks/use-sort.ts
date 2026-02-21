import { useState, useCallback } from 'react';

export function useSort<K extends string>(
  initialKey: K,
  initialDir: 'asc' | 'desc' = 'asc',
) {
  const [sortKey, setSortKey] = useState<K>(initialKey);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(initialDir);

  const handleSort = useCallback(
    (key: K) => {
      if (sortKey === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortKey(key);
        setSortDir('asc');
      }
    },
    [sortKey],
  );

  return { sortKey, sortDir, handleSort } as const;
}
