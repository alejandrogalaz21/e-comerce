import { PaginationDTO } from '../dto/pagination.dto'

export interface ParsedPaginationParams {
  page: number
  limit: number
  offset: number
}

export class PaginationHelper {
  static parse(paginationDto?: PaginationDTO): ParsedPaginationParams {
    const page = Number(paginationDto?.page) || 1
    const limit = Number(paginationDto?.limit) || 10
    const offset = (page - 1) * limit

    return {
      page,
      limit,
      offset
    }
  }
}
