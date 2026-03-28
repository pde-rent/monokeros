import React from "react";

interface AvatarStackMember {
  id: string;
  name: string;
  color?: string;
}

interface AvatarStackProps {
  members: AvatarStackMember[];
  max?: number;
}

export function AvatarStack({ members, max = 3 }: AvatarStackProps) {
  return (
    <div className="flex -space-x-1">
      {members.slice(0, max).map((m) => (
        <div
          key={m.id}
          className="flex h-5 w-5 items-center justify-center rounded-sm border border-surface text-[9px] font-bold text-fg-inverse"
          style={{ backgroundColor: m.color }}
          title={m.name}
        >
          {m.name[0]}
        </div>
      ))}
      {members.length > max && (
        <span className="flex h-5 w-5 items-center justify-center text-[9px] text-fg-2">
          +{members.length - max}
        </span>
      )}
    </div>
  );
}
