import { Global, Module } from '@nestjs/common';
import { MockStore } from './mock-store';

@Global()
@Module({
  providers: [MockStore],
  exports: [MockStore],
})
export class MockStoreModule {}
