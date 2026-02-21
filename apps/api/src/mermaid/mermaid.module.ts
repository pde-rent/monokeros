import { Global, Module } from '@nestjs/common';
import { MermaidService } from './mermaid.service';

@Global()
@Module({
  providers: [MermaidService],
  exports: [MermaidService],
})
export class MermaidModule {}
