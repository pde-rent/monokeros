import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsGateway } from './projects.gateway';
import { FilesModule } from '../files/files.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [FilesModule, NotificationsModule],
  controllers: [ProjectsController],
  providers: [ProjectsGateway],
})
export class ProjectsModule {}
