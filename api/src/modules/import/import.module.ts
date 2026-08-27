import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { Product } from '@/modules/products/entities/product.entity'
import { ProductsModule } from '@/modules/products/products.module'
import { ImportBatch } from './import-batch.entity'
import { ImportService } from './import.service'
import { ImportController } from './import.controller'
import { ImportRowNormalizer } from './import-row.normalizer'

@Module({
  imports: [TypeOrmModule.forFeature([ImportBatch, Product]), ProductsModule],
  controllers: [ImportController],
  providers: [ImportService, ImportRowNormalizer],
  exports: [ImportService]
})
export class ImportModule {}
