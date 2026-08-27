import { describe, expect, it } from 'vitest';

import { NewProductSchema } from './product-schema';

const validProduct = {
  name: 'Running Shoes',
  sku: 'RS-001',
  description: 'Lightweight running shoes',
  category: 'Footwear',
  price: 89.99,
  stock: 25,
  weightKg: '0.350',
};

describe('NewProductSchema', () => {
  it('parses a valid full product (CSV line 2)', () => {
    const result = NewProductSchema.safeParse(validProduct);
    expect(result.success).toBe(true);
  });

  describe('name', () => {
    it('fails on empty name (CSV line 25)', () => {
      const result = NewProductSchema.safeParse({ ...validProduct, name: '' });
      expect(result.success).toBe(false);
    });

    it('fails on whitespace-only name (CSV line 41)', () => {
      const result = NewProductSchema.safeParse({ ...validProduct, name: '   ' });
      expect(result.success).toBe(false);
    });

    it("passes a script-tag name client-side - sanitization is server-side (CSV line 20)", () => {
      const result = NewProductSchema.safeParse({
        ...validProduct,
        name: "<script>alert('xss')</script>",
      });
      expect(result.success).toBe(true);
    });

    it('passes a unicode name (CSV line 31)', () => {
      const result = NewProductSchema.safeParse({
        ...validProduct,
        name: 'Water Bottle — cold™',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('sku', () => {
    it('fails the SQL injection sku against the allowed-characters regex (CSV line 29)', () => {
      const result = NewProductSchema.safeParse({
        ...validProduct,
        sku: "Robert'); DROP TABLE products;--",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((issue) => issue.path[0] === 'sku')).toBe(true);
      }
    });

    it('passes sku RS-001', () => {
      const result = NewProductSchema.safeParse({ ...validProduct, sku: 'RS-001' });
      expect(result.success).toBe(true);
    });
  });

  describe('price', () => {
    it('passes price 0 - free product (CSV line 47)', () => {
      const result = NewProductSchema.safeParse({ ...validProduct, price: 0 });
      expect(result.success).toBe(true);
    });

    it('fails negative price', () => {
      const result = NewProductSchema.safeParse({ ...validProduct, price: -5 });
      expect(result.success).toBe(false);
    });

    it('fails price with more than 2 decimals', () => {
      const result = NewProductSchema.safeParse({ ...validProduct, price: 19.999 });
      expect(result.success).toBe(false);
    });
  });

  describe('stock', () => {
    it('passes stock 0 (CSV line 51)', () => {
      const result = NewProductSchema.safeParse({ ...validProduct, stock: 0 });
      expect(result.success).toBe(true);
    });

    it('fails negative stock (CSV line 16)', () => {
      const result = NewProductSchema.safeParse({ ...validProduct, stock: -5 });
      expect(result.success).toBe(false);
    });

    it('fails non-integer stock', () => {
      const result = NewProductSchema.safeParse({ ...validProduct, stock: 1.5 });
      expect(result.success).toBe(false);
    });
  });

  describe('weightKg', () => {
    it('passes empty weight - absence semantics (CSV line 50)', () => {
      const result = NewProductSchema.safeParse({ ...validProduct, weightKg: '' });
      expect(result.success).toBe(true);
    });

    it('fails negative weight', () => {
      const result = NewProductSchema.safeParse({ ...validProduct, weightKg: '-1' });
      expect(result.success).toBe(false);
    });

    it('fails non-numeric weight', () => {
      const result = NewProductSchema.safeParse({ ...validProduct, weightKg: 'abc' });
      expect(result.success).toBe(false);
    });
  });
});
