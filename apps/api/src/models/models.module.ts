import { Module, Global } from '@nestjs/common';
import { ModelsController } from './models.controller';
import { ModelCatalogService } from './model-catalog.service';

@Global()
@Module({
  controllers: [ModelsController],
  providers: [ModelCatalogService],
  exports: [ModelCatalogService],
})
export class ModelsModule {}
