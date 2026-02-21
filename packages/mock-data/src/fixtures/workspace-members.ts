import { WorkspaceMember, WorkspaceRole } from '@monokeros/types';

export const workspaceMembers: WorkspaceMember[] = [
  {
    id: 'wm_01',
    workspaceId: 'ws_01',
    memberId: 'human_01',
    role: WorkspaceRole.ADMIN,
    joinedAt: '2025-10-01T00:00:00Z',
  },
  {
    id: 'wm_02',
    workspaceId: 'ws_01',
    memberId: 'human_02',
    role: WorkspaceRole.ADMIN,
    joinedAt: '2025-10-01T00:00:00Z',
  },
  {
    id: 'wm_03',
    workspaceId: 'ws_01',
    memberId: 'human_03',
    role: WorkspaceRole.ADMIN,
    joinedAt: '2025-10-01T00:00:00Z',
  },
];
