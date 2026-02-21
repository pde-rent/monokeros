import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator';
import { AuthService } from './auth.service';
import { ApiKeyService } from './api-key.service';
import { MockStore } from '../store/mock-store';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private apiKeyService: ApiKeyService,
    private reflector: Reflector,
    private store: MockStore,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing authorization header');
    }

    const token = authorization.slice(7);

    // API key path (mk_ prefix)
    if (token.startsWith('mk_')) {
      const apiKey = await this.apiKeyService.verify(token);
      if (!apiKey) {
        throw new UnauthorizedException('Invalid or expired API key');
      }

      const member = this.store.members.get(apiKey.memberId);
      const wsMember = this.store.getWorkspaceMemberByMemberId(apiKey.memberId);

      request.user = {
        sub: apiKey.memberId,
        email: member?.email ?? '',
        name: member?.name ?? '',
        workspaceId: apiKey.workspaceId,
        role: wsMember?.role ?? 'viewer',
      };
      request.apiKey = apiKey;
      request.authMethod = 'api-key';
      return true;
    }

    // JWT path (existing)
    const payload = await this.authService.verifyToken(token);
    request.user = payload;
    request.authMethod = 'jwt';
    return true;
  }
}
