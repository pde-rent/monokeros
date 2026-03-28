import { useState, useCallback, useMemo } from "react";

export function useSort<K extends string>(initialKey: K, initialDir: "asc" | "desc" = "asc") {
  const [sortKey, setSortKey] = useState<K>(initialKey);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(initialDir);

  const handleSort = useCallback(
    (key: K) => {
      if (sortKey === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("asc");
      }
    },
    [sortKey],
  );

  /** Spread onto SortHeader: `<SortHeader label="Name" column="name" {...sortProps} />` */
  const sortProps = useMemo(
    () => ({ sortKey, sortDir, onSort: handleSort }),
    [sortKey, sortDir, handleSort],
  );

  return { sortKey, sortDir, handleSort, sortProps } as const;
}
