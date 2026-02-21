import { WebSocketGateway } from '@nestjs/websockets';
import { WS_EVENTS } from '@monokeros/types';
import type { Notification } from '@monokeros/types';
import { BaseGateway } from '../common/base.gateway';

@WebSocketGateway()
export class NotificationsGateway extends BaseGateway {
  emitNotificationCreated(notification: Notification) {
    this.emit(WS_EVENTS.notification.created, { notification });
  }

  emitNotificationRead(notificationId: string) {
    this.emit(WS_EVENTS.notification.read, { notificationId });
  }

  emitNotificationReadAll(recipientId: string) {
    this.emit(WS_EVENTS.notification.readAll, { recipientId });
  }
}
