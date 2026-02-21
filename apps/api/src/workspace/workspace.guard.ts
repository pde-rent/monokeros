import { CanActivate, ExecutionContext, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../auth/public.decorator';
import { MockStore } from '../store/mock-store';

@Injectable()
export class WorkspaceGuard implements CanActivate {
  constructor(
    private store: MockStore,
    private reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const slug = request.params?.slug;

    // Skip for routes without workspace slug (e.g., /auth/*, /workspaces top-level)
    if (!slug) return true;

    const workspace = Array.from(this.store.workspaces.values()).find((w) => w.slug === slug);
    if (!workspace) throw new NotFoundException('Workspace not found');

    request.workspace = workspace;

    // For API key auth, validate key is scoped to this workspace.
    // API keys are already workspace-scoped, so skip the workspaceMembers
    // lookup (agents don't have workspace member entries).
    if (request.apiKey) {
      if (request.apiKey.workspaceId !== workspace.id) {
        throw new ForbiddenException('API key not valid for this workspace');
      }
      // Ensure workspace ID is set on the user object
      if (request.user) {
        request.user.workspaceId = workspace.id;
      }
      return true;
    }

    // JWT auth: resolve user's role in this specific workspace
    const userId = request.user?.sub;
    if (userId) {
      const membership = Array.from(this.store.workspaceMembers.values())
        .find((m) => m.workspaceId === workspace.id && m.memberId === userId);
      if (!membership) throw new ForbiddenException('Not a member of this workspace');

      // Override role with this workspace's membership role
      request.user.role = membership.role;
      request.user.workspaceId = workspace.id;
    }

    return true;
  }
}
