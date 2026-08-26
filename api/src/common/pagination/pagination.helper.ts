import { PaginationDTO } from '../dto/pagination.dto'

/**
 * Interfaz para parámetros de paginación parseados
 */
export interface ParsedPaginationParams {
  page: number
  limit: number
  offset: number
}

/**
 * Helper para parsear y calcular parámetros de paginación
 */
export class PaginationHelper {
  /**
   * Parsea los parámetros de paginación desde el DTO
   * @param paginationDto - DTO con parámetros de paginación
   * @returns Objeto con parámetros parseados y calculados
   */
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
