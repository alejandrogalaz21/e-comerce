import { Type } from 'class-transformer'
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min
} from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

import { OrderStatus } from '../order-status.enum'

export class OrderFiltersDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @ApiPropertyOptional({ example: 20, default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20

  @ApiPropertyOptional({
    example: 'PRJ-001',
    description:
      'Matches the start of an order id, or any delivery detail (recipient name, phone, email, address, city, state, zip code, country), or a SKU or product name among its lines'
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string

  @ApiPropertyOptional({
    enum: OrderStatus,
    example: OrderStatus.PAID,
    description: 'Only orders in this state'
  })
  @IsOptional()
  @IsEnum(OrderStatus, {
    message: `status must be one of: ${Object.values(OrderStatus).join(', ')}`
  })
  status?: OrderStatus

  @ApiPropertyOptional({
    example: '2026-08-01',
    description: 'Orders placed on or after this date'
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string

  @ApiPropertyOptional({
    example: '2026-08-31',
    description: 'Orders placed on or before this date, the whole day included'
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string
}
