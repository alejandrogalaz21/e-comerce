import type { LabelColor } from 'src/components/label';
import type { IImportSummary, IImportBatchStatus } from 'src/types/product';

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
