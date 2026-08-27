import { describe, it, expect } from 'vitest';

import { formatImportSummary, importStatusColor } from './import-utils';

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

describe('importStatusColor', () => {
  it('maps completed to success', () => {
    expect(importStatusColor('completed')).toBe('success');
  });

  it('maps processing to warning', () => {
    expect(importStatusColor('processing')).toBe('warning');
  });

  it('maps failed to error', () => {
    expect(importStatusColor('failed')).toBe('error');
  });
});
