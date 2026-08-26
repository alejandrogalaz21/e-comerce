// src/modules/orders/dto/update-order.dto.ts
import { PartialType } from '@nestjs/mapped-types'
import { CreateOrderDto } from './create-order.dto'
import { IsIn, IsOptional } from 'class-validator'
import { OrderStatus } from '../entities/order.entity'

/**
 * DTO for updating an existing order. All fields are optional.
 */
export class UpdateOrderDto extends PartialType(CreateOrderDto) {
  @IsOptional()
  @IsIn([
    'pending',
    'confirmed',
    'shipped',
    'delivered',
    'cancelled'
  ] as OrderStatus[])
  status?: OrderStatus
}
