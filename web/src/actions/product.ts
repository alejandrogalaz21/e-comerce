import type { IPaginatedResponse } from 'src/types/common';
import type {
  ApiProduct,
  IProductItem,
  IImportResult,
  IProductPayload,
  IProductListParams,
} from 'src/types/product';

import axiosInstance, { endpoints } from 'src/lib/axios';

import { toProductItem } from './product.mapper';

// ----------------------------------------------------------------------

export async function getProducts(
  params: IProductListParams
): Promise<IPaginatedResponse<IProductItem>> {
  const res = await axiosInstance.get<IPaginatedResponse<ApiProduct>>(endpoints.product.list, {
    params,
  });
  return { data: res.data.data.map(toProductItem), pagination: res.data.pagination };
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
  return res.data;
}
