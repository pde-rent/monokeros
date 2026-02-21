import { Module } from '@nestjs/common';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';
import { FilesModule } from '../files/files.module';
import { AuthModule } from '../auth/auth.module';
import { IdentityModule } from '../identity/identity.module';
import { WorkspaceModule } from '../workspace/workspace.module';
import { ZeroClawModule } from '../zeroclaw/zeroclaw.module';

@Module({
  imports: [FilesModule, AuthModule, IdentityModule, WorkspaceModule, ZeroClawModule],
  controllers: [TemplatesController],
  providers: [TemplatesService],
})
export class TemplatesModule {}
