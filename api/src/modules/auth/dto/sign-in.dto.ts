import { ApiProperty } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator'

export class SignInDto {
  @ApiProperty({ example: 'demo@demo.com', description: 'Registered email' })
  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value
  )
  email: string

  @ApiProperty({ example: 'demo', description: 'Account password' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  password: string
}
