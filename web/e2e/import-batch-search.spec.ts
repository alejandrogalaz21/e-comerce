import { test, expect } from '@playwright/test';

import type { APIRequestContext } from '@playwright/test';

import { deleteProducts, createAuthenticatedApiContext } from './support/auth';

const runId = Date.now();
const FILENAME = `searchable-batch-${runId}.csv`;

test.describe.configure({ mode: 'serial' });

let api: APIRequestContext;
const createdIds: string[] = [];

test.beforeAll(async () => {
  api = await createAuthenticatedApiContext();

  const csv = [
    'name,sku,description,category,price,stock,weight_kg',
    `Batch Search Product ${runId},BSR-${runId},from the batch search spec,E2E Batch,12.50,4,`,
  ].join('\n');

  const res = await api.post('/api/v1/products/import', {
    multipart: {
      file: { name: FILENAME, mimeType: 'text/csv', buffer: Buffer.from(csv) },
    },
  });
  expect(res.ok()).toBeTruthy();

  const created = await api.get('/api/v1/products', { params: { q: `BSR-${runId}`, limit: 1 } });
  const body = (await created.json()) as { data: Array<{ id: string }> };
  createdIds.push(...body.data.map((item) => item.id));
});

test.afterAll(async () => {
  await deleteProducts(api, createdIds);
  await api.dispose();
});

test.describe('import history search', () => {
  test('finds a batch by a fragment of its filename', async ({ page }) => {
    await page.goto('/dashboard/product/import/batches');

    await page.getByLabel('Search import batches').fill(`searchable-batch-${runId}`);

    await expect(page.getByRole('row').filter({ hasText: FILENAME })).toBeVisible();
    await expect(page.locator('.MuiDataGrid-row')).toHaveCount(1);
  });

  test('matches regardless of case', async ({ page }) => {
    await page.goto('/dashboard/product/import/batches');

    await page.getByLabel('Search import batches').fill(`SEARCHABLE-BATCH-${runId}`);

    await expect(page.getByRole('row').filter({ hasText: FILENAME })).toBeVisible();
  });

  test('shows a distinct empty state when nothing matches', async ({ page }) => {
    await page.goto('/dashboard/product/import/batches');

    await page.getByLabel('Search import batches').fill(`no-such-file-${runId}`);

    await expect(page.getByText(`No imports found for "no-such-file-${runId}"`)).toBeVisible();
    await expect(page.getByText('No imports yet')).toBeHidden();
  });

  test('clearing the search brings the history back', async ({ page }) => {
    await page.goto('/dashboard/product/import/batches');

    const search = page.getByLabel('Search import batches');
    await search.fill(`no-such-file-${runId}`);
    await expect(page.getByText(`No imports found for "no-such-file-${runId}"`)).toBeVisible();

    await page.getByRole('button', { name: 'Clear search' }).click();

    await expect(page.getByRole('row').filter({ hasText: FILENAME })).toBeVisible();
  });
});
