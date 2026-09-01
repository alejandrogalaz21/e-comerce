import { test, expect } from '@playwright/test';

import type { Page, APIRequestContext } from '@playwright/test';

import { deleteProducts, createAuthenticatedApiContext } from './support/auth';

const runId = Date.now();
const targetSku = `SRCH-${runId}`;
const targetName = `Zzsearchable Product ${runId}`;
const FILLER_COUNT = 14;

test.describe.configure({ mode: 'serial' });

let api: APIRequestContext;
const createdIds: string[] = [];

async function createProduct(sku: string, name: string): Promise<void> {
  const res = await api.post('/api/v1/products', {
    data: { sku, name, category: 'E2E Search', price: 9.99, stock: 5 },
  });

  if (!res.ok()) {
    throw new Error(`Product creation failed with status ${res.status()}`);
  }

  const body = (await res.json()) as { id: string };
  createdIds.push(body.id);
}

function rowBySku(page: Page, value: string) {
  return page.getByRole('row').filter({ hasText: value });
}

test.beforeAll(async () => {
  api = await createAuthenticatedApiContext();

  await createProduct(targetSku, targetName);

  for (let index = 0; index < FILLER_COUNT; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    await createProduct(`FILL-${runId}-${index}`, `Filler Product ${runId} ${index}`);
  }
});

test.afterAll(async () => {
  await deleteProducts(api, createdIds);
  await api.dispose();
});

test.describe('product search', () => {
  test('finds a product that is not on the first page (server-side search)', async ({ page }) => {
    await page.goto('/dashboard/product');

    await expect(rowBySku(page, targetSku)).toHaveCount(0);

    await page.getByLabel('Search products').fill(targetSku);
    await page.getByLabel('Search products').press('Enter');

    await expect(rowBySku(page, targetSku)).toHaveCount(1);
    await expect(rowBySku(page, targetSku)).toContainText(targetName);
    await expect(page.getByText('1–1 of 1')).toBeVisible();
  });

  test('shows a search-specific empty state and restores the list when cleared', async ({
    page,
  }) => {
    await page.goto('/dashboard/product');

    const searchBox = page.getByLabel('Search products');

    await searchBox.fill(`no-such-product-${runId}`);
    await searchBox.press('Enter');

    await expect(page.getByText(`No results found for "no-such-product-${runId}"`)).toBeVisible();

    await page
      .locator('.MuiChip-root')
      .filter({ hasText: `no-such-product-${runId}` })
      .locator('.MuiChip-deleteIcon')
      .click();

    await expect(searchBox).toHaveValue('');
    await expect(page.getByRole('row').filter({ hasText: `FILL-${runId}-` })).not.toHaveCount(0);
  });
});
