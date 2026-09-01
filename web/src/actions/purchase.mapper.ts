import type {
  IPurchase,
  ApiPurchase,
  IPurchaseItem,
  ApiPurchaseItem,
  IShippingAddress,
} from 'src/types/purchase';

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

function toShippingAddress(purchase: ApiPurchase): IShippingAddress | null {
  if (!purchase.shipName) return null;

  return {
    name: purchase.shipName,
    phone: purchase.shipPhone ?? '',
    email: purchase.shipEmail ?? '',
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
    paymentMethod: purchase.paymentMethod ?? null,
    paymentReference: purchase.paymentReference,
    declineReason: purchase.declineReason,
    idempotencyKey: purchase.idempotencyKey,
    shippingAddress: toShippingAddress(purchase),
    items: (purchase.items ?? []).map(toPurchaseItem),
  };
}
