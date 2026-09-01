import { describe, it, expect } from 'vitest';

import { toPurchase, toPurchaseItem } from './purchase.mapper';
import { toPlacePurchaseError } from './purchase';

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
  shipName: 'Ada Lovelace',
  shipPhone: '+14155552671',
  shipAddress: '1 Test Street',
  shipCity: 'Springfield',
  shipState: 'IL',
  shipZipCode: '62701',
  shipCountry: 'United States',
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

  it('maps the delivery address the order recorded', () => {
    expect(toPurchase(apiPurchase).shippingAddress).toEqual({
      name: 'Ada Lovelace',
      phone: '+14155552671',
      address: '1 Test Street',
      city: 'Springfield',
      state: 'IL',
      zipCode: '62701',
      country: 'United States',
    });
  });

  /**
   * Orders placed before deliveries were recorded have none. Null says that;
   * an object of empty strings would read as a blank address.
   */
  it('reports no address for an order placed before they were recorded', () => {
    expect(toPurchase({ ...apiPurchase, shipName: null }).shippingAddress).toBeNull();
  });
});

describe('toPlacePurchaseError', () => {
  /**
   * The axios response interceptor rejects with `error.response.data`, so this is
   * the shape that actually reaches the caller. The previous version of this test
   * built an AxiosError, which never occurs at runtime — it passed while the code
   * classified every failure as generic.
   */
  const rejected = (statusCode: number, extra: Record<string, unknown> = {}) => ({
    statusCode,
    error: 'X',
    message: 'something happened',
    ...extra,
  });

  it('reads a stock conflict out of a 409, with the line that caused it', () => {
    const error = toPlacePurchaseError(
      rejected(409, {
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
      rejected(402, { message: 'Payment was declined: card declined by the issuer' })
    );

    expect(error.kind).toBe('payment');
    expect(error.conflict).toBeUndefined();
  });

  it('separates stock from payment, since only one of them is worth retrying', () => {
    const stock = toPlacePurchaseError(
      rejected(409, { sku: 'RS-001', message: 'Not enough stock for RS-001' })
    );
    const payment = toPlacePurchaseError(rejected(402, { message: 'Payment was declined' }));

    expect(stock.kind).toBe('stock');
    expect(payment.kind).toBe('payment');
    expect(stock.conflict).toBeDefined();
    expect(payment.conflict).toBeUndefined();
  });

  it('falls back to a connection message when the rejection is not an API body', () => {
    const error = toPlacePurchaseError('Something went wrong!');

    expect(error.kind).toBe('unknown');
    expect(error.message).toContain('connection');
  });

  it('is a real Error, so rejection handling and stacks behave', () => {
    expect(toPlacePurchaseError(rejected(402))).toBeInstanceOf(Error);
  });

  it('treats an unmapped status as generic rather than guessing', () => {
    expect(toPlacePurchaseError(rejected(500)).kind).toBe('unknown');
  });
});
