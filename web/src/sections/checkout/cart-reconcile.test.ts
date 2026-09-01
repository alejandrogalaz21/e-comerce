import type { IProductItem } from 'src/types/product';
import type { ICheckoutItem } from 'src/types/checkout';

import { describe, it, expect } from 'vitest';

import { reconcileCart, isPurchasable, clearCartDifferences } from './cart-reconcile';

const line: ICheckoutItem = {
  id: 'product-1',
  sku: 'SB-020',
  name: 'Soccer Ball',
  price: 34.99,
  stock: 75,
  quantity: 2,
};

const catalog = (overrides: Partial<IProductItem> = {}): IProductItem =>
  ({
    id: 'product-1',
    sku: 'SB-020',
    name: 'Soccer Ball',
    price: 34.99,
    stock: 75,
    ...overrides,
  }) as IProductItem;

const found = (product: IProductItem) => ({ 'product-1': { status: 'found' as const, product } });

describe('reconcileCart', () => {
  it('leaves a line the catalog still agrees with untouched', () => {
    const { items, changes, unverified } = reconcileCart([line], found(catalog()));

    expect(changes).toEqual([]);
    expect(unverified).toBe(false);
    expect(items[0]).toMatchObject({ price: 34.99, quantity: 2 });
    expect(items[0].addedPrice).toBeUndefined();
  });

  /**
   * The whole point of the ticket: the server prices the order from the catalog,
   * so a stale price is a screen that disagrees with the charge.
   */
  it('adopts the current price and remembers the one that was accepted', () => {
    const { items, changes } = reconcileCart([line], found(catalog({ price: 9.99 })));

    expect(items[0].price).toBe(9.99);
    expect(items[0].addedPrice).toBe(34.99);
    expect(changes).toEqual([{ id: 'product-1', name: 'Soccer Ball', kinds: ['price'] }]);
  });

  it('keeps the originally accepted price when the product is repriced twice', () => {
    const once = reconcileCart([line], found(catalog({ price: 9.99 })));
    const twice = reconcileCart(once.items, found(catalog({ price: 19.99 })));

    expect(twice.items[0]).toMatchObject({ price: 19.99, addedPrice: 34.99 });
  });

  it('adopts a new name and sku, and reports it apart from a price change', () => {
    const { items, changes } = reconcileCart(
      [line],
      found(catalog({ name: 'Soccer Ball FiFa 2026', sku: 'SB-021' }))
    );

    expect(items[0]).toMatchObject({
      name: 'Soccer Ball FiFa 2026',
      sku: 'SB-021',
      addedName: 'Soccer Ball',
    });
    expect(changes[0].kinds).toEqual(['renamed']);
  });

  it('brings the quantity down to what is left and says it did', () => {
    const { items, changes } = reconcileCart([line], found(catalog({ stock: 1 })));

    expect(items[0]).toMatchObject({ quantity: 1, adjustedFrom: 2, stock: 1 });
    expect(changes[0].kinds).toEqual(['quantity']);
  });

  it('reports every kind of change a single line suffered', () => {
    const { changes } = reconcileCart(
      [line],
      found(catalog({ price: 9.99, name: 'Other Ball', stock: 1 }))
    );

    expect(changes[0].kinds).toEqual(['price', 'renamed', 'quantity']);
  });

  it('marks a product the catalog no longer has, instead of dropping the line', () => {
    const { items, changes } = reconcileCart([line], { 'product-1': { status: 'gone' } });

    expect(items[0]).toMatchObject({ unavailable: true, name: 'Soccer Ball' });
    expect(changes[0].kinds).toEqual(['unavailable']);
    expect(isPurchasable(items[0])).toBe(false);
  });

  /**
   * A dropped connection must not look like a deleted catalog: the line is kept
   * as it was and the caller is told the cart could not be verified.
   */
  it('keeps the line as it was when the catalog could not be reached', () => {
    const { items, changes, unverified } = reconcileCart([line], {
      'product-1': { status: 'unverified' },
    });

    expect(items[0]).toEqual(line);
    expect(changes).toEqual([]);
    expect(unverified).toBe(true);
  });

  it('treats a line nobody answered for as unverified', () => {
    expect(reconcileCart([line], {}).unverified).toBe(true);
  });

  it('does not report a line that was already marked unavailable', () => {
    const gone = reconcileCart([line], { 'product-1': { status: 'gone' } });
    const again = reconcileCart(gone.items, { 'product-1': { status: 'gone' } });

    expect(again.changes).toEqual([]);
  });

  it('brings a line back when the product returns to the catalog', () => {
    const gone = reconcileCart([line], { 'product-1': { status: 'gone' } });
    const back = reconcileCart(gone.items, found(catalog()));

    expect(back.items[0].unavailable).toBe(false);
    expect(isPurchasable(back.items[0])).toBe(true);
  });
});

describe('clearCartDifferences', () => {
  it('drops the marks once they have been seen, keeping the current values', () => {
    const { items } = reconcileCart([line], found(catalog({ price: 9.99, stock: 1 })));

    const cleared = clearCartDifferences(items);

    expect(cleared[0]).toMatchObject({ price: 9.99, quantity: 1 });
    expect(cleared[0].addedPrice).toBeUndefined();
    expect(cleared[0].adjustedFrom).toBeUndefined();
  });
});
