/**
 * Interfaz para los metadatos de paginación.
 */
export interface PaginationMeta {
  total: number
  per_page: number
  current_page: number
  last_page: number
  from: number
  to: number
}

/**
 * Interfaz genérica para la respuesta paginada.
 */
export interface PaginationResponse<T> {
  data: T[]
  pagination: PaginationMeta
}
