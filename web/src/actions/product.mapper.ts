import type {
  ApiProduct,
  IProductItem,
  IImportBatch,
  IImportReport,
  IImportResult,
  IProductPayload,
  IProductFormValues,
  IImportBatchDetail,
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
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

/** Batches created before import attribution existed carry no `importedBy`. */
export function toImportBatch(dto: IImportBatch): IImportBatch {
  return { ...dto, importedBy: dto.importedBy ?? null };
}

/** Batches stored before a report section existed carry it as null or partial. */
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
