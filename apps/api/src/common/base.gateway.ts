import { WebSocketServer } from '@nestjs/websockets';
import type { BunWsServer } from '../platform';
import { WS_OPEN } from '@monokeros/constants';

export abstract class BaseGateway {
  @WebSocketServer()
  server!: BunWsServer;

  protected emit(event: string, data: Record<string, any>) {
    const payload = JSON.stringify({ event, data });
    for (const client of this.server.clients) {
      if (client.readyState === WS_OPEN) {
        client.send(payload);
      }
    }
  }

  /**
   * Broadcast an event. Subclasses can override for room-scoped delivery
   * (see ConsoleGateway). Default broadcasts to all connected clients.
   */
  protected emitTo(_room: string, event: string, data: Record<string, any>) {
    this.emit(event, data);
  }
}
