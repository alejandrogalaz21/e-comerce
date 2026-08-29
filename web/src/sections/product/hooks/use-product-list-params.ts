import { useMemo, useCallback } from 'react';

import { useRouter, usePathname, useSearchParams } from 'src/routes/hooks';

import {
  DEFAULT_PAGE,
  parseProductListState,
  defaultProductListState,
  serializeProductListState,
} from '../product-list-params';

import type { IProductListState } from '../product-list-params';

// ----------------------------------------------------------------------

type ApplyOptions = {
  replace?: boolean;
};

export function useProductListParams() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const state = useMemo(() => parseProductListState(searchParams), [searchParams]);

  const navigateTo = useCallback(
    (next: IProductListState, options?: ApplyOptions) => {
      const query = serializeProductListState(next).toString();
      const href = query ? `${pathname}?${query}` : pathname;

      if (options?.replace) {
        router.replace(href);
      } else {
        router.push(href);
      }
    },
    [pathname, router]
  );

  const apply = useCallback(
    (changes: Partial<IProductListState>, options?: ApplyOptions) => {
      const next = { ...state, ...changes };

      if (!('page' in changes)) {
        next.page = DEFAULT_PAGE;
      }

      navigateTo(next, options);
    },
    [state, navigateTo]
  );

  const reset = useCallback(() => {
    navigateTo({ ...defaultProductListState, limit: state.limit });
  }, [navigateTo, state.limit]);

  return { state, apply, reset };
}
