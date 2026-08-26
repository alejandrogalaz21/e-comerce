import { ApiProperty } from '@nestjs/swagger'
import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength
} from 'class-validator'

export class CreateTaxProfileDto {
  @ApiProperty({ description: 'Owner client id', format: 'uuid' })
  @IsUUID()
  clientId: string

  @ApiProperty({
    description: 'RFC associated to this tax profile',
    example: 'ABC1234567890'
  })
  @IsString()
  @Length(12, 13)
  rfc: string

  @ApiProperty({
    description: 'Commercial name',
    example: 'Acme Retail',
    required: false
  })
  @IsOptional()
  @IsString()
  commercialName?: string

  @ApiProperty({
    description: 'Status label',
    example: 'active',
    required: false
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  status?: string

  @ApiProperty({
    description: 'Start of operations',
    example: '2023-01-15',
    required: false
  })
  @IsOptional()
  @IsDateString()
  startOperations?: string
}
