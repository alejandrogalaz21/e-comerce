import { test, expect } from '@playwright/test';

import type { Page, APIRequestContext } from '@playwright/test';

import { API_URL, deleteProducts, createAuthenticatedApiContext } from './support/auth';

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

async function addToCartAndOpenCheckout(page: Page, id: string): Promise<void> {
  await page.goto(`/product/${id}`);

  await page.evaluate(() => window.localStorage.removeItem('app-checkout'));
  await page.reload();

  const addToCart = page.getByRole('button', { name: 'Add to cart' });
  await expect(addToCart).toBeEnabled();
  await addToCart.click();

  await page.goto('/product/checkout');
  await expect(page.getByRole('button', { name: 'Check out' })).toBeEnabled();
}

async function fillDeliveryAddress(page: Page): Promise<void> {
  const deliver = page.getByRole('button', { name: 'Deliver to this address' });

  if (!(await deliver.count())) {
    await page.getByRole('button', { name: 'Add address' }).click();

    await page.getByLabel('Full name').fill('Test Buyer');
    await page.getByPlaceholder('Enter phone number').fill('+14155552671');
    await page.getByLabel('Email').fill('test.buyer@example.com');
    await page.getByLabel('Address', { exact: true }).fill('1 Test Street');
    await page.getByLabel('Town/city').fill('Springfield');
    await page.getByLabel('State').fill('IL');
    await page.getByLabel('Zip/code').fill('62701');

    const country = page.getByPlaceholder('Choose a country');
    await country.click();
    await country.fill('United States');
    await page.getByRole('option').first().click();

    await page.getByRole('button', { name: 'Deliver to this address' }).click();
    return;
  }

  await deliver.first().click();
}

async function completeOrder(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Check out' }).click();

  await fillDeliveryAddress(page);

  await page.getByText('Credit / Debit card', { exact: true }).click();

  await expect(page.getByRole('button', { name: 'Complete order' })).toBeVisible();
  await page.getByRole('button', { name: 'Complete order' }).click();
}

const ORDERS_ENDPOINT = /\/api\/v1\/orders$/;

const confirmation = (page: Page) => page.getByText('Thank you for your purchase!');
const declineAlert = (page: Page) => page.getByText('Payment declined');

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

  test('a line that sold out while the cart sat there blocks the order', async ({ page }) => {
    const scarceName = `Scarce Product ${runId}`;
    const scarceId = await createProduct({
      sku: `SCARCE-${runId}`,
      name: scarceName,
      stock: 1,
    });

    await addToCartAndOpenCheckout(page, scarceId);

    await setStock(scarceId, 0);

    await page.getByRole('button', { name: 'Check out' }).click();
    await fillDeliveryAddress(page);

    await expect(page.getByText('Remove what cannot be bought to continue')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Complete order' })).toBeDisabled();
    await expect(confirmation(page)).toBeHidden();

    expect(await stockOf(scarceId)).toBe(0);
  });

  test('the blocked cart reads as a cart problem, not a declined card', async ({ page }) => {
    const outName = `Sold Out Product ${runId}`;
    const outId = await createProduct({ sku: `OUT-${runId}`, name: outName, stock: 3 });

    await addToCartAndOpenCheckout(page, outId);
    await setStock(outId, 0);

    await page.getByRole('button', { name: 'Check out' }).click();
    await fillDeliveryAddress(page);

    await expect(page.getByText('Remove what cannot be bought to continue')).toBeVisible();
    await expect(declineAlert(page)).toBeHidden();
  });

  test('the confirm button is disabled while the request is in flight', async ({ page }) => {
    await addToCartAndOpenCheckout(page, productId);

    await page.getByRole('button', { name: 'Check out' }).click();
    await fillDeliveryAddress(page);
    await page.getByText('Credit / Debit card', { exact: true }).click();

    await page.route(ORDERS_ENDPOINT, async (route) => {
      await new Promise((resolve) => {
        setTimeout(resolve, 2000);
      });
      await route.continue();
    });

    const confirm = page.getByRole('button', { name: 'Complete order' });
    await confirm.click();

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

  test('the purchase shows up in the orders dashboard with its lines and total', async ({
    page,
  }) => {
    const res = await api.get('/api/v1/orders', { params: { page: 1, limit: 50 } });
    const body = (await res.json()) as {
      data: {
        id: string;
        status: string;
        totalAmount: string;
        idempotencyKey: string;
        paymentReference: string | null;
        items: { sku: string; name: string; quantity: number }[];
      }[];
    };

    const order = body.data.find(
      (candidate) => candidate.status === 'PAID' && candidate.items.some((i) => i.sku === sku)
    );

    expect(order, 'the earlier tests must have left a paid order behind').toBeTruthy();
    if (!order) return;

    await page.goto('/dashboard/order');

    const shortId = order.id.slice(0, 8);
    await expect(page.getByText(shortId).first()).toBeVisible();

    await page.goto(`/dashboard/order/${order.id}`);

    await expect(page.getByText(sku).first()).toBeVisible();
    await expect(page.getByText(productName).first()).toBeVisible();

    await expect(page.getByText(order.idempotencyKey)).toBeVisible();
    if (order.paymentReference) {
      await expect(page.getByText(order.paymentReference)).toBeVisible();
    }
  });

  test('an order that does not exist says so instead of rendering nothing', async ({ page }) => {
    await page.goto('/dashboard/order/00000000-0000-4000-8000-000000000000');

    await expect(page.getByText('Order not found')).toBeVisible();
  });

  test('the stock the shop shows drops as soon as something is bought', async ({ page }) => {
    const stockOf = async (): Promise<number> => {
      const res = await api.get('/api/v1/products', { params: { page: 1, limit: 100 } });
      const body = (await res.json()) as { data: { id: string; stock: number }[] };
      return body.data.find((product) => product.id === productId)!.stock;
    };

    const before = await stockOf();

    await buyUntilApproved(page, productId);

    expect(await stockOf()).toBeLessThan(before);
  });

  test('searching the orders table filters across every page, not just the visible one', async ({
    page,
  }) => {
    await page.goto('/dashboard/order');

    const search = page.getByPlaceholder(
      'Order id, delivery details, SKU or product, then Enter...'
    );
    await search.fill(sku);
    await search.press('Enter');

    await expect(page).toHaveURL(new RegExp(`q=${sku}`));

    await expect(page.getByText('No orders match these filters')).toBeHidden();
    await expect(page.getByRole('row').filter({ hasText: 'PAID' }).first()).toBeVisible();

    await search.fill('NO-SUCH-ORDER-ANYWHERE');
    await search.press('Enter');

    await expect(page.getByText('No orders match these filters')).toBeVisible();
  });
});
