import { describe, it, expect } from 'vitest';

import { shortId, countItems, sumSubtotals, priceComparison } from './purchase-utils';

const line = (quantity: number, subtotal: number) => ({
  id: 'x',
  productId: 'p',
  sku: 'SKU',
  name: 'Name',
  unitPrice: subtotal / quantity,
  quantity,
  subtotal,
});

describe('countItems', () => {
  it('adds the units across lines, not the number of lines', () => {
    expect(countItems({ items: [line(1, 10), line(2, 20)] })).toBe(3);
  });

  it('is zero for an order without lines', () => {
    expect(countItems({ items: [] })).toBe(0);
  });
});

describe('sumSubtotals', () => {
  it('adds the line subtotals', () => {
    expect(sumSubtotals([line(1, 199.99), line(2, 29.98)])).toBeCloseTo(229.97, 2);
  });
});

describe('priceComparison', () => {
  it('flags a catalog price that no longer matches what was paid', () => {
    expect(priceComparison(199.99, 149.99)).toEqual({ changed: true, currentPrice: 149.99 });
  });

  it('does not flag an unchanged price', () => {
    expect(priceComparison(199.99, 199.99).changed).toBe(false);
  });

  /**
   * A product that could not be read is not evidence that the price held. The
   * row must fall back to the frozen price and claim nothing.
   */
  it('says nothing when the catalog price is unavailable', () => {
    expect(priceComparison(199.99, undefined)).toEqual({ changed: false, currentPrice: undefined });
    expect(priceComparison(199.99, null).changed).toBe(false);
  });

  it('treats a free product as a real price, not as missing', () => {
    expect(priceComparison(199.99, 0)).toEqual({ changed: true, currentPrice: 0 });
  });
});

describe('shortId', () => {
  it('abbreviates a uuid to its first block', () => {
    expect(shortId('42f930c2-437c-4f36-83e3-fcc19610018e')).toBe('42f930c2');
  });
});
