import { Module } from '@nestjs/common';
import { TeamsController } from './teams.controller';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [FilesModule],
  controllers: [TeamsController],
})
export class TeamsModule {}
