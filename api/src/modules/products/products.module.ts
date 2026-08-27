import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { Product } from './entities/product.entity'
import { ProductsService } from './products.service'
import { ProductsController } from './products.controller'
import { ImportBatch } from './import/import-batch.entity'
import { ImportService } from './import/import.service'
import { ImportController } from './import/import.controller'
import { ImportRowNormalizer } from './import/import-row.normalizer'

@Module({
  controllers: [ImportController, ProductsController],
  providers: [ProductsService, ImportService, ImportRowNormalizer],
  imports: [TypeOrmModule.forFeature([Product, ImportBatch])],
  exports: [ImportService]
})
export class ProductsModule {}
