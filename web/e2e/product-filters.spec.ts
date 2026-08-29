import { test, expect } from '@playwright/test';

import type { Page, APIRequestContext } from '@playwright/test';

import { deleteProducts, createAuthenticatedApiContext } from './support/auth';

const runId = Date.now();
const CATEGORY = `E2E Filters ${runId}`;
const PRODUCT_COUNT = 14;

test.describe.configure({ mode: 'serial' });

let api: APIRequestContext;
const createdIds: string[] = [];

/** Prices climb with the index, so the cheapest product is also the oldest one. */
function priceFor(index: number): number {
  return 10 + index * 5;
}

function skuFor(index: number): string {
  return `FLT-${runId}-${index}`;
}

async function createProduct(index: number): Promise<void> {
  const res = await api.post('/api/v1/products', {
    data: {
      sku: skuFor(index),
      name: `Filter Product ${runId} ${index}`,
      category: CATEGORY,
      price: priceFor(index),
      stock: index === 0 ? 0 : 10,
    },
  });

  if (!res.ok()) {
    throw new Error(`Product creation failed with status ${res.status()}`);
  }

  const body = (await res.json()) as { id: string };
  createdIds.push(body.id);
}

async function selectCategory(page: Page): Promise<void> {
  await page.getByRole('combobox', { name: 'Category' }).click();
  await page.getByRole('option', { name: new RegExp(CATEGORY) }).click();
  await page.keyboard.press('Escape');
}

function firstDataRow(page: Page) {
  return page.locator('.MuiDataGrid-row').first();
}

function totalResults(page: Page) {
  return page.getByTestId('filters-result-total');
}

/** Reads the parsed value so the assertion does not depend on how spaces are encoded. */
function categoryParam(page: Page): string | null {
  return new URL(page.url()).searchParams.get('category');
}

test.beforeAll(async () => {
  api = await createAuthenticatedApiContext();

  for (let index = 0; index < PRODUCT_COUNT; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    await createProduct(index);
  }
});

test.afterAll(async () => {
  await deleteProducts(api, createdIds);
  await api.dispose();
});

test.describe('product list filters', () => {
  test('sorting spans the whole result set, not the visible page', async ({ page }) => {
    await page.goto(`/dashboard/product?category=${encodeURIComponent(CATEGORY)}`);

    await expect(page.getByRole('columnheader', { name: 'Updated at' })).toBeVisible();

    // The cheapest product was created first, so default ordering pushes it off page one.
    await expect(firstDataRow(page)).not.toContainText(skuFor(0));

    await page.goto(
      `/dashboard/product?category=${encodeURIComponent(CATEGORY)}&sortBy=price&sortDir=asc`
    );

    await expect(firstDataRow(page)).toContainText(skuFor(0));
  });

  test('filters by category and price range and shows them as removable chips', async ({
    page,
  }) => {
    await page.goto('/dashboard/product');

    await selectCategory(page);

    await expect(totalResults(page)).toHaveText(String(PRODUCT_COUNT));
    expect(categoryParam(page)).toBe(CATEGORY);

    await page.getByRole('button', { name: 'Price' }).click();
    await page.getByLabel('Minimum price').fill('10');
    await page.getByLabel('Maximum price').fill('20');
    await page.getByRole('button', { name: 'Apply' }).click();

    // Prices 10, 15 and 20 fall inside the range.
    await expect(totalResults(page)).toHaveText('3');

    const priceChip = page.locator('.MuiChip-root').filter({ hasText: '10 - 20' });
    await expect(priceChip).toBeVisible();

    await priceChip.locator('.MuiChip-deleteIcon').click();

    await expect(totalResults(page)).toHaveText(String(PRODUCT_COUNT));
  });

  test('rejects an inverted price range before querying', async ({ page }) => {
    await page.goto('/dashboard/product');

    await page.getByRole('button', { name: 'Price' }).click();
    await page.getByLabel('Minimum price').fill('50');
    await page.getByLabel('Maximum price').fill('10');

    await expect(page.getByText('Max must not be lower than min')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Apply' })).toBeDisabled();
  });

  test('filters sold out products', async ({ page }) => {
    await page.goto(`/dashboard/product?category=${encodeURIComponent(CATEGORY)}&inStock=false`);

    await expect(totalResults(page)).toHaveText('1');
    await expect(firstDataRow(page)).toContainText(skuFor(0));
  });

  test('the view survives a reload and the back button', async ({ page }) => {
    await page.goto('/dashboard/product');

    await selectCategory(page);
    await expect(totalResults(page)).toHaveText(String(PRODUCT_COUNT));

    await page.reload();

    await expect(totalResults(page)).toHaveText(String(PRODUCT_COUNT));
    expect(categoryParam(page)).toBe(CATEGORY);

    await page.goBack();

    await expect(page).not.toHaveURL(/category=/);
    await expect(totalResults(page)).toBeHidden();
  });

  test('an upsert surfaces the row when sorting by updated date', async ({ page }) => {
    const target = skuFor(3);

    const before = await api.get('/api/v1/products', { params: { q: target, limit: 1 } });
    const beforeBody = (await before.json()) as {
      data: Array<{ id: string; createdAt: string; updatedAt: string }>;
    };
    const product = beforeBody.data[0];

    const csv = [
      'name,sku,description,category,price,stock,weight_kg',
      `Filter Product ${runId} 3,${target},reimported,${CATEGORY},99.99,10,`,
    ].join('\n');

    const upload = await api.post('/api/v1/products/import', {
      multipart: {
        file: {
          name: `reimport-${runId}.csv`,
          mimeType: 'text/csv',
          buffer: Buffer.from(csv),
        },
      },
    });
    expect(upload.ok()).toBeTruthy();

    const after = await api.get(`/api/v1/products/${product.id}`);
    const afterBody = (await after.json()) as { createdAt: string; updatedAt: string };

    // The upsert must move updatedAt while leaving createdAt untouched: that is exactly
    // why sorting by creation date cannot show what an import touched.
    expect(afterBody.createdAt).toBe(product.createdAt);
    expect(new Date(afterBody.updatedAt).getTime()).toBeGreaterThan(
      new Date(product.updatedAt).getTime()
    );

    await page.goto(
      `/dashboard/product?category=${encodeURIComponent(CATEGORY)}&sortBy=updatedAt&sortDir=desc`
    );

    await expect(firstDataRow(page)).toContainText(target);

    await page.goto(
      `/dashboard/product?category=${encodeURIComponent(CATEGORY)}&sortBy=createdAt&sortDir=desc`
    );

    await expect(firstDataRow(page)).not.toContainText(target);
  });

  test('searches several terms at once and returns the union', async ({ page }) => {
    await page.goto('/dashboard/product');

    const search = page.getByLabel('Search products');

    // Indices 4 and 5 are used because a low index like 1 is a prefix of 10..13,
    // and a substring search would then match five products instead of one.
    await search.fill(skuFor(4));
    await search.press('Enter');
    await expect(totalResults(page)).toHaveText('1');

    await search.fill(skuFor(5));
    await search.press('Enter');

    // Union, not intersection: no product matches both SKUs at once.
    await expect(totalResults(page)).toHaveText('2');
    await expect(page.locator('.MuiDataGrid-row')).toHaveCount(2);

    await page
      .locator('.MuiChip-root')
      .filter({ hasText: skuFor(4) })
      .locator('.MuiChip-deleteIcon')
      .click();

    await expect(totalResults(page)).toHaveText('1');
  });

  test('remembers a resized column across navigation', async ({ page }) => {
    await page.goto('/dashboard/product');

    const header = page.locator('.MuiDataGrid-columnHeader[data-field="name"]');
    const before = await header.boundingBox();

    await page.evaluate(() => {
      window.localStorage.setItem(
        'product-list-columns',
        JSON.stringify({ widths: { name: 420 }, visibility: {} })
      );
    });

    await page.goto('/dashboard/product/import');
    await page.goto('/dashboard/product');

    const after = await header.boundingBox();

    expect(before?.width).toBeTruthy();
    expect(Math.round(after?.width ?? 0)).toBe(420);
  });
});
