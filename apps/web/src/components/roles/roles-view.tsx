'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@/lib/query';
import { api } from '@/lib/api-client';
import { useTeams, useProjects } from '@/hooks/use-queries';
import { useWorkspaceSlug } from '@/hooks/use-workspace-slug';
import { StatusBadge, TableHeader, DropdownSelect } from '@monokeros/ui';
import type { WorkspaceMember, Member } from '@monokeros/types';

type MemberWithDetails = WorkspaceMember & { member: Omit<Member, 'passwordHash'> };

const ROLE_COLORS: Record<string, string> = {
  admin: 'var(--color-purple)', // Purple for admin to distinguish from DevOps red
  validator: 'var(--color-orange)',
  viewer: 'var(--color-idle)',
};

export function RolesView() {
  const slug = useWorkspaceSlug();
  const { data: members } = useQuery({
    queryKey: ['workspace-members', slug],
    queryFn: () => api.workspaceMembers.list(slug) as Promise<MemberWithDetails[]>,
    enabled: !!slug,
  });
  const { data: teams } = useTeams();
  const { data: _projects } = useProjects();
  const [roleFilter, setRoleFilter] = useState<string>('');

  const filtered = useMemo(() => {
    if (!members) return [];
    if (!roleFilter) return members;
    return members.filter((m) => m.role === roleFilter);
  }, [members, roleFilter]);

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-3 border-b border-edge px-4 py-2">
        <span className="text-sm font-semibold text-fg">Workspace Members</span>
        <DropdownSelect
          value={roleFilter}
          onChange={setRoleFilter}
          options={[
            { value: '', label: 'All roles' },
            { value: 'admin', label: 'Admin' },
            { value: 'validator', label: 'Validator' },
            { value: 'viewer', label: 'Viewer' },
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
              <TableHeader>Role</TableHeader>
              <TableHeader>Supervised Teams</TableHeader>
              <TableHeader>Joined</TableHeader>
            </tr>
          </thead>
          <tbody>
            {filtered.map((member) => {
              const supervisedTeams = teams?.filter((t) =>
                member.member?.supervisedTeamIds?.includes(t.id),
              ) ?? [];

              return (
                <tr
                  key={member.id}
                  className="row-hover"
                >
                  <td className="px-3 py-2">
                    <span className="text-xs font-medium text-fg">
                      {member.member?.name ?? member.memberId}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-xs text-fg-2">
                      {member.member?.email ?? '-'}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge
                      label={member.role}
                      color={ROLE_COLORS[member.role] ?? 'var(--color-idle)'}
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
                    <span className="text-[10px] text-fg-3">
                      {new Date(member.joinedAt).toLocaleDateString()}
                    </span>
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
