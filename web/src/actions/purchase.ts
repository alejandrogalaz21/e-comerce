import type { IPaginatedResponse } from 'src/types/common';
import type {
  IPurchase,
  ApiPurchase,
  IStockConflict,
  IPurchaseErrorKind,
  IPurchaseListParams,
  IPlacePurchasePayload,
} from 'src/types/purchase';

import axiosInstance, { endpoints } from 'src/lib/axios';

import { toPurchase } from './purchase.mapper';

/** The error envelope every API failure carries. See docs/processes/P-07-error-contract.md */
type ApiError = {
  statusCode: number;
  error: string;
  message: string;
  sku?: string;
  requested?: number;
  available?: number;
};

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

export async function getPurchases(params: IPurchaseListParams) {
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
  // The axios response interceptor rejects with `error.response.data`, not with
  // the AxiosError, so the error body arrives here already unwrapped. Testing
  // for an AxiosError would never match and would flatten every failure into the
  // generic one, which is exactly what the two distinct messages exist to avoid.
  const body = error as Partial<ApiError> | string | undefined;

  if (!body || typeof body !== 'object' || typeof body.statusCode !== 'number') {
    return new PlacePurchaseError('unknown', 'The order could not be sent. Check your connection.');
  }

  if (body.statusCode === 409) {
    return new PlacePurchaseError(
      'stock',
      body.message ?? 'Not enough stock for one of the products',
      {
        sku: body.sku as string,
        requested: body.requested as number,
        available: body.available as number,
        message: body.message as string,
      }
    );
  }

  if (body.statusCode === 402) {
    return new PlacePurchaseError('payment', body.message ?? 'The payment was declined');
  }

  return new PlacePurchaseError('unknown', body.message ?? 'The order could not be placed');
}
