import { describe, it, expect } from 'vitest';

import {
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  DEFAULT_SORT_BY,
  DEFAULT_SORT_DIR,
  isPriceRangeValid,
  toProductListParams,
  countActiveFilters,
  parseProductListState,
  defaultProductListState,
  serializeProductListState,
} from './product-list-params';

const parse = (query: string) => parseProductListState(new URLSearchParams(query));

describe('parseProductListState', () => {
  it('falls back to defaults on an empty query string', () => {
    expect(parse('')).toEqual(defaultProductListState);
  });

  it('reads every supported parameter', () => {
    expect(
      parse(
        'q=camping&category=Electronics,Tools&minPrice=10&maxPrice=30&inStock=true&status=all&sortBy=price&sortDir=asc&page=3&limit=25'
      )
    ).toEqual({
      q: ['camping'],
      category: ['Electronics', 'Tools'],
      minPrice: 10,
      maxPrice: 30,
      inStock: true,
      status: 'all',
      sortBy: 'price',
      sortDir: 'asc',
      page: 3,
      limit: 25,
    });
  });

  it('trims, drops empty fragments and deduplicates categories', () => {
    expect(parse('category=Electronics,%20,Tools,Electronics,').category).toEqual([
      'Electronics',
      'Tools',
    ]);
  });

  it('ignores a sort field outside the whitelist', () => {
    expect(parse('sortBy=password').sortBy).toBe(DEFAULT_SORT_BY);
  });

  it('ignores an unknown sort direction', () => {
    expect(parse('sortDir=sideways').sortDir).toBe(DEFAULT_SORT_DIR);
  });

  it('accepts updatedAt as a sort field', () => {
    expect(parse('sortBy=updatedAt').sortBy).toBe('updatedAt');
  });

  it('drops an inverted price range instead of sending it', () => {
    const state = parse('minPrice=50&maxPrice=10');

    expect(state.minPrice).toBeUndefined();
    expect(state.maxPrice).toBeUndefined();
  });

  it('keeps a range whose bounds are equal', () => {
    expect(parse('minPrice=20&maxPrice=20')).toMatchObject({ minPrice: 20, maxPrice: 20 });
  });

  it('ignores negative and non numeric prices', () => {
    expect(parse('minPrice=-5').minPrice).toBeUndefined();
    expect(parse('minPrice=free').minPrice).toBeUndefined();
  });

  it('ignores inStock values that are neither true nor false', () => {
    expect(parse('inStock=yes').inStock).toBeUndefined();
    expect(parse('inStock=false').inStock).toBe(false);
  });

  it('ignores non positive page and limit values', () => {
    expect(parse('page=0&limit=-3')).toMatchObject({
      page: DEFAULT_PAGE,
      limit: DEFAULT_LIMIT,
    });
  });
});

describe('serializeProductListState', () => {
  it('omits every default so a clean view has a clean URL', () => {
    expect(serializeProductListState(defaultProductListState).toString()).toBe('');
  });

  it('round trips a fully populated state', () => {
    const state = {
      q: ['camping', 'PST-017'],
      category: ['Electronics', 'Tools'],
      minPrice: 10,
      maxPrice: 30,
      inStock: false,
      status: 'discontinued' as const,
      sortBy: 'updatedAt' as const,
      sortDir: 'asc' as const,
      page: 2,
      limit: 25,
    };

    const query = serializeProductListState(state).toString();

    expect(parseProductListState(new URLSearchParams(query))).toEqual(state);
  });

  it('keeps the default status out of the URL, so a plain link means "on sale"', () => {
    expect(serializeProductListState(defaultProductListState).get('status')).toBeNull();
    expect(parseProductListState(new URLSearchParams()).status).toBe('active');
  });

  it('falls back to on sale when the status in the URL is not a real one', () => {
    expect(parseProductListState(new URLSearchParams('status=nope')).status).toBe('active');
  });

  it('counts the status as an active filter only when it is not the default', () => {
    expect(countActiveFilters({ ...defaultProductListState, status: 'discontinued' })).toBe(1);
    expect(countActiveFilters(defaultProductListState)).toBe(0);
  });

  it('keeps inStock=false in the URL, since it is a real filter', () => {
    expect(
      serializeProductListState({ ...defaultProductListState, inStock: false }).get('inStock')
    ).toBe('false');
  });
});

describe('DEFAULT_LIMIT', () => {
  it('shows at least 20 rows, so the table is worth the space it takes', () => {
    expect(DEFAULT_LIMIT).toBeGreaterThanOrEqual(20);
  });

  it('is what a URL without an explicit limit resolves to', () => {
    expect(parse('page=2')).toMatchObject({ limit: DEFAULT_LIMIT });
  });

  it('is left out of the URL, so the link means "whatever the default is"', () => {
    expect(serializeProductListState(defaultProductListState).get('limit')).toBeNull();
  });

  it('is kept in the URL when explicitly different from the default', () => {
    expect(serializeProductListState({ ...defaultProductListState, limit: 50 }).get('limit')).toBe(
      '50'
    );
  });
});

describe('toProductListParams', () => {
  it('omits absent filters and always sends pagination and sorting', () => {
    expect(toProductListParams(defaultProductListState)).toEqual({
      page: DEFAULT_PAGE,
      limit: DEFAULT_LIMIT,
      sortBy: DEFAULT_SORT_BY,
      sortDir: DEFAULT_SORT_DIR,
    });
  });

  it('forwards the active filters', () => {
    const params = toProductListParams({
      ...defaultProductListState,
      q: ['shoes'],
      category: ['Footwear'],
      minPrice: 10,
      inStock: true,
    });

    expect(params).toMatchObject({
      q: ['shoes'],
      category: ['Footwear'],
      minPrice: 10,
      inStock: true,
    });
    expect(params).not.toHaveProperty('maxPrice');
  });
});

describe('isPriceRangeValid', () => {
  it('accepts an open ended range', () => {
    expect(isPriceRangeValid(10, undefined)).toBe(true);
    expect(isPriceRangeValid(undefined, 30)).toBe(true);
  });

  it('rejects an inverted range', () => {
    expect(isPriceRangeValid(50, 10)).toBe(false);
  });
});

describe('countActiveFilters', () => {
  it('counts each category as its own filter and the price range as one', () => {
    expect(
      countActiveFilters({
        ...defaultProductListState,
        q: ['shoes', 'boots'],
        category: ['Electronics', 'Tools'],
        minPrice: 10,
        maxPrice: 30,
        inStock: true,
      })
    ).toBe(6);
  });

  it('is zero for a clean state', () => {
    expect(countActiveFilters(defaultProductListState)).toBe(0);
  });
});

describe('multi-term search', () => {
  it('reads repeated q params as separate terms', () => {
    expect(parse('q=PST-017&q=PRJ-001').q).toEqual(['PST-017', 'PRJ-001']);
  });

  it('trims and deduplicates terms', () => {
    expect(parse('q=%20shoes%20&q=shoes&q=').q).toEqual(['shoes']);
  });

  it('keeps a term containing a comma intact', () => {
    const state = { ...defaultProductListState, q: ['Single origin, medium roast'] };
    const query = serializeProductListState(state).toString();

    expect(parseProductListState(new URLSearchParams(query)).q).toEqual([
      'Single origin, medium roast',
    ]);
  });

  it('writes one q param per term', () => {
    const params = serializeProductListState({ ...defaultProductListState, q: ['a', 'b'] });

    expect(params.getAll('q')).toEqual(['a', 'b']);
  });
});
