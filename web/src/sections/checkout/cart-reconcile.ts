import type { IProductItem } from 'src/types/product';
import type { ICheckoutItem } from 'src/types/checkout';

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
      category: product.category,
      price: product.price,
      stock: product.stock,
      unavailable: false,
    };

    if (product.price !== item.price) {
      kinds.push('price');
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

export function isPurchasable(item: ICheckoutItem): boolean {
  return !item.unavailable && item.quantity > 0;
}

export function hasCartDifference(item: ICheckoutItem): boolean {
  return (
    item.addedPrice !== undefined ||
    item.addedName !== undefined ||
    item.adjustedFrom !== undefined ||
    item.unavailable === true
  );
}

export function clearCartDifferences(items: ICheckoutItem[]): ICheckoutItem[] {
  return items.map(({ addedPrice, addedName, adjustedFrom, ...item }) => item);
}
