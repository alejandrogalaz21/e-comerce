import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { TaxRegimesService } from './tax-regimes.service'
import { TaxRegimesController } from './tax-regimes.controller'
import { TaxRegime } from './entities/tax-regime.entity'
import { TaxProfile } from '@/modules/tax-profiles/entities/tax-profile.entity'

@Module({
  imports: [TypeOrmModule.forFeature([TaxRegime, TaxProfile])],
  controllers: [TaxRegimesController],
  providers: [TaxRegimesService]
})
export class TaxRegimesModule {}
