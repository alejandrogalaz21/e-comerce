import type { IPurchaseStatus } from 'src/types/purchase';

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

/**
 * An inverted range is answered with a 400 by the API, and an error screen the
 * visitor cannot argue with. Catching it here keeps the filters on screen so the
 * dates can be corrected.
 */
export function hasInvertedRange(state: IPurchaseFilters): boolean {
  return Boolean(state.dateFrom && state.dateTo && state.dateFrom > state.dateTo);
}

export function hasPurchaseFilters(state: IPurchaseFilters): boolean {
  return Boolean(state.q || state.status || state.dateFrom || state.dateTo);
}

/**
 * The address keeps the plain day the visitor picked, but the API compares
 * instants: an order placed on the evening of the 31st is stored on the 1st in
 * UTC, so the day has to be bounded in the visitor's own zone before it travels.
 */
function localInstant(date: string, time: string): string | undefined {
  const parsed = new Date(`${date}T${time}`);

  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

/** What actually travels to the API: empty criteria are omitted, not sent blank. */
export function toPurchaseQuery(state: IPurchaseFilters) {
  const dateFrom = state.dateFrom ? localInstant(state.dateFrom, '00:00:00.000') : undefined;
  const dateTo = state.dateTo ? localInstant(state.dateTo, '23:59:59.999') : undefined;

  return {
    page: state.page,
    limit: state.limit,
    ...(state.q && { q: state.q }),
    ...(state.status && { status: state.status }),
    ...(dateFrom && { dateFrom }),
    ...(dateTo && { dateTo }),
  };
}
