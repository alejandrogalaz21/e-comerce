import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min
} from 'class-validator'
import { Transform, Type } from 'class-transformer'
import { ApiPropertyOptional } from '@nestjs/swagger'

import { PaginationDTO } from '@/common/dto/pagination.dto'
import { trimText } from '@/common/transformers/sanitize.transformer'
import { IsNotLessThan } from '@/common/validators/is-not-less-than.validator'

export const PRODUCT_SORT_FIELDS = [
  'name',
  'price',
  'stock',
  'createdAt',
  'updatedAt'
] as const

export type ProductSortField = (typeof PRODUCT_SORT_FIELDS)[number]

export const PRODUCT_SORT_DIRECTIONS = ['asc', 'desc'] as const

export type ProductSortDirection = (typeof PRODUCT_SORT_DIRECTIONS)[number]

export const DEFAULT_PRODUCT_SORT_FIELD: ProductSortField = 'createdAt'
export const DEFAULT_PRODUCT_SORT_DIRECTION: ProductSortDirection = 'desc'

const MAX_CATEGORIES = 20

function toCategoryList(raw: unknown): unknown {
  const source = Array.isArray(raw) ? raw.join(',') : raw

  if (typeof source !== 'string') return raw

  const categories = source
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)

  return Array.from(new Set(categories))
}

function toBoolean(raw: unknown): unknown {
  if (raw === 'true' || raw === true) return true
  if (raw === 'false' || raw === false) return false
  return raw
}

export class ProductFiltersDto extends PaginationDTO {
  @ApiPropertyOptional({
    example: 'camping',
    description:
      'Free-text search, case-insensitive, matched against name, sku, description and category',
    maxLength: 100
  })
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @MaxLength(100)
  q?: string

  @ApiPropertyOptional({
    example: 'Electronics,Tools',
    description:
      'Category filter, case-insensitive. Accepts several categories separated by commas',
    maxLength: 100
  })
  @IsOptional()
  @Transform(({ obj }) =>
    toCategoryList((obj as Record<string, unknown>).category)
  )
  @IsArray()
  @ArrayMaxSize(MAX_CATEGORIES)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  category?: string[]

  @ApiPropertyOptional({
    example: 10,
    minimum: 0,
    description: 'Minimum price, inclusive'
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  minPrice?: number

  @ApiPropertyOptional({
    example: 50,
    minimum: 0,
    description: 'Maximum price, inclusive. Must not be lower than minPrice'
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsNotLessThan('minPrice')
  maxPrice?: number

  @ApiPropertyOptional({
    example: true,
    description:
      'true returns only products with stock, false returns only sold out products. Omit to include both'
  })
  @IsOptional()
  @Transform(({ obj }) => toBoolean((obj as Record<string, unknown>).inStock))
  @IsBoolean()
  inStock?: boolean

  @ApiPropertyOptional({
    enum: PRODUCT_SORT_FIELDS,
    example: 'updatedAt',
    description: `Sort field. Defaults to ${DEFAULT_PRODUCT_SORT_FIELD}`
  })
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsIn([...PRODUCT_SORT_FIELDS])
  sortBy?: ProductSortField

  @ApiPropertyOptional({
    enum: PRODUCT_SORT_DIRECTIONS,
    example: 'desc',
    description: `Sort direction. Defaults to ${DEFAULT_PRODUCT_SORT_DIRECTION}`
  })
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsIn([...PRODUCT_SORT_DIRECTIONS])
  sortDir?: ProductSortDirection
}
