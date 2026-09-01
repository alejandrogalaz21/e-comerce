import type {
  IPurchase,
  ApiPurchase,
  IPurchaseItem,
  ApiPurchaseItem,
  IShippingAddress,
} from 'src/types/purchase';

/**
 * Money crosses the wire as a string so decimal precision survives Postgres and
 * JSON. It becomes a number only here, at the edge that renders it.
 */
export function toPurchaseItem(item: ApiPurchaseItem): IPurchaseItem {
  const unitPrice = Number(item.unitPriceSnapshot);

  return {
    id: item.id,
    productId: item.productId,
    sku: item.sku,
    name: item.name,
    quantity: item.quantity,
    unitPrice,
    subtotal: unitPrice * item.quantity,
  };
}

/**
 * Orders placed before deliveries were recorded have no address. Null is the
 * honest answer there; an object of empty strings would read as an address that
 * happens to be blank.
 */
function toShippingAddress(purchase: ApiPurchase): IShippingAddress | null {
  if (!purchase.shipName) return null;

  return {
    name: purchase.shipName,
    phone: purchase.shipPhone ?? '',
    address: purchase.shipAddress ?? '',
    city: purchase.shipCity ?? '',
    state: purchase.shipState ?? '',
    zipCode: purchase.shipZipCode ?? '',
    country: purchase.shipCountry ?? '',
  };
}

export function toPurchase(purchase: ApiPurchase): IPurchase {
  return {
    id: purchase.id,
    status: purchase.status,
    total: Number(purchase.totalAmount),
    createdAt: purchase.createdAt,
    paymentReference: purchase.paymentReference,
    declineReason: purchase.declineReason,
    idempotencyKey: purchase.idempotencyKey,
    shippingAddress: toShippingAddress(purchase),
    items: (purchase.items ?? []).map(toPurchaseItem),
  };
}
