import { ApiProperty } from '@nestjs/swagger'
import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator'

export class CreateTaxRegimeDto {
  @ApiProperty({ description: 'Tax profile owner id', format: 'uuid' })
  @IsUUID()
  taxProfileId: string

  @ApiProperty({ description: 'Regime name', example: 'RIF', required: false })
  @IsOptional()
  @IsString()
  regimeName?: string

  @ApiProperty({
    description: 'Start date',
    example: '2024-01-01',
    required: false
  })
  @IsOptional()
  @IsDateString()
  startDate?: string

  @ApiProperty({
    description: 'End date',
    example: '2025-01-01',
    required: false
  })
  @IsOptional()
  @IsDateString()
  endDate?: string
}
