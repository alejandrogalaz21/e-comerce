import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { TaxAddressesService } from './tax-addresses.service'
import { TaxAddressesController } from './tax-addresses.controller'
import { TaxAddress } from './entities/tax-address.entity'
import { TaxProfile } from '@/modules/tax-profiles/entities/tax-profile.entity'

@Module({
  imports: [TypeOrmModule.forFeature([TaxAddress, TaxProfile])],
  controllers: [TaxAddressesController],
  providers: [TaxAddressesService]
})
export class TaxAddressesModule {}
