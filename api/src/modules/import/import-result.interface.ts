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
}

export interface ImportResult {
  batchId: string
  summary: ImportSummary
  rejected: ImportRejectedRow[]
  warnings: ImportWarning[]
}
