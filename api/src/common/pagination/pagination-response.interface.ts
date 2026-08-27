export interface PaginationMeta {
  total: number
  per_page: number
  current_page: number
  last_page: number
  from: number
  to: number
}

export interface PaginationResponse<T> {
  data: T[]
  pagination: PaginationMeta
}
