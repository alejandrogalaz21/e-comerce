export interface ImportRejectedRow {
  line: number
  /** Raw value from the file. Empty string means the cell was blank, never that it was not sent. */
  sku: string
  /** Raw value from the file: for a row rejected because of its name, this is the offending value. */
  name: string
  errors: string[]
}

export interface ImportWarning {
  line: number
  /** Raw value from the file. Empty string means the cell was blank, never that it was not sent. */
  sku: string
  name: string
  message: string
}

/** A fully blank row. It has no sku or name to report, only where it was. */
export interface ImportSkippedRow {
  line: number
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
  skipped: ImportSkippedRow[]
}

export interface ImportResult {
  batchId: string
  summary: ImportSummary
  rejected: ImportRejectedRow[]
  warnings: ImportWarning[]
  created: ImportCreatedRow[]
  skipped: ImportSkippedRow[]
}
