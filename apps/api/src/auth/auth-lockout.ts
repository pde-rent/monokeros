import { HttpException, HttpStatus } from '@nestjs/common';
import {
  AUTH_MAX_ATTEMPTS,
  AUTH_LOCKOUT_MS,
  AUTH_ATTEMPT_WINDOW_MS,
  AUTH_BACKOFF_DELAYS_MS,
} from '@monokeros/constants';

interface LockoutEntry {
  attempts: number;
  firstAttempt: number;
  lockedUntil: number | null;
}

const lockouts = new Map<string, LockoutEntry>();

function getKey(email: string, ip: string): string {
  return `${email}:${ip}`;
}

function cleanup(): void {
  const now = Date.now();
  for (const [key, entry] of lockouts) {
    if (entry.lockedUntil && entry.lockedUntil < now) {
      lockouts.delete(key);
    } else if (entry.firstAttempt + AUTH_ATTEMPT_WINDOW_MS < now) {
      lockouts.delete(key);
    }
  }
}

export function checkLockout(email: string, ip: string): void {
  cleanup();
  const entry = lockouts.get(getKey(email, ip));

  if (entry?.lockedUntil && entry.lockedUntil > Date.now()) {
    const retryAfter = Math.ceil((entry.lockedUntil - Date.now()) / 1000);
    throw new HttpException(
      { message: 'Account temporarily locked', retryAfter, code: 'LOCKED' },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

export function getBackoffDelay(email: string, ip: string): number {
  const entry = lockouts.get(getKey(email, ip));
  const attempts = entry?.attempts ?? 0;
  return AUTH_BACKOFF_DELAYS_MS[Math.min(attempts, AUTH_BACKOFF_DELAYS_MS.length - 1)];
}

export function recordFailedAttempt(email: string, ip: string): void {
  const key = getKey(email, ip);
  const now = Date.now();
  const entry = lockouts.get(key);

  const newEntry: LockoutEntry = {
    attempts: (entry?.attempts ?? 0) + 1,
    firstAttempt: entry?.firstAttempt ?? now,
    lockedUntil: entry?.lockedUntil ?? null,
  };

  // Lock out after AUTH_MAX_ATTEMPTS
  if (newEntry.attempts >= AUTH_MAX_ATTEMPTS && !newEntry.lockedUntil) {
    newEntry.lockedUntil = now + AUTH_LOCKOUT_MS;
  }

  lockouts.set(key, newEntry);

  // Throw if we just locked out
  if (newEntry.lockedUntil && newEntry.attempts === AUTH_MAX_ATTEMPTS) {
    throw new HttpException(
      { message: 'Account locked due to too many attempts', retryAfter: AUTH_LOCKOUT_MS / 1000, code: 'LOCKED' },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

export function clearAttempts(email: string, ip: string): void {
  lockouts.delete(getKey(email, ip));
}
