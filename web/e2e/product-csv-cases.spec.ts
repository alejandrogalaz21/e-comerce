import { test, expect, request } from '@playwright/test';

import type { Page, Dialog } from '@playwright/test';

const API_URL = 'http://localhost:4000';
const runId = Date.now();
const skuPrefix = `CSV-${runId}`;
const xssSku = `${skuPrefix}-1`;
const freeSku = `${skuPrefix}-2`;
const dupSku = `${skuPrefix}-3`;

test.describe.configure({ mode: 'serial' });

function rowBySku(page: Page, value: string) {
  return page.getByRole('row').filter({ hasText: value });
}

function helperTextFor(page: Page, fieldName: string) {
  return page.locator(
    `.MuiFormControl-root:has([name="${fieldName}"]) .MuiFormHelperText-root`
  );
}

async function fillProductForm(
  page: Page,
  values: { name: string; sku: string; price?: string; stock?: string }
) {
  await page.goto('/dashboard/product/new');
  await page.locator('input[name="name"]').fill(values.name);
  await page.locator('input[name="sku"]').fill(values.sku);
  if (values.price !== undefined) {
    await page.locator('input[name="price"]').fill(values.price);
  }
  if (values.stock !== undefined) {
    await page.locator('input[name="stock"]').fill(values.stock);
  }
}

async function submitForm(page: Page) {
  await page.getByRole('button', { name: 'Create product' }).click();
}

test.afterAll(async () => {
  const api = await request.newContext({ baseURL: API_URL });
  const res = await api.get('/api/v1/products', { params: { page: 1, limit: 100 } });
  if (res.ok()) {
    const body = (await res.json()) as { data: Array<{ id: string; sku: string }> };
    const created = body.data.filter((item) => item.sku.startsWith(skuPrefix));
    await Promise.all(created.map((item) => api.delete(`/api/v1/products/${item.id}`)));
  }
  await api.dispose();
});

test.describe('product CSV edge cases', () => {
  test('HTML markup in name is rejected inline and never executes (CSV line 20)', async ({
    page,
  }) => {
    const dialogs: Dialog[] = [];
    page.on('dialog', async (dialog) => {
      dialogs.push(dialog);
      await dialog.dismiss();
    });

    const createRequests: string[] = [];
    page.on('request', (req) => {
      if (req.method() === 'POST' && req.url().includes('/api/v1/products')) {
        createRequests.push(req.url());
      }
    });

    await fillProductForm(page, {
      name: "<script>alert('xss')</script>Safe Name",
      sku: xssSku,
      price: '10',
      stock: '5',
    });
    await submitForm(page);

    await expect(page.getByText('HTML markup is not allowed!')).toBeVisible();
    await expect(page).toHaveURL(/\/dashboard\/product\/new$/);
    expect(createRequests).toHaveLength(0);
    expect(dialogs).toHaveLength(0);

    await page.goto('/dashboard/product');
    await expect(rowBySku(page, xssSku)).toHaveCount(0);
  });

  test('SQL injection sku is rejected inline and the table survives (CSV line 29)', async ({
    page,
  }) => {
    await fillProductForm(page, {
      name: 'Bobby Tables Product',
      sku: "Robert'); DROP TABLE products;--",
      price: '10',
      stock: '5',
    });
    await submitForm(page);

    await expect(
      page.getByText('SKU can only contain letters, numbers and dashes!')
    ).toBeVisible();
    await expect(page).toHaveURL(/\/dashboard\/product\/new$/);

    await page.goto('/dashboard/product');
    await expect(page.getByRole('grid')).toBeVisible();
  });

  test('whitespace-only name shows required error and sends no request (CSV line 41)', async ({
    page,
  }) => {
    const createRequests: string[] = [];
    page.on('request', (req) => {
      if (req.method() === 'POST' && req.url().includes('/api/v1/products')) {
        createRequests.push(req.url());
      }
    });

    await fillProductForm(page, {
      name: '   ',
      sku: `${skuPrefix}-ws`,
      price: '10',
      stock: '5',
    });
    await submitForm(page);

    await expect(page.getByText('Name is required!')).toBeVisible();
    await expect(page).toHaveURL(/\/dashboard\/product\/new$/);
    expect(createRequests).toHaveLength(0);
  });

  test('negative stock shows inline error (CSV line 16)', async ({ page }) => {
    await fillProductForm(page, {
      name: 'Negative Stock Product',
      sku: `${skuPrefix}-neg`,
      price: '10',
      stock: '-5',
    });
    await submitForm(page);

    await expect(page.getByText('Stock must be 0 or greater!')).toBeVisible();
    await expect(page).toHaveURL(/\/dashboard\/product\/new$/);
  });

  test('free product with price 0 is created and listed (CSV line 47)', async ({ page }) => {
    await fillProductForm(page, {
      name: 'Free Sample Product',
      sku: freeSku,
      price: '0',
      stock: '3',
    });
    await submitForm(page);

    await expect(page).toHaveURL(/\/dashboard\/product$/);
    const row = rowBySku(page, freeSku);
    await expect(row).toHaveCount(1);
    await expect(row).toContainText('$0');
  });

  test('duplicate sku surfaces the server error under the SKU field (CSV lines 3/36)', async ({
    page,
  }) => {
    await fillProductForm(page, {
      name: 'Original Product',
      sku: dupSku,
      price: '15',
      stock: '2',
    });
    await submitForm(page);
    await expect(page).toHaveURL(/\/dashboard\/product$/);
    await expect(rowBySku(page, dupSku)).toHaveCount(1);

    await fillProductForm(page, {
      name: 'Duplicate Product',
      sku: dupSku,
      price: '15',
      stock: '2',
    });
    await submitForm(page);

    await expect(helperTextFor(page, 'sku')).toContainText('already exists');
    await expect(page).toHaveURL(/\/dashboard\/product\/new$/);
  });
});
