import { describe, it, expect } from 'vitest';

import { formatImportSummary } from './import-utils';

describe('formatImportSummary', () => {
  it('summarizes created, updated and rejected counts', () => {
    expect(
      formatImportSummary({
        totalRows: 96,
        inserted: 80,
        updated: 4,
        unchanged: 1,
        rejected: 9,
        skippedEmpty: 2,
      })
    ).toBe('Imported: 80 created, 4 updated, 9 rejected');
  });

  it('handles an all-zero summary', () => {
    expect(
      formatImportSummary({
        totalRows: 0,
        inserted: 0,
        updated: 0,
        unchanged: 0,
        rejected: 0,
        skippedEmpty: 0,
      })
    ).toBe('Imported: 0 created, 0 updated, 0 rejected');
  });
});
