export type IPurchaseStatus = 'PENDING' | 'PAID' | 'FAILED';

export type IPaymentMethod = 'card' | 'paypal';

export type ApiPurchaseItem = {
  id: string;
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  unitPriceSnapshot: string;
};

export type IShippingAddress = {
  name: string;
  phone: string;
  email: string;
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
  paymentMethod: IPaymentMethod | null;
  paymentReference: string | null;
  declineReason: string | null;
  createdAt: string;
  items: ApiPurchaseItem[];
  shipName: string | null;
  shipPhone: string | null;
  shipEmail: string | null;
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
  paymentMethod: IPaymentMethod | null;
  paymentReference: string | null;
  declineReason: string | null;
  idempotencyKey: string;
  items: IPurchaseItem[];
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
  paymentMethod: IPaymentMethod;
  shippingAddress: IShippingAddress;
};

export type IStockConflict = {
  sku: string;
  requested: number;
  available: number;
  message: string;
};

export type IPurchaseErrorKind = 'stock' | 'payment' | 'missing' | 'unknown';

export type IPlacePurchaseError = {
  kind: IPurchaseErrorKind;
  message: string;
  conflict?: IStockConflict;
  missingProductId?: string;
};
