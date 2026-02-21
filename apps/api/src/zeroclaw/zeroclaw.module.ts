import { Module } from '@nestjs/common';
import { ZeroClawService } from './zeroclaw.service';

@Module({
  providers: [ZeroClawService],
  exports: [ZeroClawService],
})
export class ZeroClawModule {}
