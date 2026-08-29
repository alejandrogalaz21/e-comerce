import type { PlacePurchaseError } from 'src/actions/purchase';
import type { IPurchase, IPlacePurchasePayload } from 'src/types/purchase';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { placePurchase } from 'src/actions/purchase';

import { productKeys } from 'src/sections/product/hooks/use-product';

// ----------------------------------------------------------------------

export const purchaseKeys = {
  all: ['purchases'] as const,
  lists: () => [...purchaseKeys.all, 'list'] as const,
  detail: (id: string) => [...purchaseKeys.all, 'detail', id] as const,
};

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
