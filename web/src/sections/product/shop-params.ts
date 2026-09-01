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

export function parseShopState(searchParams: URLSearchParams): IShopState {
  const page = Number(searchParams.get('page'));

  return {
    q: searchParams.get('q')?.trim() ?? '',
    category: searchParams.get('category')?.trim() ?? '',
    page: Number.isInteger(page) && page > 0 ? page : SHOP_DEFAULT_PAGE,
  };
}

export function serializeShopState(state: IShopState): URLSearchParams {
  const params = new URLSearchParams();

  if (state.q) params.set('q', state.q);
  if (state.category) params.set('category', state.category);
  if (state.page !== SHOP_DEFAULT_PAGE) params.set('page', String(state.page));

  return params;
}

export function toShopQuery(state: IShopState) {
  return {
    page: state.page,
    limit: SHOP_PAGE_SIZE,
    ...(state.q ? { q: [state.q] } : {}),
    ...(state.category ? { category: [state.category] } : {}),
  };
}
