import { useMemo, useCallback } from 'react';

import { useRouter, usePathname, useSearchParams } from 'src/routes/hooks';

import { parseShopState, serializeShopState } from '../shop-params';

import type { IShopState } from '../shop-params';

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
      const next = { ...state, ...changes };

      if (!('page' in changes)) next.page = 1;

      navigateTo(next);
    },
    [state, navigateTo]
  );

  return { state, apply };
}
