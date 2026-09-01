import type { IImportBatchListParams } from 'src/types/product';

import { useQuery, keepPreviousData } from '@tanstack/react-query';

import { getImportBatch, getImportBatches } from 'src/actions/product';

export const importBatchKeys = {
  all: ['import-batches'] as const,
  lists: () => [...importBatchKeys.all, 'list'] as const,
  list: (params: IImportBatchListParams) => [...importBatchKeys.lists(), params] as const,
  detail: (id: string) => [...importBatchKeys.all, 'detail', id] as const,
};

export function useGetImportBatches(params: IImportBatchListParams) {
  const query = useQuery({
    queryKey: importBatchKeys.list(params),
    queryFn: () => getImportBatches(params),
    placeholderData: keepPreviousData,
  });

  const batches = query.data?.data ?? [];

  return {
    batches,
    pagination: query.data?.pagination,
    batchesLoading: query.isLoading,
    batchesError: query.error,
    batchesValidating: query.isFetching,
    batchesEmpty: !query.isLoading && !batches.length,
  };
}

export function useGetImportBatch(batchId: string) {
  const query = useQuery({
    queryKey: importBatchKeys.detail(batchId),
    queryFn: () => getImportBatch(batchId),
    enabled: !!batchId,
  });

  return {
    batch: query.data,
    batchLoading: query.isLoading,
    batchError: query.error,
    batchValidating: query.isFetching,
  };
}
