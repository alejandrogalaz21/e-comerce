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
const MAX_SEARCH_TERMS = 10

function toCategoryList(raw: unknown): unknown {
  const source = Array.isArray(raw) ? raw.join(',') : raw

  if (typeof source !== 'string') return raw

  const categories = source
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)

  return Array.from(new Set(categories))
}

function toTermList(raw: unknown): unknown {
  const values = Array.isArray(raw) ? raw : [raw]
  const terms = values
    .filter((value): value is string => typeof value === 'string')
    .map(value => value.trim())
    .filter(Boolean)

  return terms.length ? Array.from(new Set(terms)) : undefined
}

function toBoolean(raw: unknown): unknown {
  if (raw === 'true' || raw === true) return true
  if (raw === 'false' || raw === false) return false
  return raw
}

export const PRODUCT_STATUSES = ['active', 'discontinued', 'all'] as const
export type ProductStatus = (typeof PRODUCT_STATUSES)[number]
export const DEFAULT_PRODUCT_STATUS: ProductStatus = 'active'

export class ProductFiltersDto extends PaginationDTO {
  @ApiPropertyOptional({
    example: 'camping',
    description:
      'Free-text search, case-insensitive, matched against name, sku, description and category. Repeat the parameter to search several terms at once: a product matching any of them is returned',
    maxLength: 100
  })
  @IsOptional()
  @Transform(({ obj }) => toTermList((obj as Record<string, unknown>).q))
  @IsArray()
  @ArrayMaxSize(MAX_SEARCH_TERMS)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  q?: string[]

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

  @ApiPropertyOptional({
    enum: PRODUCT_STATUSES,
    example: 'active',
    description: `Catalog status. Defaults to ${DEFAULT_PRODUCT_STATUS}, so a consumer that does not know this parameter keeps seeing what it saw before. Distinct from inStock: sold out is on sale with no units, discontinued is no longer sold`
  })
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsIn([...PRODUCT_STATUSES], {
    message: `status must be one of: ${PRODUCT_STATUSES.join(', ')}`
  })
  status?: ProductStatus
}
