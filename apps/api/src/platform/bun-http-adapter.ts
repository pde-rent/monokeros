import { AbstractHttpAdapter } from '@nestjs/core';
import { RequestMethod, type VersioningOptions } from '@nestjs/common';
import type { VersionValue } from '@nestjs/common/interfaces';
import type { Server } from 'bun';

// ─── Route matching ─────────────────────────────────────────────────────────

interface RouteEntry {
  method: string;
  regexp: RegExp;
  keys: string[];
  handler: Function;
}

function pathToRegexp(
  rawPath: string,
  prefix: boolean,
): { regexp: RegExp; keys: string[] } {
  const keys: string[] = [];
  if (rawPath === '/' || rawPath === '' || rawPath === '(.*)') {
    return prefix
      ? { regexp: /^/, keys }
      : rawPath === '(.*)'
        ? { regexp: /^.*$/, keys }
        : { regexp: /^\/?$/, keys };
  }
  const pattern = rawPath
    .split('/')
    .filter(Boolean)
    .map((seg) => {
      if (seg.startsWith(':')) {
        const k = seg.replace('?', '');
        keys.push(k.slice(1));
        return seg.endsWith('?') ? '(?:/([^/]+))?' : '/([^/]+)';
      }
      if (seg === '*' || seg === '(.*)') {
        keys.push('0');
        return '/(.*)';
      }
      return '/' + seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('');
  return {
    regexp: new RegExp('^' + pattern + (prefix ? '(?:/|$)' : '/?$')),
    keys,
  };
}

// ─── Request / Response wrappers ────────────────────────────────────────────

export class BunRequest {
  url: string;
  originalUrl: string;
  path: string;
  method: string;
  headers: Record<string, string | undefined>;
  params: Record<string, string> = {};
  query: Record<string, string> = {};
  body: any = undefined;
  ip = '127.0.0.1';
  hostname: string;
  baseUrl = '';
  readable = true;
  socket = { remoteAddress: '127.0.0.1' };
  [k: string]: any;

  constructor(raw: Request, server?: Server<any>) {
    const u = new URL(raw.url);
    this.url = u.pathname + u.search;
    this.originalUrl = this.url;
    this.path = u.pathname;
    this.method = raw.method;
    this.hostname = u.hostname;
    this.headers = {};
    raw.headers.forEach((v, k) => (this.headers[k] = v));
    u.searchParams.forEach((v, k) => (this.query[k] = v));
    if (server && 'requestIP' in server) {
      try {
        const addr = (server as any).requestIP(raw);
        if (addr) this.ip = addr.address;
      } catch { /* ok */ }
    }
  }

  get(name: string) {
    return this.headers[name.toLowerCase()];
  }
  header(name: string) {
    return this.get(name);
  }
}

export class BunResponse {
  statusCode = 200;
  private _headers: Record<string, string> = {};
  private _sent = false;
  private _resolve!: (r: Response) => void;
  readonly promise: Promise<Response>;
  [k: string]: any;

  constructor() {
    this.promise = new Promise<Response>((r) => (this._resolve = r));
  }

  get headersSent() {
    return this._sent;
  }

  status(code: number) {
    this.statusCode = code;
    return this;
  }

  set(name: string, value: string) {
    this._headers[name.toLowerCase()] = value;
    return this;
  }
  setHeader(name: string, value: string) {
    return this.set(name, value);
  }
  getHeader(name: string) {
    return this._headers[name.toLowerCase()];
  }
  appendHeader(name: string, value: string) {
    const key = name.toLowerCase();
    const existing = this._headers[key];
    this._headers[key] = existing ? existing + ', ' + value : value;
    return this;
  }
  removeHeader(name: string) {
    delete this._headers[name.toLowerCase()];
    return this;
  }

  json(body: any) {
    if (this._sent) return this;
    this._sent = true;
    this._headers['content-type'] = 'application/json';
    this._resolve(new Response(JSON.stringify(body), { status: this.statusCode, headers: this._headers }));
    return this;
  }

  send(body?: any) {
    if (this._sent) return this;
    this._sent = true;
    let out: string | null = null;
    if (body === null || body === undefined) {
      out = null;
    } else if (typeof body === 'object') {
      this._headers['content-type'] ??= 'application/json';
      out = JSON.stringify(body);
    } else {
      this._headers['content-type'] ??= 'text/html';
      out = String(body);
    }
    this._resolve(new Response(out, { status: this.statusCode, headers: this._headers }));
    return this;
  }

  end(body?: any) {
    return this.send(body ?? null);
  }

  redirect(urlOrStatus: string | number, url?: string) {
    if (typeof urlOrStatus === 'number') {
      this.statusCode = urlOrStatus;
      this._headers['location'] = url!;
    } else {
      this.statusCode = 302;
      this._headers['location'] = urlOrStatus;
    }
    return this.end();
  }

  type(ct: string) {
    this._headers['content-type'] = ct;
    return this;
  }
}

// ─── Mini-router (Express-shaped API surface) ───────────────────────────────

class BunRouter {
  private middlewares: RouteEntry[] = [];
  private routes: RouteEntry[] = [];
  private _errorHandler: Function | null = null;
  private _notFoundHandler: Function | null = null;

  // Express-style route registration
  get(...a: any[]) { return this._route('GET', a); }
  post(...a: any[]) { return this._route('POST', a); }
  put(...a: any[]) { return this._route('PUT', a); }
  delete(...a: any[]) { return this._route('DELETE', a); }
  patch(...a: any[]) { return this._route('PATCH', a); }
  options(...a: any[]) { return this._route('OPTIONS', a); }
  head(...a: any[]) { return this._route('HEAD', a); }
  all(...a: any[]) { return this._route('ALL', a); }

  use(...args: any[]) {
    let path = '/';
    let handlers: Function[];
    if (typeof args[0] === 'string') {
      path = args[0];
      handlers = args.slice(1);
    } else {
      handlers = args;
    }
    for (const h of handlers) {
      const { regexp, keys } = pathToRegexp(path, true);
      this.middlewares.push({ method: 'ALL', regexp, keys, handler: h });
    }
    return this;
  }

  set(_k: string, _v: any) { /* no-op, Express compat */ }
  engine(_ext: string, _fn: Function) { /* no-op */ }

  setErrorHandler(h: Function) { this._errorHandler = h; }
  setNotFoundHandler(h: Function) { this._notFoundHandler = h; }

  async handle(req: BunRequest, res: BunResponse) {
    // Collect matching middleware
    const chain: Function[] = [];
    for (const mw of this.middlewares) {
      if (mw.regexp.test(req.path)) chain.push(mw.handler);
    }

    // Find matching route
    let matched = false;
    for (const rt of this.routes) {
      if (rt.method !== 'ALL' && rt.method !== req.method) continue;
      const m = rt.regexp.exec(req.path);
      if (!m) continue;
      // Extract params
      for (let i = 0; i < rt.keys.length; i++) {
        if (m[i + 1] !== undefined) req.params[rt.keys[i]] = decodeURIComponent(m[i + 1]);
      }
      chain.push(rt.handler);
      matched = true;
      break;
    }

    if (!matched && this._notFoundHandler) chain.push(this._notFoundHandler);

    // Execute middleware chain
    let idx = 0;
    const next = async (err?: any): Promise<void> => {
      if (res.headersSent) return;
      if (err) {
        if (this._errorHandler) {
          try { await this._errorHandler(err, req, res, next); } catch (e: any) {
            if (!res.headersSent) res.status(500).json({ statusCode: 500, message: e.message ?? 'Internal Server Error' });
          }
        } else if (!res.headersSent) {
          res.status(500).json({ statusCode: 500, message: err.message ?? 'Internal Server Error' });
        }
        return;
      }
      if (idx >= chain.length) {
        if (!res.headersSent) res.status(404).json({ statusCode: 404, message: 'Cannot ' + req.method + ' ' + req.path });
        return;
      }
      const handler = chain[idx++];
      try {
        const r = handler(req, res, next);
        if (r && typeof r.then === 'function') await r;
      } catch (e) {
        await next(e);
      }
    };
    await next();
  }

  private _route(method: string, args: any[]) {
    const path: string = typeof args[0] === 'string' ? args[0] : '/';
    const handlers: Function[] = args.filter((a: any) => typeof a === 'function');
    for (const handler of handlers) {
      const { regexp, keys } = pathToRegexp(path, false);
      this.routes.push({ method, regexp, keys, handler });
    }
    return this;
  }
}

// ─── WebSocket bridge types ─────────────────────────────────────────────────

export interface BunWsConfig {
  shouldUpgrade(path: string): boolean;
  handlers: {
    open(ws: any): void;
    message(ws: any, data: string | Buffer): void;
    close(ws: any): void;
  };
}

// ─── BunHttpAdapter ─────────────────────────────────────────────────────────

export class BunHttpAdapter extends AbstractHttpAdapter {
  private bunServer: Server<any> | null = null;
  private router: BunRouter;
  wsConfig: BunWsConfig | null = null;

  constructor() {
    const router = new BunRouter();
    super(router);
    this.router = router;
  }

  // ── NestJS abstract methods ───────────────────────────────────────────

  initHttpServer(_opts: any) {
    // NestJS expects httpServer to have EventEmitter-like methods (.once, .address, etc.)
    // Provide stubs until Bun.serve() replaces this in listen()
    this.httpServer = {
      once: () => {},
      removeListener: () => {},
      on: () => {},
      address: () => ({ port: 0, address: '0.0.0.0' }),
      close: (cb?: Function) => { cb?.(); },
    } as any;
  }

  getType() {
    return 'bun';
  }

  async listen(port: number | string, ...args: any[]) {
    const numPort = typeof port === 'string' ? parseInt(port, 10) : port;
    const hostname = typeof args[0] === 'string' ? args[0] : undefined;
    const callback = args.find((a: any) => typeof a === 'function');

    const wsHandlers = this.wsConfig
      ? {
          open: this.wsConfig.handlers.open,
          message: this.wsConfig.handlers.message,
          close: this.wsConfig.handlers.close,
        }
      : undefined;

    this.bunServer = Bun.serve({
      port: numPort,
      hostname,
      fetch: (req: Request, server: Server<any>) => this.handleFetch(req, server),
      ...(wsHandlers ? { websocket: wsHandlers } : {}),
    } as any);

    // Bun.Server is frozen — wrap it so NestJS can call .once()/.address()/.close()
    const srv = this.bunServer;
    const extras: Record<string, any> = {
      once: () => {},
      removeListener: () => {},
      on: () => {},
      address: () => ({ port: numPort, address: hostname ?? '0.0.0.0' }),
      close: (cb?: Function) => { srv?.stop(); cb?.(); },
    };
    this.httpServer = new Proxy(srv, {
      get(target, prop) {
        if (prop in extras) return extras[prop as string];
        return (target as any)[prop];
      },
    }) as any;
    callback?.();
  }

  async close() {
    this.bunServer?.stop();
    this.bunServer = null;
  }

  reply(response: BunResponse, body: any, statusCode?: number) {
    if (statusCode) response.status(statusCode);
    if (body === null || body === undefined) return response.send();
    return typeof body === 'object' ? response.json(body) : response.send(String(body));
  }

  status(response: BunResponse, statusCode: number) {
    return response.status(statusCode);
  }

  end(response: BunResponse, message?: string) {
    return response.end(message);
  }

  render(_response: any, _view: string, _options: any) {
    throw new Error('View rendering not supported');
  }

  redirect(response: BunResponse, statusCode: number, url: string) {
    return response.redirect(statusCode, url);
  }

  setErrorHandler(handler: Function) {
    this.router.setErrorHandler(handler);
  }

  setNotFoundHandler(handler: Function) {
    this.router.setNotFoundHandler(handler);
  }

  isHeadersSent(response: BunResponse) {
    return response.headersSent;
  }

  getHeader(response: BunResponse, name: string) {
    return response.getHeader(name);
  }

  setHeader(response: BunResponse, name: string, value: string) {
    return response.set(name, value);
  }

  appendHeader(response: BunResponse, name: string, value: string) {
    return response.appendHeader(name, value);
  }

  getRequestHostname(request: BunRequest) {
    return request.hostname;
  }

  getRequestMethod(request: BunRequest) {
    return request.method;
  }

  getRequestUrl(request: BunRequest) {
    return request.originalUrl;
  }

  registerParserMiddleware() {
    // Body parsing is native — handled in handleFetch before routing
  }

  enableCors(options: any) {
    const origin = options?.origin ?? '*';
    const credentials = options?.credentials ?? false;

    this.router.use((req: BunRequest, res: BunResponse, next: Function) => {
      const reqOrigin = req.get('origin') ?? '';
      let allow: string;
      if (origin === true || origin === '*') {
        allow = credentials ? reqOrigin : '*';
      } else if (typeof origin === 'string') {
        allow = origin;
      } else if (Array.isArray(origin)) {
        allow = (origin as string[]).includes(reqOrigin) ? reqOrigin : '';
      } else {
        allow = reqOrigin;
      }
      res.set('access-control-allow-origin', allow);
      if (credentials) res.set('access-control-allow-credentials', 'true');

      if (req.method === 'OPTIONS') {
        res.set('access-control-allow-methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
        res.set('access-control-allow-headers', req.get('access-control-request-headers') ?? 'Content-Type,Authorization');
        res.set('access-control-max-age', '86400');
        res.status(204).end();
        return;
      }
      next();
    });
  }

  createMiddlewareFactory(_requestMethod: RequestMethod) {
    return (path: string, callback: Function) => {
      this.router.use(path, callback);
    };
  }

  useStaticAssets() { /* not needed */ }
  setBaseViewsDir() { /* not needed */ }
  setViewEngine() { /* not needed */ }

  applyVersionFilter(handler: Function, _version: VersionValue, _versioningOptions: VersioningOptions): (req: any, res: any, next: () => void) => Function {
    return handler as any;
  }

  // ── Fetch handler ─────────────────────────────────────────────────────

  private async handleFetch(raw: Request, server: Server<any>): Promise<Response | undefined> {
    // WebSocket upgrade
    if (this.wsConfig && raw.headers.get('upgrade')?.toLowerCase() === 'websocket') {
      const url = new URL(raw.url);
      if (this.wsConfig.shouldUpgrade(url.pathname)) {
        const ok = (server as any).upgrade(raw, { data: { path: url.pathname } });
        if (ok) return undefined;
      }
    }

    const req = new BunRequest(raw, server);
    const res = new BunResponse();

    // Native body parsing
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(raw.method)) {
      const ct = raw.headers.get('content-type') ?? '';
      try {
        if (ct.includes('application/json')) {
          req.body = await raw.json();
        } else if (ct.includes('application/x-www-form-urlencoded')) {
          req.body = Object.fromEntries(new URLSearchParams(await raw.text()));
        } else if (ct.includes('multipart/form-data')) {
          req.body = await raw.formData();
        } else {
          const text = await raw.text();
          if (text) req.body = text;
        }
      } catch { /* leave body undefined */ }
    }

    await this.router.handle(req, res);
    return res.promise;
  }
}
