import type {
  IProductResponse,
  IProductsResponse,
  IProductSearchResponse,
} from 'src/types/product';

import axiosInstance, { endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------

export async function getProducts(): Promise<IProductsResponse> {
  const res = await axiosInstance.get<IProductsResponse>(endpoints.product.list);
  return res.data;
}

export async function getProduct(productId: string): Promise<IProductResponse> {
  const res = await axiosInstance.get<IProductResponse>(endpoints.product.details, {
    params: { productId },
  });
  return res.data;
}

export async function searchProducts(query: string): Promise<IProductSearchResponse> {
  const res = await axiosInstance.get<IProductSearchResponse>(endpoints.product.search, {
    params: { query },
  });
  return res.data;
}
