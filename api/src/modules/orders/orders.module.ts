// src/modules/orders/orders.module.ts
import { Module } from '@nestjs/common'
import { OrdersController } from './orders.controller'
import { OrdersService } from './orders.service'
import { OrdersRepository } from './orders.repository'
import { DynamoDbModule } from '@/database/dynamodb/dynamodb.module'

/**
 * OrdersModule bundles controller, service and repository for order management.
 * Imports `DynamoDbModule` to gain access to the configured DynamoDB client.
 */
@Module({
  imports: [DynamoDbModule],
  controllers: [OrdersController],
  providers: [OrdersRepository, OrdersService],
  exports: [OrdersService]
})
export class OrdersModule {}
