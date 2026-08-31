import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { CommonModule } from '@/common/common.module'
import { PaymentModule } from '@/modules/payment/payment.module'
import { ProductsModule } from '@/modules/products/products.module'

import { Order } from './entities/order.entity'
import { OrderItem } from './entities/order-item.entity'
import { OrdersController } from './orders.controller'
import { OrdersService } from './orders.service'

@Module({
  controllers: [OrdersController],
  providers: [OrdersService],
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem]),
    CommonModule,
    PaymentModule,
    // Buying changes stock, so it invalidates the cached catalog for the same
    // reason editing a product does.
    ProductsModule
  ],
  exports: [OrdersService]
})
export class OrdersModule {}
