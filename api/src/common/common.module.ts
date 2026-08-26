import { Global, Module } from '@nestjs/common'
import { PaginationResponseBuilder } from './pagination/pagination-response.builder'

@Global()
@Module({
  providers: [PaginationResponseBuilder],
  exports: [PaginationResponseBuilder]
})
export class CommonModule {}
