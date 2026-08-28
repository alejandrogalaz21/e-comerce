import { IsOptional, IsString, MaxLength } from 'class-validator'
import { Transform } from 'class-transformer'
import { ApiPropertyOptional } from '@nestjs/swagger'

import { PaginationDTO } from '@/common/dto/pagination.dto'
import { trimText } from '@/common/transformers/sanitize.transformer'

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
    example: 'Footwear',
    description: 'Exact category filter, case-insensitive',
    maxLength: 100
  })
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @MaxLength(100)
  category?: string
}
