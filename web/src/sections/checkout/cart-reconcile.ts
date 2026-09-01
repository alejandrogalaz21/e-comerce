import type { IProductItem } from 'src/types/product';
import type { ICheckoutItem } from 'src/types/checkout';

/**
 * What the catalog answered for one line. A product that is gone is not a failed
 * lookup: the API says so with a 404, and confusing it with an unreachable
 * network would empty carts over a dropped connection.
 */
export type CartLookup =
  | { status: 'found'; product: IProductItem }
  | { status: 'gone' }
  | { status: 'unverified' };

export type CartChangeKind = 'price' | 'quantity' | 'renamed' | 'unavailable';

export type CartLineChange = {
  id: string;
  name: string;
  kinds: CartChangeKind[];
};

export type CartReconciliation = {
  items: ICheckoutItem[];
  changes: CartLineChange[];
  unverified: boolean;
};

/**
 * Brings the cart back in line with the catalog.
 *
 * The cart is a memory, not a reservation: it keeps the price and the stock that
 * were true when each product was added. The order is priced by the server from
 * the catalog, so a stale line does not produce a wrong charge — it produces a
 * screen that disagrees with the charge, which is what this repairs.
 *
 * What changes the deal (price, a quantity that no longer fits, a product that is
 * gone) is recorded as a difference the line can show. A rename is adopted the
 * same way but is not a warning: the order copies the name from the catalog when
 * it is placed, never from the cart.
 */
export function reconcileCart(
  items: ICheckoutItem[],
  lookups: Record<string, CartLookup>
): CartReconciliation {
  const changes: CartLineChange[] = [];
  let unverified = false;

  const reconciled = items.map((item) => {
    const lookup = lookups[item.id] ?? { status: 'unverified' as const };

    if (lookup.status === 'unverified') {
      unverified = true;
      return item;
    }

    if (lookup.status === 'gone') {
      if (item.unavailable) return item;

      changes.push({ id: item.id, name: item.name, kinds: ['unavailable'] });
      return { ...item, unavailable: true };
    }

    const { product } = lookup;
    const kinds: CartChangeKind[] = [];

    const next: ICheckoutItem = {
      ...item,
      sku: product.sku,
      name: product.name,
      price: product.price,
      stock: product.stock,
      unavailable: false,
    };

    if (product.price !== item.price) {
      kinds.push('price');
      // The price it was added at, not the one it had a moment ago: a product
      // repriced twice is still being compared against what the visitor accepted.
      next.addedPrice = item.addedPrice ?? item.price;
    }

    if (product.name !== item.name) {
      kinds.push('renamed');
      next.addedName = item.addedName ?? item.name;
    }

    if (product.stock < item.quantity) {
      kinds.push('quantity');
      next.adjustedFrom = item.adjustedFrom ?? item.quantity;
      next.quantity = product.stock;
    }

    if (kinds.length) {
      changes.push({ id: item.id, name: product.name, kinds });
    }

    return next;
  });

  return { items: reconciled, changes, unverified };
}

/** A line the catalog no longer has cannot be bought, so it cannot be charged either. */
export function isPurchasable(item: ICheckoutItem): boolean {
  return !item.unavailable && item.quantity > 0;
}

/** True while the line still carries a difference worth showing to the visitor. */
export function hasCartDifference(item: ICheckoutItem): boolean {
  return (
    item.addedPrice !== undefined ||
    item.addedName !== undefined ||
    item.adjustedFrom !== undefined ||
    item.unavailable === true
  );
}

/** Drops the marks once the visitor has seen them and decided to continue. */
export function clearCartDifferences(items: ICheckoutItem[]): ICheckoutItem[] {
  return items.map(({ addedPrice, addedName, adjustedFrom, ...item }) => item);
}
