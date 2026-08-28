export interface ImportRejectedRow {
  line: number
  sku?: string
  errors: string[]
}

export interface ImportWarning {
  line: number
  sku: string
  message: string
}

export interface ImportCreatedRow {
  line: number
  sku: string
  name: string
  description: string | null
  category: string
  price: string
  stock: number
  weightKg: string | null
}

export interface ImportSummary {
  totalRows: number
  inserted: number
  updated: number
  unchanged: number
  rejected: number
  skippedEmpty: number
}

export interface ImportBatchReport {
  rejected: ImportRejectedRow[]
  warnings: ImportWarning[]
  created: ImportCreatedRow[]
}

export interface ImportResult {
  batchId: string
  summary: ImportSummary
  rejected: ImportRejectedRow[]
  warnings: ImportWarning[]
  created: ImportCreatedRow[]
}
