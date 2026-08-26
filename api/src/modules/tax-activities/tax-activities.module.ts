import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { TaxActivitiesService } from './tax-activities.service'
import { TaxActivitiesController } from './tax-activities.controller'
import { TaxActivity } from './entities/tax-activity.entity'
import { TaxProfile } from '@/modules/tax-profiles/entities/tax-profile.entity'

@Module({
  imports: [TypeOrmModule.forFeature([TaxActivity, TaxProfile])],
  controllers: [TaxActivitiesController],
  providers: [TaxActivitiesService]
})
export class TaxActivitiesModule {}
