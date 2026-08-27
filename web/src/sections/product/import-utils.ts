import type { IImportSummary } from 'src/types/product';

// ----------------------------------------------------------------------

export function formatImportSummary(summary: IImportSummary): string {
  return `Imported: ${summary.inserted} created, ${summary.updated} updated, ${summary.rejected} rejected`;
}
