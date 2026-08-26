import { PaginationDTO } from '../../../common/dto/pagination.dto'
import { UserFiltersDTO } from './user-filters.dto'
import { IsOptional, IsString } from 'class-validator'
import { UserStatus } from '../entities/user.entity'
import { OrderDirection } from '../../../common/common.enum'

// Extiende ambas clases para heredar validaciones y propiedades
export class PaginationUserDTO extends PaginationDTO implements UserFiltersDTO {
  @IsOptional()
  @IsString()
  role?: string

  @IsOptional()
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
