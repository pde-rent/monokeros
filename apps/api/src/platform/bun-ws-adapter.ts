import type { WebSocketAdapter } from '@nestjs/common';
import type { MessageMappingProperties } from '@nestjs/websockets';
import type { Observable } from 'rxjs';
import type { ServerWebSocket } from 'bun';
import type { BunHttpAdapter, BunWsConfig } from './bun-http-adapter';
import { WS_OPEN } from '@monokeros/constants';

/** Virtual WS server — injected into gateways via @WebSocketServer() */
export class BunWsServer {
  clients = new Set<ServerWebSocket<any>>();
  private connectCallbacks: Array<(client: ServerWebSocket<any>) => void> = [];

  constructor(readonly path: string) {}

  addConnectCallback(cb: (client: ServerWebSocket<any>) => void) {
    this.connectCallbacks.push(cb);
  }

  notifyConnect(client: ServerWebSocket<any>) {
    for (const cb of this.connectCallbacks) cb(client);
  }
}

export class BunWsAdapter implements WebSocketAdapter {
  private servers = new Map<string, BunWsServer>();
  private clientHandlers = new WeakMap<
    ServerWebSocket<any>,
    Array<{ handlers: MessageMappingProperties[]; transform: (data: any) => Observable<any> }>
  >();

  constructor(private httpAdapter: BunHttpAdapter) {
    const config: BunWsConfig = {
      shouldUpgrade: (_path) => this.servers.size > 0,
      handlers: {
        open: (ws) => this.onOpen(ws),
        message: (ws, data) => this.onMessage(ws, data),
        close: (ws) => this.onClose(ws),
      },
    };
    this.httpAdapter.wsConfig = config;
  }

  create(_port: number, options?: any): BunWsServer {
    const path = options?.path ?? options?.namespace ?? '/';
    let server = this.servers.get(path);
    if (!server) {
      server = new BunWsServer(path);
      this.servers.set(path, server);
    }
    return server;
  }

  bindClientConnect(server: BunWsServer, callback: Function) {
    server.addConnectCallback(callback as any);
  }

  bindClientDisconnect(client: ServerWebSocket<any>, callback: Function) {
    if (client.data) client.data.onDisconnect = callback;
  }

  bindMessageHandlers(
    client: ServerWebSocket<any>,
    handlers: MessageMappingProperties[],
    transform: (data: any) => Observable<any>,
  ) {
    let entries = this.clientHandlers.get(client);
    if (!entries) {
      entries = [];
      this.clientHandlers.set(client, entries);
    }
    entries.push({ handlers, transform });
  }

  close(server: BunWsServer) {
    for (const c of server.clients) {
      try { c.close(); } catch { /* already closed */ }
    }
    server.clients.clear();
    this.servers.delete(server.path);
  }

  // ── Bun websocket callbacks ──

  private onOpen(ws: ServerWebSocket<any>) {
    const path: string = ws.data?.path ?? '/';
    const server = this.findServer(path);
    if (!server) return;

    server.clients.add(ws);
    ws.data = { ...ws.data, serverPath: server.path };
    server.notifyConnect(ws);
  }

  private onMessage(ws: ServerWebSocket<any>, raw: string | Buffer) {
    const entries = this.clientHandlers.get(ws);
    if (!entries) return;

    try {
      const message = JSON.parse(typeof raw === 'string' ? raw : raw.toString());
      for (const info of entries) {
        const handler = info.handlers.find((h) => h.message === message.event);
        if (!handler) continue;

        const result$ = info.transform(handler.callback(message.data));
        if (result$ && typeof (result$ as any).subscribe === 'function') {
          (result$ as any).subscribe((response: any) => {
            if (response != null && ws.readyState === WS_OPEN) {
              ws.send(JSON.stringify(response));
            }
          });
        }
        break; // Found and executed the handler
      }
    } catch { /* malformed message */ }
  }

  private onClose(ws: ServerWebSocket<any>) {
    const serverPath: string | undefined = ws.data?.serverPath;
    if (serverPath) {
      this.servers.get(serverPath)?.clients.delete(ws);
    }
    ws.data?.onDisconnect?.();
  }

  private findServer(path: string): BunWsServer | null {
    if (this.servers.has(path)) return this.servers.get(path)!;
    if (this.servers.has('/')) return this.servers.get('/')!;
    for (const [sp, server] of this.servers) {
      if (path.startsWith(sp)) return server;
    }
    return null;
  }
}
