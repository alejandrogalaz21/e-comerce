import type {
  IPurchase,
  ApiPurchase,
  IPurchaseItem,
  ApiPurchaseItem,
} from 'src/types/purchase';

// ----------------------------------------------------------------------

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

export function toPurchase(purchase: ApiPurchase): IPurchase {
  return {
    id: purchase.id,
    status: purchase.status,
    total: Number(purchase.totalAmount),
    createdAt: purchase.createdAt,
    paymentReference: purchase.paymentReference,
    items: (purchase.items ?? []).map(toPurchaseItem),
  };
}
