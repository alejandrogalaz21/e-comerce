import { Global, Module } from '@nestjs/common'
import { AxiosAdapter } from './adapters/axios.adapter'
import { PaginationResponseBuilder } from './pagination/pagination-response.builder'

@Global()
@Module({
  providers: [AxiosAdapter, PaginationResponseBuilder],
  exports: [AxiosAdapter, PaginationResponseBuilder]
})
export class CommonModule {}
