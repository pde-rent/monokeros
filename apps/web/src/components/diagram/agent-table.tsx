'use client';

import { useMemo } from 'react';
import type { Member } from '@monokeros/types';
import { CrownIcon } from '@phosphor-icons/react';
import { StatusIndicator, SortHeader, TableHeader, Avatar, EmptyState } from '@monokeros/ui';
import { MEMBER_STATUS_ORDER, getTeamColor } from '@monokeros/constants';
import { useTeams, useTasks } from '@/hooks/use-queries';
import { useUIStore } from '@/stores/ui-store';
import { useSort } from '@/hooks/use-sort';

type SortKey = 'name' | 'title' | 'status' | 'team' | 'specialization';

interface Props {
  members: Member[];
  search: string;
}

export function AgentTable({ members, search }: Props) {
  const { sortKey, sortDir, handleSort } = useSort<SortKey>('name');
  const { data: teams } = useTeams();
  const { data: tasks } = useTasks();
  const { openDetailPanel } = useUIStore();

  const filtered = useMemo(() => {
    if (!search) return members;
    const q = search.toLowerCase();
    return members.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.title.toLowerCase().includes(q) ||
        a.specialization.toLowerCase().includes(q),
    );
  }, [members, search]);

  const sorted = useMemo(() => {
    const items = [...filtered];
    const dir = sortDir === 'asc' ? 1 : -1;
    items.sort((a, b) => {
      switch (sortKey) {
        case 'name':
          return a.name.localeCompare(b.name) * dir;
        case 'title':
          return a.title.localeCompare(b.title) * dir;
        case 'status':
          return ((MEMBER_STATUS_ORDER[a.status] ?? 4) - (MEMBER_STATUS_ORDER[b.status] ?? 4)) * dir;
        case 'team': {
          const aTeam = teams?.find((t) => t.id === a.teamId)?.name ?? '';
          const bTeam = teams?.find((t) => t.id === b.teamId)?.name ?? '';
          return aTeam.localeCompare(bTeam) * dir;
        }
        case 'specialization':
          return a.specialization.localeCompare(b.specialization) * dir;
        default:
          return 0;
      }
    });
    return items;
  }, [filtered, sortKey, sortDir, teams]);

  if (members.length === 0) {
    return (
      <EmptyState>No agents to display</EmptyState>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full">
        <thead className="sticky top-0 bg-surface-2">
          <tr className="border-b border-edge">
            <SortHeader label="Name" column="name" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
            <SortHeader label="Title" column="title" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
            <SortHeader label="Status" column="status" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
            <SortHeader label="Team" column="team" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
            <SortHeader label="Specialization" column="specialization" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
            <TableHeader>Current Task</TableHeader>
            <TableHeader>Stats</TableHeader>
          </tr>
        </thead>
        <tbody>
          {sorted.map((member) => {
            const team = teams?.find((t) => t.id === member.teamId);
            const currentTask = tasks?.find((t) => t.id === member.currentTaskId);
            const searchLower = search.toLowerCase();
            const isMatch = !searchLower ||
              member.name.toLowerCase().includes(searchLower) ||
              member.title.toLowerCase().includes(searchLower) ||
              member.specialization.toLowerCase().includes(searchLower);

            return (
              <tr
                key={member.id}
                onClick={() => openDetailPanel('agent', member.id)}
                className="row-hover cursor-pointer"
                style={{ opacity: search && !isMatch ? 0.3 : 1 }}
              >
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <Avatar name={member.name} src={member.avatarUrl} color={getTeamColor(team)} size="sm" />
                    <span className="text-xs font-medium text-fg">
                      {member.name}
                    </span>
                    {member.isLead && (
                      <CrownIcon size={12} weight="fill" className="text-yellow" />
                    )}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <span className="text-xs text-fg-2">{member.title}</span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <StatusIndicator status={member.status} size="sm" />
                    <span className="text-xs capitalize text-fg-2">
                      {member.status}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2">
                  {team && (
                    <span className="text-xs" style={{ color: team.color }}>
                      {team.name}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <span className="text-xs text-fg-2">
                    {member.specialization}
                  </span>
                </td>
                <td className="px-3 py-2">
                  {currentTask ? (
                    <span className="text-xs text-fg">
                      {currentTask.title}
                    </span>
                  ) : (
                    <span className="text-[10px] text-fg-3">None</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-2 text-[10px] text-fg-2">
                    <span>{member.stats.tasksCompleted} done</span>
                    <span>{member.stats.avgAgreementScore}%</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
