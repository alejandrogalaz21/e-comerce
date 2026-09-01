export const SHOP_DEFAULT_PAGE = 1;
export const SHOP_PAGE_SIZE = 12;

export type IShopState = {
  q: string;
  category: string;
  page: number;
};

export const defaultShopState: IShopState = {
  q: '',
  category: '',
  page: SHOP_DEFAULT_PAGE,
};

/**
 * The shop exposes fewer dimensions than the dashboard — search, category and
 * page, no price or sort — because those are what a shopper uses. It is a
 * subset of the same contract, not a second one.
 */
export function parseShopState(searchParams: URLSearchParams): IShopState {
  const page = Number(searchParams.get('page'));

  return {
    q: searchParams.get('q')?.trim() ?? '',
    category: searchParams.get('category')?.trim() ?? '',
    page: Number.isInteger(page) && page > 0 ? page : SHOP_DEFAULT_PAGE,
  };
}

/** A value equal to its default is left out, so a bare link means "the defaults". */
export function serializeShopState(state: IShopState): URLSearchParams {
  const params = new URLSearchParams();

  if (state.q) params.set('q', state.q);
  if (state.category) params.set('category', state.category);
  if (state.page !== SHOP_DEFAULT_PAGE) params.set('page', String(state.page));

  return params;
}

/** What the API is asked for, derived from what the visitor is looking at. */
export function toShopQuery(state: IShopState) {
  return {
    page: state.page,
    limit: SHOP_PAGE_SIZE,
    ...(state.q ? { q: [state.q] } : {}),
    ...(state.category ? { category: [state.category] } : {}),
  };
}
