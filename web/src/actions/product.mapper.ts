import type { ApiProduct, IProductItem, IProductPayload, IProductFormValues } from 'src/types/product';

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
