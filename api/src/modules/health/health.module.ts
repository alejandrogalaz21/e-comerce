import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { HealthController } from './health.controller'
import { PgModule } from '@/database/postgres/pg.module'

@Module({
  imports: [ConfigModule, PgModule],
  controllers: [HealthController],
  providers: [],
  exports: []
})
export class HealthModule {}
