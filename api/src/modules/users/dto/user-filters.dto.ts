import { IsOptional, IsString, IsEnum } from 'class-validator'
import { UserStatus } from '../entities/user.entity'
import { OrderDirection } from '../../../common/common.enum'

export class UserFiltersDTO {
  @IsOptional()
  @IsString()
  role?: string

  /**
   * Estado del usuario. Solo acepta valores válidos del enum UserStatus.
   */
  @IsOptional()
  @IsEnum(UserStatus, {
    message: `status must be one of: ACTIVE, INACTIVE, BANNED, PENDING, DELETED`
  })
  status?: UserStatus

  @IsOptional()
  @IsString()
  phone?: string

  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  lastName?: string

  @IsOptional()
  @IsString()
  orderBy?: 'id' | 'email' | 'name' | 'lastName'

  @IsOptional()
  @IsString()
  orderDir?: OrderDirection
}
