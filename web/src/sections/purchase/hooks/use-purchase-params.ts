import { useMemo, useCallback } from 'react';

import { useRouter, usePathname, useSearchParams } from 'src/routes/hooks';

import { parsePurchaseFilters, serializePurchaseFilters } from '../purchase-params';

import type { IPurchaseFilters } from '../purchase-params';

/**
 * The address is the state, the same way the product list and the shop work:
 * back navigates filters, and a filtered view can be shared as a link.
 */
export function usePurchaseParams() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const state = useMemo(() => parsePurchaseFilters(searchParams), [searchParams]);

  const navigateTo = useCallback(
    (next: IPurchaseFilters) => {
      const query = serializePurchaseFilters(next).toString();

      router.push(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router]
  );

  const apply = useCallback(
    (changes: Partial<IPurchaseFilters>) => {
      const next = { ...state, ...changes };

      // Anything but paging returns to page one: page 5 of a new result set is
      // usually empty.
      if (!('page' in changes)) next.page = 1;

      navigateTo(next);
    },
    [state, navigateTo]
  );

  const reset = useCallback(
    () => navigateTo({ ...state, page: 1, q: '', status: '', dateFrom: '', dateTo: '' }),
    [state, navigateTo]
  );

  return { state, apply, reset };
}
