export const WS_EVENTS = {
  member: {
    statusChanged: 'member:status-changed',
    created: 'member:created',
    updated: 'member:updated',
  },
  task: {
    created: 'task:created',
    updated: 'task:updated',
    moved: 'task:moved',
  },
  chat: {
    message: 'chat:message',
    streamStart: 'chat:stream-start',
    streamChunk: 'chat:stream-chunk',
    streamEnd: 'chat:stream-end',
    typing: 'chat:typing',
    thinkingStatus: 'chat:thinking-status',
    toolStart: 'chat:tool-start',
    toolEnd: 'chat:tool-end',
  },
  project: {
    gateUpdated: 'project:gate-updated',
  },
  notification: {
    created: 'notification:created',
    read: 'notification:read',
    readAll: 'notification:read-all',
  },
} as const;
