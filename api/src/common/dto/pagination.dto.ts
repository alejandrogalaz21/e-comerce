import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsInt, IsOptional, Max, Min } from 'class-validator'

export const MAX_PAGE_SIZE = 100

/**
 * Validated as integers with a floor and a ceiling. As numeric strings, `-1`
 * and `1.5` passed validation and reached Postgres as a negative OFFSET, which
 * answers a client mistake with a 500, and an unbounded page size let a single
 * request ask for the whole table.
 */
export class PaginationDTO {
  @ApiPropertyOptional({ example: 1, default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number

  @ApiPropertyOptional({
    example: 10,
    default: 10,
    minimum: 1,
    maximum: MAX_PAGE_SIZE
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit?: number
}
