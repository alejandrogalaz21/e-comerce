// src/modules/health/health.module.ts
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { HealthController } from './health.controller'
import { DynamoDbModule } from '@/database/dynamodb/dynamodb.module'
import { PgModule } from '@/database/postgres/pg.module'

@Module({
  imports: [ConfigModule, DynamoDbModule, PgModule],
  controllers: [HealthController],
  providers: [],
  exports: []
})
export class HealthModule {}
