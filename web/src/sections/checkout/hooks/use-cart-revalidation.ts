import { useMemo, useEffect } from 'react';
import { useQueries } from '@tanstack/react-query';

import { getProduct } from 'src/actions/product';

import { productKeys } from 'src/sections/product/hooks/use-product';

import { useCheckoutContext } from '../context';
import { reconcileCart } from '../cart-reconcile';

import type { CartLookup } from '../cart-reconcile';

export function useCartRevalidation(enabled: boolean = true) {
  const checkout = useCheckoutContext();

  const ids = useMemo(() => checkout.items.map((item) => item.id), [checkout.items]);

  const queries = useQueries({
    queries: ids.map((id) => ({
      queryKey: productKeys.detail(id),
      queryFn: () => getProduct(id),
      enabled,
      staleTime: 0,
      retry: false,
    })),
  });

  const settled = enabled && queries.length > 0 && queries.every((query) => !query.isPending);

  const lookups = useMemo(() => {
    if (!settled) return {};

    return ids.reduce<Record<string, CartLookup>>((acc, id, index) => {
      acc[id] = toLookup(queries[index]);
      return acc;
    }, {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, settled, queries.map((query) => query.dataUpdatedAt + String(query.isError)).join('|')]);

  const reconciliation = useMemo(
    () => reconcileCart(checkout.items, lookups),
    [checkout.items, lookups]
  );

  const { items } = reconciliation;

  useEffect(() => {
    if (!settled) return;
    if (JSON.stringify(items) === JSON.stringify(checkout.items)) return;

    checkout.onUpdate({ items });
  }, [settled, items, checkout]);

  return {
    changes: reconciliation.changes,
    unverified: settled && reconciliation.unverified,
    validating: enabled && queries.some((query) => query.isFetching),
  };
}

export function toLookup(query: {
  data?: unknown;
  error: unknown;
  isError: boolean;
}): CartLookup {
  if (query.isError) {
    return statusOf(query.error) === 404 ? { status: 'gone' } : { status: 'unverified' };
  }

  if (query.data) return { status: 'found', product: query.data as never };

  return { status: 'unverified' };
}

function statusOf(error: unknown): number | undefined {
  if (error && typeof error === 'object' && 'statusCode' in error) {
    const { statusCode } = error as { statusCode: unknown };
    return typeof statusCode === 'number' ? statusCode : undefined;
  }

  return undefined;
}
