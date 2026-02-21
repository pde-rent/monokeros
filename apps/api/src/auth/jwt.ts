const encoder = new TextEncoder();

function base64url(data: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < data.length; i++) binary += String.fromCharCode(data[i]);
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64urlDecode(str: string): Uint8Array {
  let padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4;
  if (pad) padded += '='.repeat(4 - pad);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function base64urlJSON(obj: unknown): string {
  return base64url(encoder.encode(JSON.stringify(obj)));
}

async function importKey(secret: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', secret, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

function parseExpiration(exp: string): number {
  const match = exp.match(/^(\d+)(s|m|h|d)$/);
  if (!match) throw new Error(`Invalid expiration format: ${exp}`);
  const val = parseInt(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return val * multipliers[unit];
}

export interface SignOptions {
  payload: Record<string, unknown>;
  secret: Uint8Array;
  issuer: string;
  expirationTime: string;
}

export async function signJwt({ payload, secret, issuer, expirationTime }: SignOptions): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iss: issuer, iat: now, exp: now + parseExpiration(expirationTime) };
  const header = base64urlJSON({ alg: 'HS256', typ: 'JWT' });
  const body = base64urlJSON(fullPayload);
  const data = encoder.encode(`${header}.${body}`);
  const key = await importKey(secret);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, data));
  return `${header}.${body}.${base64url(sig)}`;
}

export async function verifyJwt(token: string, secret: Uint8Array, issuer: string): Promise<Record<string, unknown>> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token');
  const [header, body, sig] = parts;
  const key = await importKey(secret);
  const data = encoder.encode(`${header}.${body}`);
  const valid = await crypto.subtle.verify('HMAC', key, base64urlDecode(sig), data);
  if (!valid) throw new Error('Invalid signature');
  const payload = JSON.parse(new TextDecoder().decode(base64urlDecode(body)));
  if (payload.iss !== issuer) throw new Error('Invalid issuer');
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) throw new Error('Token expired');
  return payload;
}
