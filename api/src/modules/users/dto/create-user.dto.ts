import {
  IsEmail,
  IsNotEmpty,
  MinLength,
  IsString,
  IsOptional,
  IsInt
} from 'class-validator'
import { Transform } from 'class-transformer'

export class CreateUserDto {
  @IsNotEmpty()
  @MinLength(2)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value
  )
  name: string

  @IsNotEmpty()
  @MinLength(2)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value
  )
  lastName: string

  @IsNotEmpty()
  @MinLength(10)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value
  )
  phone: string

  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase() : value
  )
  address?: string

  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value
  )
  postalCode?: string

  @IsOptional()
  @IsNotEmpty()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase() : value
  )
  city: string

  @IsOptional()
  @IsNotEmpty()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value
  )
  country: string

  @IsOptional()
  @IsNotEmpty()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value
  )
  state: string

  @IsOptional()
  @IsInt()
  // No es necesario trim/toLowerCase para números
  age: number

  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value
  )
  email: string

  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  password: string
}
