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

/** The delivery address, as the order recorded it. */
export type IShippingAddress = {
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
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
  shipName: string | null;
  shipPhone: string | null;
  shipAddress: string | null;
  shipCity: string | null;
  shipState: string | null;
  shipZipCode: string | null;
  shipCountry: string | null;
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
  declineReason: string | null;
  idempotencyKey: string;
  items: IPurchaseItem[];
  /** Absent on orders placed before deliveries were recorded. */
  shippingAddress: IShippingAddress | null;
};

export type IPurchaseListParams = {
  page: number;
  limit: number;
  q?: string;
  status?: IPurchaseStatus;
  dateFrom?: string;
  dateTo?: string;
};

export type IPlacePurchasePayload = {
  items: { productId: string; quantity: number }[];
  idempotencyKey: string;
  shippingAddress: IShippingAddress;
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
