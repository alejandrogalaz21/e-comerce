export const IMPORT_RESULT_EXAMPLE = {
  batchId: '0d6cd087-3f2e-4f30-b0aa-cf9c93b1c0d5',
  summary: {
    totalRows: 97,
    inserted: 85,
    updated: 0,
    unchanged: 0,
    rejected: 10,
    skippedEmpty: 2
  },
  rejected: [
    {
      line: 7,
      sku: 'YM-015',
      errors: ["price is not a valid number: 'free'"]
    },
    {
      line: 16,
      sku: 'DL-007',
      errors: ['stock must not be less than 0']
    },
    {
      line: 36,
      sku: 'RS-001',
      errors: [
        'duplicate sku in the file (lines 2, 36) with conflicting data — a sku must appear at most once per import'
      ]
    }
  ],
  warnings: [
    {
      line: 12,
      sku: 'CB-010',
      message: 'sku already exists with different data — updated'
    }
  ],
  created: [
    { line: 2, sku: 'RS-001', name: 'Running Shoes' },
    { line: 3, sku: 'WM-042', name: 'Wireless Mouse' }
  ]
}
