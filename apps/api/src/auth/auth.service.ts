import { Injectable, UnauthorizedException } from '@nestjs/common';
import { signJwt, verifyJwt } from './jwt';
import { MockStore } from '../store/mock-store';
import type { Member, WorkspaceMember } from '@monokeros/types';
import { checkLockout, getBackoffDelay, recordFailedAttempt, clearAttempts } from './auth-lockout';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'monkeros-dev-secret-key-change-in-production',
);
const JWT_ISSUER = 'monkeros';
const JWT_EXPIRATION = '24h';

export interface JwtPayload {
  sub: string;        // memberId
  email: string;
  name: string;
  workspaceId: string;
  role: string;        // WorkspaceRole
}

@Injectable()
export class AuthService {
  constructor(private store: MockStore) {}

  async login(email: string, password: string, ip: string): Promise<{ token: string; user: Omit<Member, 'passwordHash'>; role: string; workspaces: ReturnType<AuthService['getUserWorkspaces']> }> {
    // Check if locked out
    checkLockout(email, ip);

    // Apply back-off delay before processing
    const delay = getBackoffDelay(email, ip);
    if (delay > 0) {
      await new Promise((r) => setTimeout(r, delay));
    }

    const human = Array.from(this.store.members.values()).find(
      (m) => m.type === 'human' && m.email === email,
    );

    // Record failed attempt if user not found
    if (!human) {
      recordFailedAttempt(email, ip);
      throw new UnauthorizedException('Invalid credentials');
    }

    // In mock mode, accept "password123" for all users
    if (password !== 'password123') {
      recordFailedAttempt(email, ip);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Find workspace membership
    const wsMember = Array.from(this.store.workspaceMembers.values()).find(
      (m) => m.memberId === human.id,
    );
    if (!wsMember) throw new UnauthorizedException('No workspace membership found');

    // Clear attempts on successful login
    clearAttempts(email, ip);

    const token = await this.signToken({
      sub: human.id,
      email: human.email!,
      name: human.name,
      workspaceId: wsMember.workspaceId,
      role: wsMember.role,
    });

    const { passwordHash: _, ...user } = human;
    const workspaces = this.getUserWorkspaces(human.id);
    return { token, user, role: wsMember.role, workspaces };
  }

  async verifyToken(token: string): Promise<JwtPayload> {
    try {
      const payload = await verifyJwt(token, JWT_SECRET, JWT_ISSUER);
      return payload as unknown as JwtPayload;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  getHuman(memberId: string): Omit<Member, 'passwordHash'> | null {
    const member = this.store.members.get(memberId);
    if (!member || member.type !== 'human') return null;
    const { passwordHash: _, ...rest } = member;
    return rest;
  }

  getMember(memberId: string): WorkspaceMember | null {
    return Array.from(this.store.workspaceMembers.values()).find(
      (m) => m.memberId === memberId,
    ) ?? null;
  }

  getUserWorkspaces(memberId: string) {
    const memberships = Array.from(this.store.workspaceMembers.values())
      .filter((m) => m.memberId === memberId);

    return memberships.map((m) => {
      const ws = this.store.workspaces.get(m.workspaceId);
      if (!ws) return null;
      return { id: ws.id, slug: ws.slug, displayName: ws.displayName, role: m.role, branding: ws.branding, industry: ws.industry };
    }).filter(Boolean);
  }

  private async signToken(payload: JwtPayload): Promise<string> {
    return signJwt({
      payload: payload as unknown as Record<string, unknown>,
      secret: JWT_SECRET,
      issuer: JWT_ISSUER,
      expirationTime: JWT_EXPIRATION,
    });
  }
}
