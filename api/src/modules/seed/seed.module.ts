import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { Product } from '@/modules/products/entities/product.entity'
import { ImportModule } from '@/modules/import/import.module'
import { SeedService } from './seed.service'

@Module({
  imports: [TypeOrmModule.forFeature([Product]), ImportModule],
  providers: [SeedService]
})
export class SeedModule {}
