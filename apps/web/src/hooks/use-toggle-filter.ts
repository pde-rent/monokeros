import { useCallback } from 'react';

export function useToggleFilter(
  current: string[],
  onChange: (next: string[]) => void,
) {
  const toggle = useCallback(
    (value: string) => {
      if (current.includes(value)) {
        onChange(current.filter((v) => v !== value));
      } else {
        onChange([...current, value]);
      }
    },
    [current, onChange],
  );

  return toggle;
}
