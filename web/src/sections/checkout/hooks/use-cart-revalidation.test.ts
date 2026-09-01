import { it, expect, describe } from 'vitest';

import { toLookup } from './use-cart-revalidation';

const product = { id: 'p1', sku: 'RS-001', name: 'Running Shoes', price: 89.99, stock: 5 };

describe('toLookup reads one product query', () => {
  it('reports a product that answered', () => {
    const lookup = toLookup({ data: product, error: null, isError: false });

    expect(lookup).toEqual({ status: 'found', product });
  });

  it('reports a 404 as gone', () => {
    const lookup = toLookup({ data: undefined, error: { statusCode: 404 }, isError: true });

    expect(lookup).toEqual({ status: 'gone' });
  });

  it('prefers a fresh 404 over the copy left in the cache', () => {
    const lookup = toLookup({ data: product, error: { statusCode: 404 }, isError: true });

    expect(lookup).toEqual({ status: 'gone' });
  });

  it('does not claim a product is gone when the failure was not a 404', () => {
    const lookup = toLookup({ data: product, error: { statusCode: 500 }, isError: true });

    expect(lookup).toEqual({ status: 'unverified' });
  });

  it('says unverified when the error carries no status at all', () => {
    const lookup = toLookup({ data: undefined, error: 'Something went wrong!', isError: true });

    expect(lookup).toEqual({ status: 'unverified' });
  });

  it('says unverified while nothing has arrived yet', () => {
    const lookup = toLookup({ data: undefined, error: null, isError: false });

    expect(lookup).toEqual({ status: 'unverified' });
  });
});
