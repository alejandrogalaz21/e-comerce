import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { TaxProfilesService } from './tax-profiles.service'
import { TaxProfilesController } from './tax-profiles.controller'
import { TaxProfile } from './entities/tax-profile.entity'
import { Client } from '@/modules/clients/entities/client.entity'

@Module({
  imports: [TypeOrmModule.forFeature([TaxProfile, Client])],
  controllers: [TaxProfilesController],
  providers: [TaxProfilesService]
})
export class TaxProfilesModule {}
