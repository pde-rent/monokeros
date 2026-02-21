import { Module } from '@nestjs/common';
import { MembersController } from './members.controller';
import { MembersGateway } from './members.gateway';
import { OpenClawModule } from '../openclaw/openclaw.module';
import { AuthModule } from '../auth/auth.module';
import { FilesModule } from '../files/files.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { IdentityModule } from '../identity/identity.module';

@Module({
  imports: [OpenClawModule, AuthModule, FilesModule, NotificationsModule, IdentityModule],
  controllers: [MembersController],
  providers: [MembersGateway],
})
export class MembersModule {}
