import { IsOptional, IsString, MaxLength } from 'class-validator'
import { Transform } from 'class-transformer'
import { ApiPropertyOptional } from '@nestjs/swagger'

import { PaginationDTO } from '@/common/dto/pagination.dto'
import { trimText } from '@/common/transformers/sanitize.transformer'

export class ImportBatchFiltersDto extends PaginationDTO {
  @ApiPropertyOptional({
    example: 'loanpro',
    description: 'Free-text search, case-insensitive, matched against filename',
    maxLength: 255
  })
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @MaxLength(255)
  q?: string
}
