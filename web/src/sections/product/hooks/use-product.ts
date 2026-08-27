import type { IProductPayload, IProductListParams } from 'src/types/product';

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';

import {
  getProduct,
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  importProductsCsv,
} from 'src/actions/product';

import { toast } from 'src/components/snackbar';

import { formatImportSummary } from '../import-utils';

// ----------------------------------------------------------------------

export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (params: IProductListParams) => [...productKeys.lists(), params] as const,
  detail: (id: string) => [...productKeys.all, 'detail', id] as const,
};

// ----------------------------------------------------------------------

export function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    const { message } = error as { message: string | string[] };
    return Array.isArray(message) ? message.join(', ') : message;
  }
  return 'Something went wrong!';
}

// ----------------------------------------------------------------------

export function useGetProducts(params: IProductListParams) {
  const query = useQuery({
    queryKey: productKeys.list(params),
    queryFn: () => getProducts(params),
    placeholderData: keepPreviousData,
  });

  const products = query.data?.data ?? [];

  return {
    products,
    pagination: query.data?.pagination,
    productsLoading: query.isLoading,
    productsError: query.error,
    productsValidating: query.isFetching,
    productsEmpty: !query.isLoading && !products.length,
  };
}

export function useGetProduct(productId: string) {
  const query = useQuery({
    queryKey: productKeys.detail(productId),
    queryFn: () => getProduct(productId),
    enabled: !!productId,
  });

  return {
    product: query.data,
    productLoading: query.isLoading,
    productError: query.error,
    productValidating: query.isFetching,
  };
}

// ----------------------------------------------------------------------

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: IProductPayload) => createProduct(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      toast.success('Product created');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: IProductPayload }) =>
      updateProduct(id, payload),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      queryClient.invalidateQueries({ queryKey: productKeys.detail(id) });
      toast.success('Product updated');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useImportProducts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => importProductsCsv(file),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      toast.success(formatImportSummary(result.summary));
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      toast.success('Product deleted');
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
