import { ApiProperty } from '@nestjs/swagger'
import { IsBase64, IsString, IsUUID } from 'class-validator'

export class CreateCredentialDto {
  @ApiProperty({ description: 'Client owner id', format: 'uuid' })
  @IsUUID()
  clientId: string

  @ApiProperty({
    description: 'S3 path to the certificate file',
    example: 's3://bucket/credentials/abc.cer'
  })
  @IsString()
  cerS3Path: string

  @ApiProperty({
    description: 'S3 path to the private key file',
    example: 's3://bucket/credentials/abc.key'
  })
  @IsString()
  keyS3Path: string

  @ApiProperty({
    description: 'Encrypted password in base64',
    example: 'YWJjMTIzIT8kKiYoKSctPUB+'
  })
  @IsBase64()
  encryptedPassword: string

  @ApiProperty({
    description: 'Initialization vector in base64',
    example: 'MTIzNDU2Nzg5MGFiY2RlZg=='
  })
  @IsBase64()
  encryptionIv: string
}
