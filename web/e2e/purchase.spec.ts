import { test, expect } from '@playwright/test';

import type { Page, APIRequestContext } from '@playwright/test';

import { API_URL, deleteProducts, createAuthenticatedApiContext } from './support/auth';

/**
 * The purchase flow in a browser. Everything here goes through the real API, so
 * the fake payment provider is live and declines roughly one charge in ten.
 *
 * A test that simply buys would fail ~10% of runs, which would be the suite
 * lying rather than the system misbehaving. So the happy paths retry a bounded
 * number of times — a decline is a legitimate outcome and retrying is exactly
 * what the UI tells the customer to do — while the decline itself is forced by
 * intercepting the response, which keeps it deterministic.
 *
 * The file is named to sort last on purpose. Buying leaves permanent residue:
 * a product that appears in an order cannot be deleted, by design, so any spec
 * that counts the catalog must run before this one.
 */

const runId = Date.now();
const STOCK = 40;

test.describe.configure({ mode: 'serial' });

let api: APIRequestContext;
let productId: string;
const createdIds: string[] = [];

const sku = `CHK-${runId}`;
const productName = `Checkout Product ${runId}`;

async function createProduct(
  overrides: Partial<{ sku: string; name: string; stock: number; price: number }> = {}
): Promise<string> {
  const res = await api.post('/api/v1/products', {
    data: {
      sku: overrides.sku ?? sku,
      name: overrides.name ?? productName,
      category: 'E2E Checkout',
      price: overrides.price ?? 12.5,
      stock: overrides.stock ?? STOCK,
    },
  });

  if (!res.ok()) {
    throw new Error(`Product creation failed with status ${res.status()}`);
  }

  const body = (await res.json()) as { id: string };
  createdIds.push(body.id);

  return body.id;
}

async function stockOf(id: string): Promise<number> {
  const res = await api.get(`/api/v1/products/${id}`);
  const body = (await res.json()) as { stock: number };

  return body.stock;
}

async function setStock(id: string, stock: number): Promise<void> {
  await api.patch(`/api/v1/products/${id}`, { data: { stock } });
}

/**
 * Adds the product to the cart from its detail page and lands on the cart step.
 * The shop grid's add button is a hover-revealed Fab; the detail page has an
 * explicit "Add to cart", which is both the realistic journey and a stable target.
 */
async function addToCartAndOpenCheckout(page: Page, id: string): Promise<void> {
  await page.goto(`/product/${id}`);

  // A finished checkout stays completed in storage and would otherwise show the
  // confirmation instead of the cart on the next run through.
  await page.evaluate(() => window.localStorage.removeItem('app-checkout'));
  await page.reload();

  const addToCart = page.getByRole('button', { name: 'Add to cart' });
  await expect(addToCart).toBeEnabled();
  await addToCart.click();

  await page.goto('/product/checkout');
  await expect(page.getByRole('button', { name: 'Check out' })).toBeEnabled();
}

/** Walks cart -> billing -> payment and presses Complete order once. */
async function completeOrder(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Check out' }).click();

  await page.getByRole('button', { name: 'Deliver to this address' }).first().click();

  // The payment method is required by the form schema; without it the submit
  // never reaches the API.
  await page.getByText('Cash', { exact: false }).first().click();

  await expect(page.getByRole('button', { name: 'Complete order' })).toBeVisible();
  await page.getByRole('button', { name: 'Complete order' }).click();
}

const ORDERS_ENDPOINT = /\/api\/v1\/orders$/;

const confirmation = (page: Page) => page.getByText('Thank you for your purchase!');
const declineAlert = (page: Page) => page.getByText('Payment declined');

/**
 * Buys until the charge is approved. Each attempt is a fresh checkout, which is
 * also what the app does: a decline closes that idempotency key.
 */
async function buyUntilApproved(page: Page, id: string, attempts = 6): Promise<void> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    // eslint-disable-next-line no-await-in-loop
    await addToCartAndOpenCheckout(page, id);
    // eslint-disable-next-line no-await-in-loop
    await completeOrder(page);

    // eslint-disable-next-line no-await-in-loop
    const approved = await confirmation(page)
      .waitFor({ timeout: 10_000 })
      .then(() => true)
      .catch(() => false);

    if (approved) return;

    // eslint-disable-next-line no-await-in-loop
    await expect(declineAlert(page)).toBeVisible();
  }

  throw new Error(`The charge was declined ${attempts} times in a row, which is implausible`);
}

test.beforeAll(async () => {
  api = await createAuthenticatedApiContext();
  productId = await createProduct();
});

test.afterAll(async () => {
  await deleteProducts(api, createdIds);
  await api.dispose();
});

test.describe('checkout', () => {
  test('completes a purchase and shows the order with its lines and total', async ({ page }) => {
    const before = await stockOf(productId);

    await buyUntilApproved(page, productId);

    await expect(confirmation(page)).toBeVisible();
    await expect(page.getByText(sku)).toBeVisible();
    await expect(page.getByText('Total')).toBeVisible();

    expect(await stockOf(productId)).toBe(before - 1);
  });

  test('a declined charge is presented as retryable and touches nothing', async ({ page }) => {
    const before = await stockOf(productId);

    await addToCartAndOpenCheckout(page, productId);

    // The provider declines about one charge in ten at random. Forcing the
    // response makes this deterministic and keeps the test on the layer it is
    // meant to cover: how the browser presents a decline. That the catalog is
    // actually rolled back is proven against a real database in
    // orders.concurrency.spec.ts.
    await page.route(ORDERS_ENDPOINT, (route) =>
      route.fulfill({
        status: 402,
        contentType: 'application/json',
        body: JSON.stringify({
          statusCode: 402,
          error: 'PAYMENT_DECLINED',
          message: 'Payment was declined: card declined by the issuer',
          path: '/api/v1/orders',
          timestamp: new Date().toISOString(),
        }),
      })
    );

    await completeOrder(page);

    await expect(declineAlert(page)).toBeVisible();
    await expect(page.getByText(/try again/i)).toBeVisible();
    await expect(confirmation(page)).toBeHidden();

    await page.unroute(ORDERS_ENDPOINT);

    expect(await stockOf(productId)).toBe(before);
  });

  test('not enough stock names the line and does not create an order', async ({ page }) => {
    const scarceName = `Scarce Product ${runId}`;
    const scarceId = await createProduct({
      sku: `SCARCE-${runId}`,
      name: scarceName,
      stock: 1,
    });

    await addToCartAndOpenCheckout(page, scarceId);

    // Sold out between adding to the cart and confirming — the race the stock
    // check exists for.
    await setStock(scarceId, 0);

    await completeOrder(page);

    await expect(page.getByText('Not enough stock')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Edit cart' })).toBeVisible();
    await expect(confirmation(page)).toBeHidden();

    expect(await stockOf(scarceId)).toBe(0);
  });

  test('a stock conflict reads differently from a declined payment', async ({ page }) => {
    const outName = `Sold Out Product ${runId}`;
    const outId = await createProduct({ sku: `OUT-${runId}`, name: outName, stock: 3 });

    await addToCartAndOpenCheckout(page, outId);
    await setStock(outId, 0);
    await completeOrder(page);

    // The two failures need different answers, so they must not share a message.
    await expect(page.getByText('Not enough stock')).toBeVisible();
    await expect(declineAlert(page)).toBeHidden();
  });

  test('the confirm button is disabled while the request is in flight', async ({ page }) => {
    await addToCartAndOpenCheckout(page, productId);

    await page.getByRole('button', { name: 'Check out' }).click();
    await page.getByRole('button', { name: 'Deliver to this address' }).first().click();
    await page.getByText('Cash', { exact: false }).first().click();

    // Hold the response so the in-flight state is observable rather than a race.
    await page.route(ORDERS_ENDPOINT, async (route) => {
      await new Promise((resolve) => {
        setTimeout(resolve, 2000);
      });
      await route.continue();
    });

    const confirm = page.getByRole('button', { name: 'Complete order' });
    await confirm.click();

    // A second press must not reach the API: one checkout, one order.
    await expect(confirm).toBeDisabled();

    await page.unroute(ORDERS_ENDPOINT);
  });

  test('buying is public: an anonymous visitor can complete an order', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();

    try {
      await buyUntilApproved(page, productId);
      await expect(confirmation(page)).toBeVisible();
    } finally {
      await context.close();
    }
  });

  test('the order reached the API and is readable by an administrator', async () => {
    const res = await api.get('/api/v1/orders', { params: { page: 1, limit: 20 } });

    expect(res.status()).toBe(200);

    const body = (await res.json()) as {
      data: { status: string; totalAmount: string; items: { sku: string }[] }[];
    };
    const mine = body.data.filter((order) => order.items.some((item) => item.sku === sku));

    expect(mine.length).toBeGreaterThan(0);
    expect(mine.every((order) => ['PAID', 'FAILED'].includes(order.status))).toBe(true);
  });

  test('reading orders without a session is refused', async ({ request: anonymous }) => {
    const res = await anonymous.get(`${API_URL}/api/v1/orders`);

    expect(res.status()).toBe(401);
  });
});
