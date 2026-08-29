import type { IImportStatus } from './import-utils';

import { describe, it, expect } from 'vitest';

import {
  IMPORT_STATUS_META,
  importStatusColor,
  toImportIssueRows,
  formatImportSummary,
  IMPORT_ISSUE_STATUSES,
  importStatusTextColor,
} from './import-utils';

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

describe('IMPORT_STATUS_META', () => {
  const statuses = Object.keys(IMPORT_STATUS_META) as IImportStatus[];

  it('describes every status with a label, a hint, a color and an icon', () => {
    statuses.forEach((status) => {
      const meta = IMPORT_STATUS_META[status];

      expect(meta.label).toBeTruthy();
      expect(meta.hint).toBeTruthy();
      expect(meta.color).toBeTruthy();
      expect(meta.icon).toBeTruthy();
    });
  });

  it('gives each status its own icon, so two statuses never look alike', () => {
    const icons = statuses.map((status) => IMPORT_STATUS_META[status].icon);

    expect(new Set(icons).size).toBe(icons.length);
  });

  it('covers every status the review table can show', () => {
    IMPORT_ISSUE_STATUSES.forEach((status) => {
      expect(IMPORT_STATUS_META[status]).toBeDefined();
    });
  });

  it('resolves a text color for every status', () => {
    statuses.forEach((status) => {
      expect(importStatusTextColor(status)).toMatch(/\./);
    });
  });
});

describe('toImportIssueRows', () => {
  const report = {
    rejected: [
      {
        line: 16,
        sku: 'DL-007',
        name: 'Desk Lamp',
        errors: ['stock must not be less than 0'],
      },
      { line: 25, errors: ['name should not be empty'] },
    ],
    warnings: [
      {
        line: 7,
        sku: 'RS-001',
        name: 'Running Shoes',
        message: 'sku already exists with different data — updated',
      },
    ],
    skipped: [{ line: 3 }, { line: 30 }],
  };

  it('merges rejected, warning and skipped rows ordered by line', () => {
    expect(toImportIssueRows(report).map((row) => row.line)).toEqual([3, 7, 16, 25, 30]);
  });

  it('tags each row with its severity and joins rejection errors', () => {
    const rows = toImportIssueRows(report);

    expect(rows[0]).toEqual({
      line: 3,
      severity: 'skipped',
      message: 'blank row, nothing to import',
    });
    expect(rows[1]).toEqual({
      line: 7,
      sku: 'RS-001',
      name: 'Running Shoes',
      severity: 'updated',
      message: 'sku already exists with different data — updated',
    });
    expect(rows[2]).toEqual({
      line: 16,
      sku: 'DL-007',
      name: 'Desk Lamp',
      severity: 'rejected',
      message: 'stock must not be less than 0',
    });
    expect(rows[3].sku).toBeUndefined();
    expect(rows[3].name).toBeUndefined();
  });

  it('returns an empty list when there is nothing to report', () => {
    expect(toImportIssueRows({ rejected: [], warnings: [], skipped: [] })).toEqual([]);
  });

  it('tolerates a batch stored before skipped lines were recorded', () => {
    expect(toImportIssueRows({ rejected: [], warnings: [] })).toEqual([]);
  });
});
