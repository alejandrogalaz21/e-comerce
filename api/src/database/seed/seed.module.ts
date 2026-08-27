import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { Product } from '@/modules/products/entities/product.entity'
import { ProductsModule } from '@/modules/products/products.module'
import { SeedService } from './seed.service'

@Module({
  imports: [TypeOrmModule.forFeature([Product]), ProductsModule],
  providers: [SeedService]
})
export class SeedModule {}
