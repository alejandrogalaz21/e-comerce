import { describe, it, expect } from 'vitest';

import {
  toPurchaseQuery,
  hasPurchaseFilters,
  parsePurchaseFilters,
  serializePurchaseFilters,
} from './purchase-params';

const parse = (search: string) => parsePurchaseFilters(new URLSearchParams(search));

describe('parsePurchaseFilters', () => {
  it('defaults to the first page with no criteria', () => {
    expect(parse('')).toEqual({
      page: 1,
      limit: 20,
      q: '',
      status: '',
      dateFrom: '',
      dateTo: '',
    });
  });

  it('reads every criterion from the address', () => {
    expect(
      parse('page=3&limit=50&q=PRJ-001&status=FAILED&dateFrom=2026-08-01&dateTo=2026-08-31')
    ).toEqual({
      page: 3,
      limit: 50,
      q: 'PRJ-001',
      status: 'FAILED',
      dateFrom: '2026-08-01',
      dateTo: '2026-08-31',
    });
  });

  /**
   * A status nobody chose must not reach the API, which answers 400 for it. A
   * hand-edited or stale link degrades to "no status filter" instead.
   */
  it('drops a status the system does not have', () => {
    expect(parse('status=REFUNDED').status).toBe('');
  });

  it('ignores a page that is not a positive number', () => {
    expect(parse('page=0').page).toBe(1);
    expect(parse('page=-4').page).toBe(1);
    expect(parse('page=abc').page).toBe(1);
  });

  it('trims the search term', () => {
    expect(parse('q=%20%20PRJ-001%20%20').q).toBe('PRJ-001');
  });
});

describe('serializePurchaseFilters', () => {
  it('leaves defaults out of the address', () => {
    expect(serializePurchaseFilters(parse('')).toString()).toBe('');
  });

  it('round-trips what was set', () => {
    const state = parse('page=2&q=RS-001&status=PAID&dateFrom=2026-08-01');

    expect(parsePurchaseFilters(serializePurchaseFilters(state))).toEqual(state);
  });
});

describe('hasPurchaseFilters', () => {
  it('is false when only paging is set', () => {
    expect(hasPurchaseFilters(parse('page=4&limit=50'))).toBe(false);
  });

  it.each(['q=x', 'status=PAID', 'dateFrom=2026-08-01', 'dateTo=2026-08-31'])(
    'is true for %s',
    (search) => {
      expect(hasPurchaseFilters(parse(search))).toBe(true);
    }
  );
});

describe('toPurchaseQuery', () => {
  /**
   * Empty criteria are omitted rather than sent blank: `status=` would fail the
   * enum validation on the API for a filter the visitor never applied.
   */
  it('omits the criteria that are not set', () => {
    expect(toPurchaseQuery(parse(''))).toEqual({ page: 1, limit: 20 });
  });

  it('carries the criteria that are set', () => {
    expect(toPurchaseQuery(parse('q=RS-001&status=PAID&dateTo=2026-08-31'))).toEqual({
      page: 1,
      limit: 20,
      q: 'RS-001',
      status: 'PAID',
      dateTo: '2026-08-31',
    });
  });
});
