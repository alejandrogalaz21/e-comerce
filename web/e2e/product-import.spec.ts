import { test, expect } from '@playwright/test';

import type { Page } from '@playwright/test';

import { deleteAllProducts, createAuthenticatedApiContext } from './support/auth';

const CSV_FIXTURE = 'e2e/fixtures/loanpro-sample.csv';
const TXT_FIXTURE = 'e2e/fixtures/not-a-csv.txt';

test.describe.configure({ mode: 'serial' });

function statCard(page: Page, label: string) {
  return page
    .getByTestId('import-summary')
    .locator('.MuiCard-root')
    .filter({ has: page.getByText(label, { exact: true }) });
}

async function expectStat(page: Page, label: string, value: number) {
  await expect(statCard(page, label).getByRole('heading')).toHaveText(String(value));
}

test.beforeAll(async () => {
  // Wipe all products so the import numbers are deterministic regardless of prior runs.
  const api = await createAuthenticatedApiContext();

  // Products that appear in an order cannot be deleted — the RESTRICT foreign key
  // refuses, which is correct. What matters for the import numbers is that no SKU
  // from the fixture survives, and those are never bought by the suite.
  const undeletable = await deleteAllProducts(api);

  const check = await api.get('/api/v1/products', { params: { page: 1, limit: 100 } });
  const checkBody = (await check.json()) as { data: unknown[] };
  expect(checkBody.data).toHaveLength(undeletable.length);

  await api.dispose();
});

test.describe('product CSV import', () => {
  test('import page reachable from product list', async ({ page }) => {
    await page.goto('/dashboard/product');

    await page.getByRole('link', { name: 'Import CSV' }).click();

    await expect(page).toHaveURL(/\/dashboard\/product\/import$/);
    await expect(page.getByRole('heading', { name: 'Import CSV' })).toBeVisible();
    await expect(page.getByText('Upload file')).toBeVisible();
    await expect(page.getByText('Allowed *.csv files up to 5MB')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Import' })).toBeDisabled();
  });

  test('imports the real challenge CSV and shows the batch report', async ({ page }) => {
    await page.goto('/dashboard/product/import');

    await page.locator('input[type=file]').setInputFiles(CSV_FIXTURE);

    const importButton = page.getByRole('button', { name: 'Import' });
    await expect(importButton).toBeEnabled();
    await importButton.click();

    // The summary cards render once the batch finishes.
    await expect(page.getByText('Total rows')).toBeVisible({ timeout: 30_000 });

    await expectStat(page, 'Total rows', 97);
    await expectStat(page, 'Created', 85);
    await expectStat(page, 'Updated', 0);
    await expectStat(page, 'Unchanged', 0);
    await expectStat(page, 'Rejected', 10);
    await expectStat(page, 'Skipped empty', 2);

    // Issues table: 5 rows rejected by validation plus the 5 occurrences of the two
    // duplicated skus (lines 2/36 RS-001 and 11/56/89 BS-021). Nothing is updated,
    // because a duplicate sku is rejected instead of overwriting.
    // Ten rejected plus the two blank rows, which are now listed instead of only counted.
    const issues = page.getByTestId('import-issues');
    await expect(issues.getByText('Rows to review (12)')).toBeVisible();
    await expect(issues.locator('tbody tr')).toHaveCount(12);
    await expect(issues.locator('tbody tr').filter({ hasText: 'Skipped row' })).toHaveCount(2);
    await expect(issues.locator('tbody tr').filter({ hasText: 'Rejected row' })).toHaveCount(10);
    await expect(issues.locator('tbody tr').filter({ hasText: 'Updated row' })).toHaveCount(0);

    const line7 = issues
      .locator('tbody tr')
      .filter({ has: page.getByRole('cell', { name: '7', exact: true }) });
    await expect(line7).toContainText("price is not a valid number: 'free'");
    await expect(line7).toContainText('Rejected row');

    const line16 = issues
      .locator('tbody tr')
      .filter({ has: page.getByRole('cell', { name: '16', exact: true }) });
    await expect(line16).toContainText('stock must not be less than 0');

    const line20 = issues
      .locator('tbody tr')
      .filter({ has: page.getByRole('cell', { name: '20', exact: true }) });
    await expect(line20).toContainText('name contains invalid content: HTML markup is not allowed');

    const line36 = issues
      .locator('tbody tr')
      .filter({ has: page.getByRole('cell', { name: '36', exact: true }) });
    await expect(line36).toContainText('RS-001');
    await expect(line36).toContainText('Rejected row');
    await expect(line36).toContainText('duplicate sku in the file');

    // Created rows table: one row per inserted product.
    const created = page.getByTestId('import-created');
    await expect(created.getByText('Created rows (85)')).toBeVisible();
    await expect(created.locator('tbody tr')).toHaveCount(85);
    // RS-001 heads the file but is rejected as a duplicate, so the first created
    // row is line 3. Its cells carry the stored, normalized values.
    const firstCreated = created.locator('tbody tr').first();
    await expect(firstCreated).toContainText('CB-010');
    await expect(firstCreated).toContainText('Organic Coffee Beans');
    await expect(firstCreated).toContainText('Food & Beverage');
    await expect(created.locator('tbody tr').filter({ hasText: 'RS-001' })).toHaveCount(0);

    await expect(page.getByRole('button', { name: 'Import another file' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Go to products' })).toBeVisible();
  });

  test('imported products visible in the product list', async ({ page }) => {
    await page.goto('/dashboard/product/import');

    await page.locator('input[type=file]').setInputFiles(CSV_FIXTURE);
    await page.getByRole('button', { name: 'Import' }).click();
    await expect(page.getByText('Total rows')).toBeVisible({ timeout: 30_000 });

    // Second import over the same data: everything already exists, nothing new.
    await expectStat(page, 'Created', 0);

    await page.getByRole('link', { name: 'Go to products' }).click();
    await expect(page).toHaveURL(/\/dashboard\/product$/);

    const grid = page.getByRole('grid');
    await expect(grid).toBeVisible();

    // 85 products imported into an empty catalog.
    await expect(page.getByText(/of 85/)).toBeVisible({ timeout: 15_000 });

    // The grid virtualizes its rows, so paging through 85 of them only proves what
    // happens to fit the viewport. Ask the server for each sku instead: the list
    // state lives in the URL, so a query param is the same code path as typing.
    // RS-001 is rejected as a duplicate sku, so the only 'Running Shoes' in the
    // catalog is RS-050 — the row the import created from line 55.
    for (const [sku, name] of [
      ['RS-050', 'Running Shoes'],
      ['CB-010', 'Organic Coffee Beans'],
    ]) {
      await page.goto(`/dashboard/product?q=${sku}`);
      await expect(page.getByTestId('filters-result-total')).toHaveText('1');
      await expect(grid.getByText(name, { exact: true }).first()).toBeVisible();
    }
  });

  test('rejects a non-CSV file', async ({ page }) => {
    await page.goto('/dashboard/product/import');

    await page.locator('input[type=file]').setInputFiles(TXT_FIXTURE);

    // react-dropzone filters by accept (*.csv), so the file lands in the
    // rejection list and the Import button never enables.
    await expect(page.getByText('not-a-csv.txt', { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Import' })).toBeDisabled();
  });
});
