/**
 * Interfaz para la respuesta paginada estándar del servidor.
 * Úsala para asegurar consistencia en los endpoints que devuelven datos paginados.
 */
export interface PaginationMeta {
  /** Total de elementos en la colección */
  total: number
  /** Elementos por página */
  per_page: number
  /** Página actual */
  current_page: number
  /** Última página */
  last_page: number
  /** Índice del primer elemento en esta página */
  from: number
  /** Índice del último elemento en esta página */
  to: number
}

/**
 * Respuesta estándar para endpoints paginados.
 * @template T Tipo de los elementos paginados
 */
export interface PaginationResponse<T> {
  /** Los elementos paginados */
  data: T[]
  /** Metadatos de la paginación */
  pagination: PaginationMeta
}

/**
 * Clase utilitaria para construir respuestas paginadas consistentes.
 */
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
    return {
      data,
      pagination: {
        total,
        per_page: perPage,
        current_page: page,
        last_page: lastPage,
        from,
        to
      }
    }
  }
}
