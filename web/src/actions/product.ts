import type { IPaginatedResponse } from 'src/types/common';
import type {
  ApiProduct,
  IProductItem,
  IImportBatch,
  IImportResult,
  IProductPayload,
  IProductCategory,
  IImportBatchDetail,
  IProductListParams,
  IImportBatchListParams,
} from 'src/types/product';

import axiosInstance, { endpoints } from 'src/lib/axios';

import { toImportBatch, toProductItem, toImportResult, toImportBatchDetail } from './product.mapper';

// ----------------------------------------------------------------------

export async function getProducts(
  params: IProductListParams
): Promise<IPaginatedResponse<IProductItem>> {
  const { page, limit, q, category, minPrice, maxPrice, inStock, sortBy, sortDir } = params;

  const res = await axiosInstance.get<IPaginatedResponse<ApiProduct>>(endpoints.product.list, {
    params: {
      page,
      limit,
      ...(q?.trim() ? { q: q.trim() } : {}),
      ...(category?.length ? { category: category.join(',') } : {}),
      ...(minPrice !== undefined ? { minPrice } : {}),
      ...(maxPrice !== undefined ? { maxPrice } : {}),
      ...(inStock !== undefined ? { inStock } : {}),
      ...(sortBy ? { sortBy } : {}),
      ...(sortDir ? { sortDir } : {}),
    },
  });
  return { data: res.data.data.map(toProductItem), pagination: res.data.pagination };
}

export async function getProductCategories(): Promise<IProductCategory[]> {
  const res = await axiosInstance.get<IProductCategory[]>(endpoints.product.categories);
  return res.data;
}

export async function getProduct(productId: string): Promise<IProductItem> {
  const res = await axiosInstance.get<ApiProduct>(endpoints.product.details(productId));
  return toProductItem(res.data);
}

export async function createProduct(payload: IProductPayload): Promise<IProductItem> {
  const res = await axiosInstance.post<ApiProduct>(endpoints.product.create, payload);
  return toProductItem(res.data);
}

export async function updateProduct(
  productId: string,
  payload: IProductPayload
): Promise<IProductItem> {
  const res = await axiosInstance.patch<ApiProduct>(endpoints.product.update(productId), payload);
  return toProductItem(res.data);
}

export async function deleteProduct(productId: string): Promise<void> {
  await axiosInstance.delete(endpoints.product.delete(productId));
}

export async function importProductsCsv(file: File): Promise<IImportResult> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await axiosInstance.post<IImportResult>(endpoints.product.import, formData);
  return toImportResult(res.data);
}

export async function getImportBatches(
  params: IImportBatchListParams
): Promise<IPaginatedResponse<IImportBatch>> {
  const { page, limit, q } = params;

  const res = await axiosInstance.get<IPaginatedResponse<IImportBatch>>(
    endpoints.product.batches.list,
    { params: { page, limit, ...(q?.trim() ? { q: q.trim() } : {}) } }
  );
  return { data: res.data.data.map(toImportBatch), pagination: res.data.pagination };
}

export async function getImportBatch(batchId: string): Promise<IImportBatchDetail> {
  const res = await axiosInstance.get<IImportBatchDetail>(
    endpoints.product.batches.details(batchId)
  );
  return toImportBatchDetail(res.data);
}
