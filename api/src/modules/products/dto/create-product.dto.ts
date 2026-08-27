import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min
} from 'class-validator'
import { Transform } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  sanitizeText,
  trimText
} from '@/common/transformers/sanitize.transformer'

export class CreateProductDto {
  @ApiProperty({
    example: 'RS-001',
    description: 'Business SKU, unique. Letters, digits and hyphens only',
    maxLength: 50
  })
  @Transform(({ value }) => trimText(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Matches(/^[A-Za-z0-9-]+$/, {
    message: 'sku must contain only letters, digits and hyphens'
  })
  sku: string

  @ApiProperty({
    example: 'Running Shoes',
    description: 'Product display name',
    maxLength: 255
  })
  @Transform(({ value }) => sanitizeText(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string

  @ApiPropertyOptional({
    example: 'Lightweight running shoes for daily training',
    maxLength: 2000
  })
  @IsOptional()
  @Transform(({ value }) => sanitizeText(value))
  @IsString()
  @MaxLength(2000)
  description?: string

  @ApiPropertyOptional({
    example: 'Footwear',
    description: "Defaults to 'Uncategorized' when empty or omitted",
    maxLength: 100
  })
  @IsOptional()
  @Transform(({ value }) => trimText(value))
  @IsString()
  @MaxLength(100)
  category?: string

  @ApiProperty({
    example: 89.99,
    description: 'Unit price, up to 2 decimal places',
    minimum: 0
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number

  @ApiProperty({ example: 150, description: 'Units in stock', minimum: 0 })
  @IsInt()
  @Min(0)
  stock: number

  @ApiPropertyOptional({
    example: 0.35,
    description: 'Weight in kilograms',
    minimum: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  weightKg?: number
}
