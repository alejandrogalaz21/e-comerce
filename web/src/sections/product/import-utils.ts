import type { LabelColor } from 'src/components/label';
import type {
  IImportReport,
  IImportSummary,
  IImportIssueRow,
  IImportBatchStatus,
  IImportIssueSeverity,
} from 'src/types/product';

// ----------------------------------------------------------------------

export function formatImportSummary(summary: IImportSummary): string {
  return `Imported: ${summary.inserted} created, ${summary.updated} updated, ${summary.rejected} rejected`;
}

export function importStatusColor(status: IImportBatchStatus): LabelColor {
  switch (status) {
    case 'completed':
      return 'success';
    case 'processing':
      return 'warning';
    case 'failed':
      return 'error';
    default:
      return 'default';
  }
}

export const IMPORT_ISSUE_META: Record<
  IImportIssueSeverity,
  { label: string; color: 'error' | 'warning' | 'info'; icon: string }
> = {
  rejected: {
    label: 'Rejected row',
    color: 'error',
    icon: 'solar:close-circle-bold-duotone',
  },
  updated: {
    label: 'Updated row',
    color: 'warning',
    icon: 'solar:refresh-circle-bold-duotone',
  },
  skipped: {
    label: 'Skipped row',
    color: 'info',
    icon: 'solar:minus-circle-bold-duotone',
  },
};

export function toImportIssueRows(
  report: Pick<IImportReport, 'rejected' | 'warnings' | 'skipped'>
) {
  const rows: IImportIssueRow[] = [
    ...report.rejected.map((row) => ({
      line: row.line,
      sku: row.sku,
      name: row.name,
      severity: 'rejected' as const,
      message: row.errors.join(', '),
    })),
    ...report.warnings.map((row) => ({
      line: row.line,
      sku: row.sku,
      name: row.name,
      severity: 'updated' as const,
      message: row.message,
    })),
    ...(report.skipped ?? []).map((row) => ({
      line: row.line,
      severity: 'skipped' as const,
      message: 'blank row, nothing to import',
    })),
  ];

  return rows.sort((a, b) => a.line - b.line);
}
