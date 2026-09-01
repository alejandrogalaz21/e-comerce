import { test, expect } from '@playwright/test';

import type { Page, APIRequestContext } from '@playwright/test';

import { deleteProducts, createAuthenticatedApiContext } from './support/auth';

const runId = Date.now();

test.describe.configure({ mode: 'serial' });

let api: APIRequestContext;
const createdIds: string[] = [];

async function createProduct(suffix: string, price = 20): Promise<string> {
  const res = await api.post('/api/v1/products', {
    data: {
      sku: `LIFE-${runId}-${suffix}`,
      name: `Lifecycle ${runId} ${suffix}`,
      category: 'E2E Lifecycle',
      price,
      stock: 10,
    },
  });

  if (!res.ok()) {
    throw new Error(`Product creation failed with status ${res.status()}`);
  }

  const body = (await res.json()) as { id: string };
  createdIds.push(body.id);

  return body.id;
}

function rowBySku(page: Page, sku: string) {
  return page.getByRole('row').filter({ hasText: sku });
}

async function openRowActionsMenu(page: Page, sku: string) {
  const row = rowBySku(page, sku);
  await expect(row).toHaveCount(1);
  await row.getByRole('menuitem', { name: 'more' }).click();
}

test.beforeAll(async () => {
  api = await createAuthenticatedApiContext();
});

test.afterAll(async () => {
  await deleteProducts(api, createdIds);
  await api.dispose();
});

test.describe('product lifecycle', () => {
  test('discontinuing a sold product takes it off the shop and leaves it restorable', async ({
    page,
  }) => {
    const id = await createProduct('SOLD');
    const sku = `LIFE-${runId}-SOLD`;

    await page.goto(`/dashboard/product?q=${sku}`);
    await openRowActionsMenu(page, sku);
    await page.getByRole('menuitem', { name: 'Take off the catalog' }).click();

    await expect(rowBySku(page, sku)).toHaveCount(0);

    await page.goto(`/product/${id}`);
    await expect(page.getByRole('button', { name: 'Add to cart' })).toHaveCount(0);

    await page.goto(`/dashboard/product?status=discontinued&q=${sku}`);
    await expect(rowBySku(page, sku)).toContainText('Discontinued');

    await openRowActionsMenu(page, sku);
    await page.getByRole('menuitem', { name: 'Put back on sale' }).click();

    await page.goto(`/dashboard/product?q=${sku}`);
    await expect(rowBySku(page, sku)).toContainText('On sale');

    await page.goto(`/product/${id}`);
    await expect(page.getByRole('button', { name: 'Add to cart' })).toBeEnabled();
  });

  test('a discontinued product in an open cart blocks the checkout', async ({ page }) => {
    const id = await createProduct('CART');

    await page.goto(`/product/${id}`);
    await page.evaluate(() => window.localStorage.removeItem('app-checkout'));
    await page.reload();
    await page.getByRole('button', { name: 'Add to cart' }).click();

    const discontinued = await api.patch(`/api/v1/products/${id}/discontinue`);
    expect(discontinued.ok()).toBe(true);

    await page.goto('/product/checkout');

    await expect(page.getByText('1 product changed since you added it.')).toBeVisible();
    await expect(page.getByText('Remove what cannot be bought to continue.')).toBeVisible();
    await expect(page.getByText('No longer available — remove it to continue')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Check out' })).toBeDisabled();

    await api.patch(`/api/v1/products/${id}/restore`);
  });

  test('the detail shows the history after the price changes', async ({ page }) => {
    const id = await createProduct('HISTORY', 20);

    const updated = await api.patch(`/api/v1/products/${id}`, { data: { price: 33.5 } });
    expect(updated.ok()).toBe(true);

    await page.goto(`/dashboard/product/${id}`);

    const history = page.getByText('History', { exact: true });
    await expect(history).toBeVisible();

    await expect(page.getByText('Created')).toBeVisible();
    await expect(page.getByText('Changed')).toBeVisible();
    await expect(page.getByText('price:')).toBeVisible();
    await expect(page.getByText('20.00')).toBeVisible();
    await expect(page.getByText('33.50')).toBeVisible();
  });
});
