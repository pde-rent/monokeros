export const queryKeys = {
  members: {
    all: ['members'] as const,
    detail: (id: string) => ['members', id] as const,
    runtime: (id: string) => ['members', id, 'runtime'] as const,
  },
  teams: {
    all: ['teams'] as const,
    detail: (id: string) => ['teams', id] as const,
  },
  projects: {
    all: ['projects'] as const,
    list: (params?: { status?: string; type?: string; search?: string }) =>
      ['projects', params] as const,
    detail: (id: string) => ['projects', id] as const,
  },
  tasks: {
    all: ['tasks'] as const,
    list: (params?: { projectId?: string; status?: string }) =>
      ['tasks', params] as const,
    detail: (id: string) => ['tasks', id] as const,
  },
  conversations: {
    all: ['conversations'] as const,
    detail: (id: string) => ['conversations', id] as const,
  },
  files: {
    drives: ['files', 'drives'] as const,
    drive: (id: string) => ['files', 'drives', id] as const,
    memberDrive: (memberId: string) => ['files', 'members', memberId] as const,
    teamDrive: (teamId: string) => ['files', 'teams', teamId] as const,
    projectDrive: (projectId: string) => ['files', 'projects', projectId] as const,
    workspaceDrive: ['files', 'workspace'] as const,
    fileContent: (category: string, ownerId: string, path: string) =>
      ['files', 'content', category, ownerId, path] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    counts: ['notifications', 'counts'] as const,
  },
  docs: {
    nav: ['docs', 'nav'] as const,
    page: (path: string) => ['docs', 'page', path] as const,
  },
  render: {
    file: (fileName: string, contentHash: string) =>
      ['render', 'file', fileName, contentHash] as const,
  },
};
