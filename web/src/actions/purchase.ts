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

type ApiError = {
  statusCode: number;
  error: string;
  message: string;
  sku?: string;
  requested?: number;
  available?: number;
};

export class PlacePurchaseError extends Error {
  readonly kind: IPurchaseErrorKind;

  readonly conflict?: IStockConflict;

  readonly missingProductId?: string;

  constructor(
    kind: IPurchaseErrorKind,
    message: string,
    conflict?: IStockConflict,
    missingProductId?: string
  ) {
    super(message);
    this.name = 'PlacePurchaseError';
    this.kind = kind;
    this.conflict = conflict;
    this.missingProductId = missingProductId;
  }
}

const MISSING_PRODUCT = /Product ([0-9a-f-]{36}) not found/i;

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

export function toPlacePurchaseError(error: unknown): PlacePurchaseError {
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

  if (body.statusCode === 404) {
    const id = MISSING_PRODUCT.exec(body.message ?? '')?.[1];

    return new PlacePurchaseError(
      'missing',
      body.message ?? 'One of the products is no longer available',
      undefined,
      id
    );
  }

  if (body.statusCode === 402) {
    return new PlacePurchaseError('payment', body.message ?? 'The payment was declined');
  }

  return new PlacePurchaseError('unknown', body.message ?? 'The order could not be placed');
}
