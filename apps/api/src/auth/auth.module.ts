import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthController, WorkspaceMembersController } from './auth.controller';
import { ApiKeyController } from './api-key.controller';
import { AuthService } from './auth.service';
import { ApiKeyService } from './api-key.service';
import { AuthGuard } from './auth.guard';
import { WorkspaceGuard } from '../workspace/workspace.guard';
import { RolesGuard } from './roles.guard';
import { PermissionsGuard } from './permissions.guard';

@Module({
  controllers: [AuthController, WorkspaceMembersController, ApiKeyController],
  providers: [
    AuthService,
    ApiKeyService,
    // Guard order matters: Auth → Workspace → Roles → Permissions
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: WorkspaceGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
  exports: [AuthService, ApiKeyService],
})
export class AuthModule {}
