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
  { label: string; color: 'error' | 'warning'; icon: string }
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
};

export function toImportIssueRows(report: Pick<IImportReport, 'rejected' | 'warnings'>) {
  const rows: IImportIssueRow[] = [
    ...report.rejected.map((row) => ({
      line: row.line,
      sku: row.sku,
      severity: 'rejected' as const,
      message: row.errors.join(', '),
    })),
    ...report.warnings.map((row) => ({
      line: row.line,
      sku: row.sku,
      severity: 'updated' as const,
      message: row.message,
    })),
  ];

  return rows.sort((a, b) => a.line - b.line);
}
