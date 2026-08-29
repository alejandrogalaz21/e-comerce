import { describe, it, expect } from 'vitest';

import { toPurchase, toPurchaseItem } from './purchase.mapper';
import { toPlacePurchaseError } from './purchase';

// ----------------------------------------------------------------------

const apiItem = {
  id: 'item-1',
  productId: 'product-1',
  sku: 'RS-001',
  name: 'Running Shoes',
  quantity: 2,
  unitPriceSnapshot: '89.99',
};

const apiPurchase = {
  id: 'order-1',
  status: 'PAID' as const,
  totalAmount: '179.98',
  idempotencyKey: 'key-1',
  paymentReference: 'fake_ch_1',
  declineReason: null,
  createdAt: '2026-08-29T10:00:00.000Z',
  items: [apiItem],
};

describe('toPurchaseItem', () => {
  it('turns the wire string into a number and derives the subtotal', () => {
    expect(toPurchaseItem(apiItem)).toEqual({
      id: 'item-1',
      productId: 'product-1',
      sku: 'RS-001',
      name: 'Running Shoes',
      quantity: 2,
      unitPrice: 89.99,
      subtotal: 179.98,
    });
  });
});

describe('toPurchase', () => {
  it('maps the order with its lines', () => {
    const purchase = toPurchase(apiPurchase);

    expect(purchase).toMatchObject({
      id: 'order-1',
      status: 'PAID',
      total: 179.98,
      paymentReference: 'fake_ch_1',
    });
    expect(purchase.items).toHaveLength(1);
  });

  it('tolerates a response without lines', () => {
    expect(toPurchase({ ...apiPurchase, items: undefined as never }).items).toEqual([]);
  });
});

describe('toPlacePurchaseError', () => {
  const axiosError = (status: number, data: unknown) => ({
    isAxiosError: true,
    response: { status, data },
  });

  it('reads a stock conflict out of a 409, with the line that caused it', () => {
    const error = toPlacePurchaseError(
      axiosError(409, {
        message: 'Not enough stock for RS-001: 10 requested, 3 left',
        sku: 'RS-001',
        requested: 10,
        available: 3,
      })
    );

    expect(error.kind).toBe('stock');
    expect(error.conflict).toMatchObject({ sku: 'RS-001', requested: 10, available: 3 });
  });

  it('reads a declined payment out of a 402', () => {
    const error = toPlacePurchaseError(
      axiosError(402, { message: 'Payment was declined: card declined by the issuer' })
    );

    expect(error.kind).toBe('payment');
    expect(error.conflict).toBeUndefined();
  });

  it('separates stock from payment, since only one of them is worth retrying', () => {
    const stock = toPlacePurchaseError(axiosError(409, { sku: 'RS-001' }));
    const payment = toPlacePurchaseError(axiosError(402, {}));

    expect(stock.kind).not.toBe(payment.kind);
    expect(stock.message).not.toBe(payment.message);
  });

  it('falls back to a connection message when there is no response', () => {
    const error = toPlacePurchaseError(new Error('network down'));

    expect(error.kind).toBe('unknown');
    expect(error.message).toContain('connection');
  });

  it('is a real Error, so rejection handling and stacks behave', () => {
    expect(toPlacePurchaseError(axiosError(402, {}))).toBeInstanceOf(Error);
  });
});
