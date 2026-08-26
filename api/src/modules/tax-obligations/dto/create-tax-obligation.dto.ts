import { ApiProperty } from '@nestjs/swagger'
import { IsOptional, IsString, IsUUID } from 'class-validator'

export class CreateTaxObligationDto {
  @ApiProperty({ description: 'Tax profile owner id', format: 'uuid' })
  @IsUUID()
  taxProfileId: string

  @ApiProperty({
    description: 'Obligation name',
    example: 'IVA mensual',
    required: false
  })
  @IsOptional()
  @IsString()
  obligation?: string

  @ApiProperty({
    description: 'Obligation description',
    example: 'Monthly VAT filing',
    required: false
  })
  @IsOptional()
  @IsString()
  description?: string
}
