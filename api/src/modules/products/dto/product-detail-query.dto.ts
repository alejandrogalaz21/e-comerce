import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsIn, IsOptional } from 'class-validator'

import { PRODUCT_STATUSES, ProductStatus } from './product-filters.dto'

export class ProductDetailQueryDto {
  @ApiPropertyOptional({
    enum: PRODUCT_STATUSES,
    example: 'all',
    description:
      'Catalog states the caller is asking about. Omitted means on sale only, which is what the shop asks for. Any other value requires a session'
  })
  @IsOptional()
  @IsIn([...PRODUCT_STATUSES], {
    message: `status must be one of: ${PRODUCT_STATUSES.join(', ')}`
  })
  status?: ProductStatus
}
