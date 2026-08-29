import type { IPaginatedResponse } from 'src/types/common';
import type {
  IPurchase,
  ApiPurchase,
  IStockConflict,
  IPurchaseErrorKind,
  IPlacePurchasePayload,
} from 'src/types/purchase';

import axios from 'axios';

import axiosInstance, { endpoints } from 'src/lib/axios';

import { toPurchase } from './purchase.mapper';

// ----------------------------------------------------------------------

/** A real Error so it survives rejection handling and shows a useful stack. */
export class PlacePurchaseError extends Error {
  readonly kind: IPurchaseErrorKind;

  readonly conflict?: IStockConflict;

  constructor(kind: IPurchaseErrorKind, message: string, conflict?: IStockConflict) {
    super(message);
    this.name = 'PlacePurchaseError';
    this.kind = kind;
    this.conflict = conflict;
  }
}

export async function placePurchase(payload: IPlacePurchasePayload): Promise<IPurchase> {
  try {
    const res = await axiosInstance.post<ApiPurchase>(endpoints.purchase.create, payload);

    return toPurchase(res.data);
  } catch (error) {
    throw toPlacePurchaseError(error);
  }
}

export async function getPurchases(params: { page: number; limit: number }) {
  const res = await axiosInstance.get<IPaginatedResponse<ApiPurchase>>(endpoints.purchase.list, {
    params,
  });

  return { purchases: res.data.data.map(toPurchase), pagination: res.data.pagination };
}

export async function getPurchase(id: string): Promise<IPurchase> {
  const res = await axiosInstance.get<ApiPurchase>(endpoints.purchase.details(id));

  return toPurchase(res.data);
}

/**
 * Insufficient stock and a declined card are different outcomes: retrying the
 * same request fixes the second and never the first, so the UI must tell them
 * apart without parsing prose.
 */
export function toPlacePurchaseError(error: unknown): PlacePurchaseError {
  if (!axios.isAxiosError(error) || !error.response) {
    return new PlacePurchaseError(
      'unknown',
      'The order could not be sent. Check your connection.'
    );
  }

  const { status, data } = error.response;

  if (status === 409) {
    return new PlacePurchaseError(
      'stock',
      data?.message ?? 'Not enough stock for one of the products',
      {
        sku: data?.sku,
        requested: data?.requested,
        available: data?.available,
        message: data?.message,
      }
    );
  }

  if (status === 402) {
    return new PlacePurchaseError('payment', data?.message ?? 'The payment was declined');
  }

  return new PlacePurchaseError('unknown', data?.message ?? 'The order could not be placed');
}
