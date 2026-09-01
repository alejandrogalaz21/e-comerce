import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { Product } from './entities/product.entity'
import { ProductHistory } from './entities/product-history.entity'
import { ProductsService } from './products.service'
import { ProductsController } from './products.controller'

@Module({
  controllers: [ProductsController],
  providers: [ProductsService],
  imports: [TypeOrmModule.forFeature([Product, ProductHistory])],
  exports: [ProductsService]
})
export class ProductsModule {}
