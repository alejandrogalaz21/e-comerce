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

  await deleteAllProducts(api);

  const check = await api.get('/api/v1/products', { params: { page: 1, limit: 1 } });
  const checkBody = (await check.json()) as { data: unknown[] };
  expect(checkBody.data).toHaveLength(0);

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

    // Issues table: 5 rejected rows plus the 3 duplicate-sku updates, merged and
    // ordered by line (lines 36 RS-001, 56/89 BS-021).
    const issues = page.getByTestId('import-issues');
    await expect(issues.getByText('Rows with issues (8)')).toBeVisible();
    await expect(issues.locator('tbody tr')).toHaveCount(8);
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
    await expect(
      created.locator('tbody tr').filter({ hasText: 'RS-001' }).first()
    ).toContainText('Running Shoes');

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

    // Page through the grid (25 rows per page) until both names have been seen.
    await page.getByRole('combobox', { name: /rows per page/i }).click();
    await page.getByRole('option', { name: '25' }).click();
    await expect(page.getByText(/1–25 of 85/)).toBeVisible();

    const wanted = new Set(['Running Shoes', 'Organic Coffee Beans']);
    const nextPage = page.getByRole('button', { name: 'Go to next page' });

    for (let i = 0; i < 4 && wanted.size > 0; i += 1) {
      for (const name of [...wanted]) {
        const cell = grid.getByText(name, { exact: true }).first();
        if (await cell.isVisible().catch(() => false)) {
          wanted.delete(name);
        }
      }
      if (wanted.size > 0 && (await nextPage.isEnabled())) {
        await nextPage.click();
        await expect(grid.locator('[role="row"]').first()).toBeVisible();
        await page.waitForTimeout(500);
      }
    }

    expect([...wanted], 'product names not found in the grid').toHaveLength(0);
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
