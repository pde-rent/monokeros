"use client";

import { useState, useMemo } from "react";
import { useMembers, useTeams } from "@/hooks/use-queries";
import { StatusBadge, TableHeader, DropdownSelect } from "@monokeros/ui";

const TYPE_COLORS: Record<string, string> = {
  agent: "var(--color-purple)",
  human: "var(--color-orange)",
};

export function RolesView() {
  const { data: members } = useMembers();
  const { data: teams } = useTeams();
  const [typeFilter, setTypeFilter] = useState<string>("");

  const filtered = useMemo(() => {
    if (!members) return [];
    if (!typeFilter) return members;
    return members.filter((m) => m.type === typeFilter);
  }, [members, typeFilter]);

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-3 border-b border-edge px-4 py-2">
        <span className="text-sm font-semibold text-fg">Workspace Members</span>
        <DropdownSelect
          value={typeFilter}
          onChange={setTypeFilter}
          options={[
            { value: "", label: "All types" },
            { value: "agent", label: "Agent" },
            { value: "human", label: "Human" },
          ]}
          size="compact"
          className="w-32"
        />
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-surface-2">
            <tr className="border-b border-edge">
              <TableHeader>Member</TableHeader>
              <TableHeader>Email</TableHeader>
              <TableHeader>Type</TableHeader>
              <TableHeader>Supervised Teams</TableHeader>
              <TableHeader>Title</TableHeader>
            </tr>
          </thead>
          <tbody>
            {filtered.map((member) => {
              const supervisedTeams =
                teams?.filter((t) => member.supervisedTeamIds?.includes(t.id)) ?? [];

              return (
                <tr key={member.id} className="row-hover">
                  <td className="px-3 py-2">
                    <span className="text-xs font-medium text-fg">{member.name}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-xs text-fg-2">{member.email ?? "-"}</span>
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge
                      label={member.type}
                      color={TYPE_COLORS[member.type] ?? "var(--color-idle)"}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      {supervisedTeams.map((team) => (
                        <StatusBadge key={team.id} label={team.name} color={team.color} />
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-[10px] text-fg-3">{member.title}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
