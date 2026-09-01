import type { LabelColor } from 'src/components/label';
import type {
  IImportReport,
  IImportSummary,
  IImportIssueRow,
  IImportBatchStatus,
} from 'src/types/product';

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

type ImportStatusMeta = {
  label: string;
  hint: string;
  color: LabelColor;
  icon: string;
};

export const IMPORT_STATUS_META = {
  total: {
    label: 'Total rows',
    hint: 'Data rows found in the file, header excluded',
    color: 'default',
    icon: 'solar:documents-bold-duotone',
  },
  created: {
    label: 'Created row',
    hint: 'New products inserted into the catalog',
    color: 'success',
    icon: 'solar:add-circle-bold-duotone',
  },
  updated: {
    label: 'Updated row',
    hint: 'The SKU already existed and its data was overwritten',
    color: 'warning',
    icon: 'solar:refresh-circle-bold-duotone',
  },
  unchanged: {
    label: 'Unchanged row',
    hint: 'SKUs already stored with identical data',
    color: 'default',
    icon: 'solar:check-circle-bold-duotone',
  },
  rejected: {
    label: 'Rejected row',
    hint: 'Failed validation, nothing was saved',
    color: 'error',
    icon: 'solar:close-circle-bold-duotone',
  },
  skipped: {
    label: 'Skipped row',
    hint: 'The row was entirely blank',
    color: 'info',
    icon: 'solar:minus-circle-bold-duotone',
  },
} as const satisfies Record<string, ImportStatusMeta>;

export type IImportStatus = keyof typeof IMPORT_STATUS_META;

const STATUS_TEXT_COLOR: Record<LabelColor, string> = {
  default: 'text.secondary',
  primary: 'primary.main',
  secondary: 'secondary.main',
  info: 'info.main',
  success: 'success.main',
  warning: 'warning.main',
  error: 'error.main',
};

export function importStatusTextColor(status: IImportStatus): string {
  return STATUS_TEXT_COLOR[IMPORT_STATUS_META[status].color];
}

export const IMPORT_ISSUE_STATUSES = ['rejected', 'updated', 'skipped'] as const;

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
