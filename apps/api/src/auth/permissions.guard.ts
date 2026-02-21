import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator';
import type { Permission } from '@monokeros/types';

const ROLE_PERMISSION_MAP: Record<string, Permission[]> = {
  admin: ['*'],
  validator: [
    'members:read', 'members:write',
    'teams:read',
    'projects:read', 'projects:write',
    'tasks:read', 'tasks:write',
    'conversations:read', 'conversations:write',
    'files:read', 'files:write',
  ],
  viewer: [
    'members:read', 'teams:read', 'projects:read',
    'tasks:read', 'conversations:read', 'files:read',
  ],
};

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest();

    // JWT-authenticated users: map workspace role to permissions
    if (request.authMethod === 'jwt') {
      const role = request.user?.role as string;
      const rolePerms = ROLE_PERMISSION_MAP[role] ?? [];
      if (rolePerms.includes('*')) return true;
      return required.every((p) => rolePerms.includes(p));
    }

    // API key auth: check apiKey.permissions
    const apiKey = request.apiKey;
    if (!apiKey) return false;
    if (apiKey.permissions.includes('*')) return true;
    return required.every((p: Permission) => apiKey.permissions.includes(p));
  }
}
