import { Global, Module } from '@nestjs/common'
import { PaginationResponseBuilder } from './pagination-response.builder'

@Global()
@Module({
  providers: [PaginationResponseBuilder],
  exports: [PaginationResponseBuilder]
})
export class PaginationModule {}

// Export helper for easy access
export { PaginationHelper } from './pagination.helper'
export { PaginationResponse, PaginationMeta } from './pagination-response.interface'
