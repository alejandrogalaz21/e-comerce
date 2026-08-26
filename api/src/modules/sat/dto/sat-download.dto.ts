import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsIn,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min
} from 'class-validator'

export class SatDownloadDto {
  @ApiProperty({
    description: 'RFC asociado a la FIEL utilizada',
    example: 'AAA010101AAA'
  })
  @IsString()
  @IsNotEmpty()
  rfc: string

  @ApiProperty({
    description: 'Contraseña de la llave privada (.key) de la FIEL'
  })
  @IsString()
  @IsNotEmpty()
  keyPassword: string

  @ApiProperty({
    description: 'Tipo de descarga',
    enum: ['issued', 'received'],
    default: 'issued'
  })
  @IsString()
  @IsIn(['issued', 'received'])
  downloadType: 'issued' | 'received' = 'issued'

  @ApiProperty({
    description: 'Tipo de solicitud',
    enum: ['xml', 'metadata'],
    default: 'xml'
  })
  @IsString()
  @IsIn(['xml', 'metadata'])
  requestType: 'xml' | 'metadata' = 'xml'

  @ApiProperty({
    description: 'Fecha inicio (ISO 8601)',
    example: '2024-01-01'
  })
  @IsISO8601()
  start: string

  @ApiProperty({ description: 'Fecha fin (ISO 8601)', example: '2024-01-31' })
  @IsISO8601()
  end: string

  @ApiPropertyOptional({
    description: 'Intervalo de polling en milisegundos',
    default: 60000
  })
  @IsOptional()
  @IsNumber()
  @Min(1000)
  pollIntervalMs?: number

  @ApiPropertyOptional({
    description: 'Directorio donde se guardarán los ZIP',
    default: 'out'
  })
  @IsOptional()
  @IsString()
  outputDir?: string
}
