import type {
  ApiProduct,
  IProductItem,
  IImportBatch,
  IImportReport,
  IImportResult,
  IProductPayload,
  IProductFormValues,
  IImportBatchDetail,
  IProductHistoryEntry,
  ApiProductHistoryEntry,
} from 'src/types/product';

export function toProductItem(dto: ApiProduct): IProductItem {
  return {
    id: dto.id,
    sku: dto.sku,
    name: dto.name,
    description: dto.description ?? '',
    category: dto.category,
    price: Number(dto.price),
    stock: dto.stock,
    weightKg: dto.weightKg === null ? null : Number(dto.weightKg),
    discontinuedAt: dto.discontinuedAt ?? null,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function toImportBatch(dto: IImportBatch): IImportBatch {
  return { ...dto, importedBy: dto.importedBy ?? null };
}

export function toImportReport(report: Partial<IImportReport> | null | undefined): IImportReport {
  return {
    rejected: report?.rejected ?? [],
    warnings: report?.warnings ?? [],
    created: report?.created ?? [],
    skipped: report?.skipped ?? [],
  };
}

export function toImportBatchDetail(dto: IImportBatchDetail): IImportBatchDetail {
  return { ...toImportBatch(dto), report: toImportReport(dto.report) };
}

export function toImportResult(dto: IImportResult): IImportResult {
  return { batchId: dto.batchId, summary: dto.summary, ...toImportReport(dto) };
}

export function toApiPayload(values: IProductFormValues): IProductPayload {
  const description = values.description.trim();
  const category = values.category.trim();
  const weightKg = values.weightKg.trim();

  return {
    sku: values.sku.trim(),
    name: values.name.trim(),
    ...(description && { description }),
    ...(category && { category }),
    price: values.price,
    stock: values.stock,
    ...(weightKg !== '' && { weightKg: Number(weightKg) }),
  };
}

/**
 * A history entry carries the whole row before and after. The screen only needs
 * what moved, and it needs it as "from -> to": "the price changed" does not
 * answer the question that brings somebody to a history in the first place.
 */
export function toProductHistoryEntry(dto: ApiProductHistoryEntry): IProductHistoryEntry {
  return {
    id: dto.id,
    operation: dto.operation,
    changedAt: dto.changedAt,
    changes: dto.changedFields.map((field) => ({
      field,
      from: readField(dto.oldData, field),
      to: readField(dto.newData, field),
    })),
  };
}

function readField(data: Record<string, unknown> | null, field: string): string | null {
  const value = data?.[field];

  if (value === undefined || value === null) return null;

  return String(value);
}
