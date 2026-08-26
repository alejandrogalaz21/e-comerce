import { Injectable } from '@nestjs/common'
import {
  PaginationMeta,
  PaginationResponse
} from './pagination-response.interface'

/**
 * Servicio que construye una respuesta paginada estandarizada.
 */
@Injectable()
export class PaginationResponseBuilder<T> {
  build(
    data: T[],
    total: number,
    page: number,
    perPage: number
  ): PaginationResponse<T> {
    const lastPage = Math.ceil(total / perPage) || 1
    const from = total === 0 ? 0 : (page - 1) * perPage + 1
    const to = total === 0 ? 0 : (page - 1) * perPage + data.length

    const pagination: PaginationMeta = {
      total,
      per_page: perPage,
      current_page: page,
      last_page: lastPage,
      from,
      to
    }

    return {
      data,
      pagination
    }
  }
}
