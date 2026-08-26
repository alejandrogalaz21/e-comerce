import { ApiProperty } from '@nestjs/swagger'
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator'

export class CreateTaxActivityDto {
  @ApiProperty({ description: 'Tax profile owner id', format: 'uuid' })
  @IsUUID()
  taxProfileId: string

  @ApiProperty({
    description: 'Activity name',
    example: 'Retail sales',
    required: false
  })
  @IsOptional()
  @IsString()
  activity?: string

  @ApiProperty({
    description: 'Percentage of activity involvement',
    example: 80,
    required: false,
    minimum: 0,
    maximum: 100
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  percentage?: number
}
