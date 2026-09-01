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

export function hasInvertedRange(state: IPurchaseFilters): boolean {
  return Boolean(state.dateFrom && state.dateTo && state.dateFrom > state.dateTo);
}

export function hasPurchaseFilters(state: IPurchaseFilters): boolean {
  return Boolean(state.q || state.status || state.dateFrom || state.dateTo);
}

function localInstant(date: string, time: string): string | undefined {
  const parsed = new Date(`${date}T${time}`);

  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

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
