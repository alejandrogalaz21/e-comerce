import type { PlacePurchaseError } from 'src/actions/purchase';
import type { IPurchase, IPurchaseListParams, IPlacePurchasePayload } from 'src/types/purchase';

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';

import { getPurchase, getPurchases, placePurchase } from 'src/actions/purchase';

import { productKeys } from 'src/sections/product/hooks/use-product';

// ----------------------------------------------------------------------

export const purchaseKeys = {
  all: ['purchases'] as const,
  lists: () => [...purchaseKeys.all, 'list'] as const,
  list: (params: IPurchaseListParams) => [...purchaseKeys.lists(), params] as const,
  detail: (id: string) => [...purchaseKeys.all, 'detail', id] as const,
};

// ----------------------------------------------------------------------

export function useGetPurchases(params: IPurchaseListParams) {
  const query = useQuery({
    queryKey: purchaseKeys.list(params),
    queryFn: () => getPurchases(params),
    placeholderData: keepPreviousData,
  });

  const purchases = query.data?.purchases ?? [];

  return {
    purchases,
    pagination: query.data?.pagination,
    purchasesLoading: query.isLoading,
    purchasesError: query.error,
    purchasesValidating: query.isFetching,
    purchasesEmpty: !query.isLoading && !query.error && !purchases.length,
    refetchPurchases: query.refetch,
  };
}

export function useGetPurchase(purchaseId: string) {
  const query = useQuery({
    queryKey: purchaseKeys.detail(purchaseId),
    queryFn: () => getPurchase(purchaseId),
    enabled: !!purchaseId,
    retry: false,
  });

  return {
    purchase: query.data,
    purchaseLoading: query.isLoading,
    purchaseError: query.error,
  };
}

// ----------------------------------------------------------------------

export function usePlacePurchase() {
  const queryClient = useQueryClient();

  return useMutation<IPurchase, PlacePurchaseError, IPlacePurchasePayload>({
    mutationFn: placePurchase,
    onSuccess: () => {
      // Stock just changed for what was bought, so anything showing it is stale.
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      queryClient.invalidateQueries({ queryKey: purchaseKeys.lists() });
    },
  });
}
