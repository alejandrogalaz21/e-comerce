import { describe, it, expect } from 'vitest';

import {
  toShopQuery,
  SHOP_PAGE_SIZE,
  parseShopState,
  defaultShopState,
  SHOP_DEFAULT_PAGE,
  serializeShopState,
} from './shop-params';

const parse = (search: string) => parseShopState(new URLSearchParams(search));

describe('parseShopState', () => {
  it('falls back to the defaults for an empty address', () => {
    expect(parse('')).toEqual(defaultShopState);
  });

  it('reads search, category and page', () => {
    expect(parse('q=tent&category=Outdoors&page=3')).toEqual({
      q: 'tent',
      category: 'Outdoors',
      page: 3,
    });
  });

  it('trims what the visitor typed', () => {
    expect(parse('q=%20tent%20').q).toBe('tent');
  });

  it('ignores a page that is not a positive whole number', () => {
    expect(parse('page=0').page).toBe(SHOP_DEFAULT_PAGE);
    expect(parse('page=-2').page).toBe(SHOP_DEFAULT_PAGE);
    expect(parse('page=abc').page).toBe(SHOP_DEFAULT_PAGE);
  });
});

describe('serializeShopState', () => {
  it('leaves out everything that equals its default', () => {
    expect(serializeShopState(defaultShopState).toString()).toBe('');
  });

  it('keeps what the visitor actually chose', () => {
    const params = serializeShopState({ q: 'tent', category: 'Outdoors', page: 2 });

    expect(params.get('q')).toBe('tent');
    expect(params.get('category')).toBe('Outdoors');
    expect(params.get('page')).toBe('2');
  });

  it('round-trips, so back and shared links reproduce the view', () => {
    const state = { q: 'speaker', category: 'Electronics', page: 4 };

    expect(parseShopState(serializeShopState(state))).toEqual(state);
  });
});

describe('toShopQuery', () => {
  it('asks for one page of the catalog', () => {
    expect(toShopQuery(defaultShopState)).toEqual({
      page: SHOP_DEFAULT_PAGE,
      limit: SHOP_PAGE_SIZE,
    });
  });

  it('omits filters that are not set rather than sending empty ones', () => {
    const query = toShopQuery({ q: '', category: '', page: 1 });

    expect(query).not.toHaveProperty('q');
    expect(query).not.toHaveProperty('category');
  });

  it('sends search and category as the API expects them', () => {
    expect(toShopQuery({ q: 'tent', category: 'Outdoors', page: 1 })).toMatchObject({
      q: ['tent'],
      category: ['Outdoors'],
    });
  });
});
