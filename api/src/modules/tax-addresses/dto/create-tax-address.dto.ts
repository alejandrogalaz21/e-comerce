import { ApiProperty } from '@nestjs/swagger'
import {
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength
} from 'class-validator'

export class CreateTaxAddressDto {
  @ApiProperty({ description: 'Tax profile owner id', format: 'uuid' })
  @IsUUID()
  taxProfileId: string

  @ApiProperty({ description: 'Postal code', example: '01234' })
  @IsString()
  @Length(1, 10)
  postalCode: string

  @ApiProperty({
    description: 'Street name',
    example: 'Main St',
    required: false
  })
  @IsOptional()
  @IsString()
  streetName?: string

  @ApiProperty({
    description: 'Neighborhood or suburb',
    example: 'Downtown',
    required: false
  })
  @IsOptional()
  @IsString()
  neighborhood?: string

  @ApiProperty({
    description: 'Exterior number',
    example: '123',
    required: false
  })
  @IsOptional()
  @IsString()
  exteriorNumber?: string

  @ApiProperty({
    description: 'Interior number',
    example: 'A',
    required: false
  })
  @IsOptional()
  @IsString()
  interiorNumber?: string

  @ApiProperty({ description: 'City name', example: 'CDMX', required: false })
  @IsOptional()
  @IsString()
  city?: string

  @ApiProperty({
    description: 'State name',
    example: 'Ciudad de México',
    required: false
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  state?: string
}
