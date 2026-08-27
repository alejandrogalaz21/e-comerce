import { describe, expect, it } from 'vitest';

import { toApiPayload, toProductItem } from './product.mapper';

import type { ApiProduct, IProductFormValues } from 'src/types/product';

const apiProduct: ApiProduct = {
  id: 'a4c8e9a2-0000-0000-0000-000000000001',
  sku: 'RS-001',
  name: 'Running Shoes',
  description: 'Lightweight running shoes',
  category: 'Footwear',
  price: '89.99',
  stock: 25,
  weightKg: '0.350',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const formValues: IProductFormValues = {
  name: 'Running Shoes',
  sku: 'RS-001',
  description: 'Lightweight running shoes',
  category: 'Footwear',
  price: 89.99,
  stock: 25,
  weightKg: '0.350',
};

describe('toProductItem', () => {
  it('converts decimal string price to number', () => {
    const item = toProductItem(apiProduct);
    expect(item.price).toBe(89.99);
    expect(typeof item.price).toBe('number');
  });

  it('converts weightKg "0.350" to 0.35', () => {
    const item = toProductItem(apiProduct);
    expect(item.weightKg).toBe(0.35);
  });

  it('keeps weightKg null as null', () => {
    const item = toProductItem({ ...apiProduct, weightKg: null });
    expect(item.weightKg).toBeNull();
  });
});

describe('toApiPayload', () => {
  it('omits empty description and category', () => {
    const payload = toApiPayload({ ...formValues, description: '', category: '' });
    expect(payload).not.toHaveProperty('description');
    expect(payload).not.toHaveProperty('category');
  });

  it('omits empty weightKg - NULL semantics, never 0', () => {
    const payload = toApiPayload({ ...formValues, weightKg: '' });
    expect(payload).not.toHaveProperty('weightKg');
    expect(payload.weightKg).not.toBe(0);
  });

  it('converts weightKg "1.5" to the number 1.5', () => {
    const payload = toApiPayload({ ...formValues, weightKg: '1.5' });
    expect(payload.weightKg).toBe(1.5);
    expect(typeof payload.weightKg).toBe('number');
  });

  it('passes price and stock through as numbers', () => {
    const payload = toApiPayload(formValues);
    expect(payload.price).toBe(89.99);
    expect(payload.stock).toBe(25);
    expect(typeof payload.price).toBe('number');
    expect(typeof payload.stock).toBe('number');
  });
});
