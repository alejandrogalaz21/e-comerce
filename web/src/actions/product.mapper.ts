import type {
  ApiProduct,
  IProductItem,
  IImportBatch,
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
export function toImportBatch<T extends IImportBatch | IImportBatchDetail>(dto: T): T {
  return { ...dto, importedBy: dto.importedBy ?? null };
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
