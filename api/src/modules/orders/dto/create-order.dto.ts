// src/modules/orders/dto/create-order.dto.ts
import {
  IsArray,
  ArrayNotEmpty,
  IsString,
  IsUUID,
  IsNumber,
  IsPositive,
  IsOptional,
  IsIn,
  ValidateNested,
  IsISO8601
} from 'class-validator'
import { Type } from 'class-transformer'
import { OrderItem, OrderStatus } from '../entities/order.entity'

/**
 * DTO used to validate and transform input data when creating an order.
 */
export class CreateOrderDto {
  @IsUUID()
  orderId: string

  @IsUUID()
  customerId: string

  @IsIn(['pending', 'confirmed'] as OrderStatus[])
  status: OrderStatus

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[]

  @IsNumber()
  @IsPositive()
  total: number

  @IsString()
  currency: string

  @IsOptional()
  @IsString()
  notes?: string

  @IsISO8601()
  createdAt: string

  @IsISO8601()
  updatedAt: string
}

/**
 * DTO for validating individual order line items.
 */
export class OrderItemDto implements OrderItem {
  @IsUUID()
  productId: string

  @IsNumber()
  @IsPositive()
  quantity: number

  @IsNumber()
  @IsPositive()
  unitPrice: number

  @IsOptional()
  @IsString()
  title?: string
}
