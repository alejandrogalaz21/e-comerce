import type { IPurchaseStatus } from 'src/types/purchase';

// ----------------------------------------------------------------------

export const PURCHASE_PAGE_SIZE = 20;

export const PURCHASE_STATUSES: IPurchaseStatus[] = ['PAID', 'FAILED', 'PENDING'];

export type IPurchaseFilters = {
  page: number;
  limit: number;
  q: string;
  status: IPurchaseStatus | '';
  dateFrom: string;
  dateTo: string;
};

const isStatus = (value: string): value is IPurchaseStatus =>
  (PURCHASE_STATUSES as string[]).includes(value);

export function parsePurchaseFilters(params: URLSearchParams): IPurchaseFilters {
  const status = params.get('status') ?? '';

  return {
    page: Math.max(1, Number(params.get('page')) || 1),
    limit: Number(params.get('limit')) || PURCHASE_PAGE_SIZE,
    q: params.get('q')?.trim() ?? '',
    // An unknown value in the address is dropped rather than sent on: the API
    // would answer 400 for something the visitor never chose.
    status: isStatus(status) ? status : '',
    dateFrom: params.get('dateFrom') ?? '',
    dateTo: params.get('dateTo') ?? '',
  };
}

export function serializePurchaseFilters(state: IPurchaseFilters): URLSearchParams {
  const params = new URLSearchParams();

  if (state.page > 1) params.set('page', String(state.page));
  if (state.limit !== PURCHASE_PAGE_SIZE) params.set('limit', String(state.limit));
  if (state.q) params.set('q', state.q);
  if (state.status) params.set('status', state.status);
  if (state.dateFrom) params.set('dateFrom', state.dateFrom);
  if (state.dateTo) params.set('dateTo', state.dateTo);

  return params;
}

export function hasPurchaseFilters(state: IPurchaseFilters): boolean {
  return Boolean(state.q || state.status || state.dateFrom || state.dateTo);
}

/** What actually travels to the API: empty criteria are omitted, not sent blank. */
export function toPurchaseQuery(state: IPurchaseFilters) {
  return {
    page: state.page,
    limit: state.limit,
    ...(state.q && { q: state.q }),
    ...(state.status && { status: state.status }),
    ...(state.dateFrom && { dateFrom: state.dateFrom }),
    ...(state.dateTo && { dateTo: state.dateTo }),
  };
}
