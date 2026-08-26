import { ApiProperty } from '@nestjs/swagger'
import {
  IsEnum,
  IsOptional,
  IsString,
  Length,
  MaxLength
} from 'class-validator'
import { ClientStatus } from '../entities/client.entity'

export class CreateClientDto {
  @ApiProperty({
    description: 'Unique RFC identifier',
    example: 'ABC1234567890'
  })
  @IsString()
  @Length(12, 13)
  rfc: string

  @ApiProperty({ description: 'Given name', example: 'Jane' })
  @IsString()
  firstName: string

  @ApiProperty({ description: 'Primary last name', example: 'Doe' })
  @IsString()
  lastName: string

  @ApiProperty({
    description: 'Secondary last name',
    example: 'Smith',
    required: false
  })
  @IsOptional()
  @IsString()
  secondLastName?: string

  @ApiProperty({
    description: 'Phone number',
    example: '+525512345678',
    required: false
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string

  @ApiProperty({
    description: 'Legal name or business name',
    example: 'Acme Corp'
  })
  @IsString()
  legalName: string

  @ApiProperty({
    description: 'Status of the client',
    required: false,
    enum: ClientStatus,
    example: ClientStatus.ACTIVE
  })
  @IsOptional()
  @IsEnum(ClientStatus)
  status?: ClientStatus
}
