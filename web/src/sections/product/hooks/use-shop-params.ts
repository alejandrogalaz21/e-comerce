import { useMemo, useCallback } from 'react';

import { useRouter, usePathname, useSearchParams } from 'src/routes/hooks';

import { parseShopState, serializeShopState } from '../shop-params';

import type { IShopState } from '../shop-params';

/**
 * The same pattern the dashboard uses: the address is the state, so back works
 * and a filtered link can be shared.
 */
export function useShopParams() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const state = useMemo(() => parseShopState(searchParams), [searchParams]);

  const navigateTo = useCallback(
    (next: IShopState) => {
      const query = serializeShopState(next).toString();

      router.push(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router]
  );

  const apply = useCallback(
    (changes: Partial<IShopState>) => {
      // Anything but paging returns to page one: page 5 of a new result set is
      // usually empty.
      const next = { ...state, ...changes };

      if (!('page' in changes)) next.page = 1;

      navigateTo(next);
    },
    [state, navigateTo]
  );

  return { state, apply };
}
