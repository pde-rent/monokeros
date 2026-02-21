'use client';

import { useState, useRef } from 'react';
import { PlusIcon } from '@phosphor-icons/react';
import { Button, ListRowButton, useClickOutside } from '@monokeros/ui';
import { useFabConfig } from './fab-context';

export function Fab() {
  const config = useFabConfig();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useClickOutside(ref, () => setOpen(false), open);

  if (!config) return null;

  const { actions, tooltip } = config;
  const isSingle = actions.length === 1;

  function handleClick() {
    if (isSingle) {
      actions[0].onClick();
    } else {
      setOpen((o) => !o);
    }
  }

  return (
    <div ref={ref} className="absolute bottom-4 right-4 z-20">
      {/* Popover menu */}
      {open && !isSingle && (
        <div className="absolute bottom-full right-0 mb-1.5 min-w-[160px] border border-edge bg-elevated py-0.5 shadow-lg rounded-md">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <ListRowButton
                key={action.id}
                onClick={() => { action.onClick(); setOpen(false); }}
                className="items-center text-xs rounded-sm"
              >
                <Icon size={14} />
                {action.label}
              </ListRowButton>
            );
          })}
        </div>
      )}

      {/* FAB button */}
      <Button
        onClick={handleClick}
        title={tooltip}
        className="h-9 w-9 !p-0 shadow-lg"
      >
        <PlusIcon size={18} weight="bold" />
      </Button>
    </div>
  );
}
