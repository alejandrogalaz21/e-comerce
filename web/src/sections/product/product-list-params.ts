import type {
  IProductSortField,
  IProductListParams,
  IProductSortDirection,
} from 'src/types/product';

import { PRODUCT_SORT_FIELDS } from 'src/types/product';

export type IProductListState = {
  q: string[];
  category: string[];
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sortBy: IProductSortField;
  sortDir: IProductSortDirection;
  page: number;
  limit: number;
};

export const DEFAULT_SORT_BY: IProductSortField = 'createdAt';
export const DEFAULT_SORT_DIR: IProductSortDirection = 'desc';
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;

export const defaultProductListState: IProductListState = {
  q: [],
  category: [],
  sortBy: DEFAULT_SORT_BY,
  sortDir: DEFAULT_SORT_DIR,
  page: DEFAULT_PAGE,
  limit: DEFAULT_LIMIT,
};

function parsePositiveInt(raw: string | null, fallback: number): number {
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function parsePrice(raw: string | null): number | undefined {
  if (raw === null || raw.trim() === '') return undefined;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

function parseBoolean(raw: string | null): boolean | undefined {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return undefined;
}

function parseTerms(raw: string[]): string[] {
  const terms = raw.map((value) => value.trim()).filter(Boolean);
  return Array.from(new Set(terms));
}

function parseCategories(raw: string | null): string[] {
  if (!raw) return [];
  const categories = raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return Array.from(new Set(categories));
}

export function isPriceRangeValid(minPrice?: number, maxPrice?: number): boolean {
  if (minPrice === undefined || maxPrice === undefined) return true;
  return maxPrice >= minPrice;
}

export function parseProductListState(searchParams: URLSearchParams): IProductListState {
  const sortByRaw = searchParams.get('sortBy');
  const sortDirRaw = searchParams.get('sortDir');

  const minPrice = parsePrice(searchParams.get('minPrice'));
  const maxPrice = parsePrice(searchParams.get('maxPrice'));
  const rangeIsValid = isPriceRangeValid(minPrice, maxPrice);

  return {
    q: parseTerms(searchParams.getAll('q')),
    category: parseCategories(searchParams.get('category')),
    minPrice: rangeIsValid ? minPrice : undefined,
    maxPrice: rangeIsValid ? maxPrice : undefined,
    inStock: parseBoolean(searchParams.get('inStock')),
    sortBy: PRODUCT_SORT_FIELDS.includes(sortByRaw as IProductSortField)
      ? (sortByRaw as IProductSortField)
      : DEFAULT_SORT_BY,
    sortDir: sortDirRaw === 'asc' ? 'asc' : DEFAULT_SORT_DIR,
    page: parsePositiveInt(searchParams.get('page'), DEFAULT_PAGE),
    limit: parsePositiveInt(searchParams.get('limit'), DEFAULT_LIMIT),
  };
}

export function serializeProductListState(state: IProductListState): URLSearchParams {
  const params = new URLSearchParams();

  state.q.forEach((term) => params.append('q', term));

  if (state.category.length) params.set('category', state.category.join(','));
  if (state.minPrice !== undefined) params.set('minPrice', String(state.minPrice));
  if (state.maxPrice !== undefined) params.set('maxPrice', String(state.maxPrice));
  if (state.inStock !== undefined) params.set('inStock', String(state.inStock));
  if (state.sortBy !== DEFAULT_SORT_BY) params.set('sortBy', state.sortBy);
  if (state.sortDir !== DEFAULT_SORT_DIR) params.set('sortDir', state.sortDir);
  if (state.page !== DEFAULT_PAGE) params.set('page', String(state.page));
  if (state.limit !== DEFAULT_LIMIT) params.set('limit', String(state.limit));

  return params;
}

export function toProductListParams(state: IProductListState): IProductListParams {
  return {
    page: state.page,
    limit: state.limit,
    ...(state.q.length ? { q: state.q } : {}),
    ...(state.category.length ? { category: state.category } : {}),
    ...(state.minPrice !== undefined ? { minPrice: state.minPrice } : {}),
    ...(state.maxPrice !== undefined ? { maxPrice: state.maxPrice } : {}),
    ...(state.inStock !== undefined ? { inStock: state.inStock } : {}),
    sortBy: state.sortBy,
    sortDir: state.sortDir,
  };
}

export function countActiveFilters(state: IProductListState): number {
  return (
    state.q.length +
    state.category.length +
    (state.minPrice !== undefined || state.maxPrice !== undefined ? 1 : 0) +
    (state.inStock !== undefined ? 1 : 0)
  );
}
