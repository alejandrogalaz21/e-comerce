import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { TaxObligationsService } from './tax-obligations.service'
import { TaxObligationsController } from './tax-obligations.controller'
import { TaxObligation } from './entities/tax-obligation.entity'
import { TaxProfile } from '@/modules/tax-profiles/entities/tax-profile.entity'

@Module({
  imports: [TypeOrmModule.forFeature([TaxObligation, TaxProfile])],
  controllers: [TaxObligationsController],
  providers: [TaxObligationsService]
})
export class TaxObligationsModule {}
