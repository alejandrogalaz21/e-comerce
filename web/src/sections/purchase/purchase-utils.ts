import type { IPurchase, IPurchaseItem, IPaymentMethod } from 'src/types/purchase';

export function countItems(purchase: Pick<IPurchase, 'items'>): number {
  return purchase.items.reduce((total, item) => total + item.quantity, 0);
}

export function sumSubtotals(items: IPurchaseItem[]): number {
  return items.reduce((total, item) => total + item.subtotal, 0);
}

/**
 * The frozen price is the order's own data and always renders. The catalog price
 * is a second, optional read: when it is missing or failed, the row says nothing
 * rather than claiming the price is unchanged.
 */
export function priceComparison(unitPrice: number, currentPrice: number | undefined | null) {
  if (currentPrice === undefined || currentPrice === null) {
    return { changed: false as const, currentPrice: undefined };
  }

  return { changed: currentPrice !== unitPrice, currentPrice };
}

export function shortId(id: string): string {
  return id.slice(0, 8);
}

/** How the buyer paid, as a person would say it rather than as the API stores it. */
export function paymentMethodLabel(method: IPaymentMethod): string {
  return method === 'paypal' ? 'PayPal' : 'Credit / Debit card';
}
