import { IsOptional, IsNumberString } from 'class-validator'

export class PaginationDTO {
  @IsOptional()
  @IsNumberString()
  page?: string

  @IsOptional()
  @IsNumberString()
  limit?: string
}
