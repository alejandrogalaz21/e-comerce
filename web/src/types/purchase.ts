// ----------------------------------------------------------------------

/**
 * The purchase contract served by the API. It is deliberately separate from
 * `order.ts`, which is the template's own order domain and belongs to screens
 * this change does not touch.
 */
export type IPurchaseStatus = 'PENDING' | 'PAID' | 'FAILED';

export type ApiPurchaseItem = {
  id: string;
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  unitPriceSnapshot: string;
};

export type ApiPurchase = {
  id: string;
  status: IPurchaseStatus;
  totalAmount: string;
  idempotencyKey: string;
  paymentReference: string | null;
  declineReason: string | null;
  createdAt: string;
  items: ApiPurchaseItem[];
};

export type IPurchaseItem = {
  id: string;
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

export type IPurchase = {
  id: string;
  status: IPurchaseStatus;
  total: number;
  createdAt: string;
  paymentReference: string | null;
  items: IPurchaseItem[];
};

export type IPlacePurchasePayload = {
  items: { productId: string; quantity: number }[];
  idempotencyKey: string;
};

/** A line the catalog could not fulfil, as reported by a 409. */
export type IStockConflict = {
  sku: string;
  requested: number;
  available: number;
  message: string;
};

export type IPurchaseErrorKind = 'stock' | 'payment' | 'unknown';

export type IPlacePurchaseError = {
  kind: IPurchaseErrorKind;
  message: string;
  conflict?: IStockConflict;
};
