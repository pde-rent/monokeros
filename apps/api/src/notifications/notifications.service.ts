import { Injectable } from '@nestjs/common';
import { NotificationType } from '@monokeros/types';
import type { Notification } from '@monokeros/types';
import { MockStore } from '../store/mock-store';
import { NotificationsGateway } from './notifications.gateway';
import { generateId, now } from '@monokeros/utils';

/** Maps notification types to a nav-tab category for unread counts. */
function categoryFor(type: NotificationType): 'chat' | 'files' | 'org' | 'projects' {
  switch (type) {
    case NotificationType.CHAT_MESSAGE:
      return 'chat';
    case NotificationType.FILE_MODIFIED:
      return 'files';
    case NotificationType.MEMBER_ADDED:
    case NotificationType.MEMBER_REMOVED:
      return 'org';
    default:
      return 'projects';
  }
}

@Injectable()
export class NotificationsService {
  constructor(
    private store: MockStore,
    private gateway: NotificationsGateway,
  ) {}

  create(params: {
    workspaceId: string;
    recipientId: string;
    type: NotificationType;
    title: string;
    body: string;
    entityType?: string | null;
    entityId?: string | null;
    actorId?: string | null;
  }): Notification {
    const notification: Notification = {
      id: generateId('notif'),
      workspaceId: params.workspaceId,
      recipientId: params.recipientId,
      type: params.type,
      title: params.title,
      body: params.body,
      read: false,
      entityType: params.entityType ?? null,
      entityId: params.entityId ?? null,
      actorId: params.actorId ?? null,
      createdAt: now(),
    };
    this.store.notifications.set(notification.id, notification);
    this.gateway.emitNotificationCreated(notification);
    return notification;
  }

  createForMany(
    recipientIds: string[],
    params: Omit<Parameters<NotificationsService['create']>[0], 'recipientId'>,
  ): Notification[] {
    return recipientIds.map((recipientId) =>
      this.create({ ...params, recipientId }),
    );
  }

  getForRecipient(recipientId: string, workspaceId: string): Notification[] {
    return this.store
      .filterBy(this.store.notifications, (n) => n.recipientId === recipientId && n.workspaceId === workspaceId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  getUnreadCounts(recipientId: string, workspaceId: string) {
    const unread = this.store.filterBy(
      this.store.notifications,
      (n) => n.recipientId === recipientId && n.workspaceId === workspaceId && !n.read,
    );
    const counts = { total: 0, chat: 0, files: 0, org: 0, projects: 0 };
    for (const n of unread) {
      counts.total++;
      counts[categoryFor(n.type)]++;
    }
    return counts;
  }

  markRead(id: string): Notification | null {
    const notification = this.store.notifications.get(id);
    if (!notification) return null;
    notification.read = true;
    this.gateway.emitNotificationRead(id);
    return notification;
  }

  markAllRead(recipientId: string, workspaceId: string): number {
    let count = 0;
    for (const n of this.store.notifications.values()) {
      if (n.recipientId === recipientId && n.workspaceId === workspaceId && !n.read) {
        n.read = true;
        count++;
      }
    }
    if (count > 0) this.gateway.emitNotificationReadAll(recipientId);
    return count;
  }
}
