import { test, expect } from '@playwright/test';

import type { Page } from '@playwright/test';

import { deleteAllProducts, createAuthenticatedApiContext } from './support/auth';

const CSV_FIXTURE = 'e2e/fixtures/loanpro-sample.csv';

test.describe.configure({ mode: 'serial' });

type ImportSummaryShape = {
  totalRows: number;
  inserted: number;
  updated: number;
  unchanged: number;
  rejected: number;
  skippedEmpty: number;
};

let importSummary: ImportSummaryShape;
let importBatchId: string;

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
  const api = await createAuthenticatedApiContext();

  await deleteAllProducts(api);

  await api.dispose();
});

test.describe('product import batch history', () => {
  test('imports the fixture and navigates to the history via the new button', async ({ page }) => {
    await page.goto('/dashboard/product/import');

    const importResponsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/v1/products/import') && res.request().method() === 'POST'
    );

    await page.locator('input[type=file]').setInputFiles(CSV_FIXTURE);
    await page.getByRole('button', { name: 'Import' }).click();

    const importResponse = await importResponsePromise;
    const importResult = (await importResponse.json()) as {
      batchId: string;
      summary: ImportSummaryShape;
    };
    importSummary = importResult.summary;
    importBatchId = importResult.batchId;

    await expect(page.getByText('Total rows')).toBeVisible({ timeout: 30_000 });

    await page.getByRole('link', { name: 'View in history' }).click();
    await expect(page).toHaveURL(new RegExp(`/dashboard/product/import/batches/${importBatchId}$`));
    await expect(page.getByRole('heading', { name: 'Import report' })).toBeVisible();

    await page.getByRole('link', { name: 'Back to history' }).click();
    await expect(page).toHaveURL(/\/dashboard\/product\/import\/batches$/);
    await expect(page.getByRole('heading', { name: 'Import history' })).toBeVisible();
  });

  test('history list shows the batch row with consistent counters', async ({ page }) => {
    await page.goto('/dashboard/product/import/batches');

    const grid = page.getByRole('grid');
    await expect(grid).toBeVisible();

    const row = grid
      .locator('[role="row"]')
      .filter({ hasText: 'loanpro-sample.csv' })
      .first();
    await expect(row).toBeVisible({ timeout: 15_000 });

    await expect(row).toContainText(/completed/i);
    await expect(row).toContainText(String(importSummary.totalRows));
    await expect(row).toContainText(String(importSummary.inserted));
    await expect(row).toContainText(String(importSummary.rejected));
  });

  test('view report opens the batch detail with summary and rejected rows', async ({ page }) => {
    await page.goto('/dashboard/product/import/batches');

    const grid = page.getByRole('grid');
    await expect(grid).toBeVisible();

    const row = grid
      .locator('[role="row"]')
      .filter({ hasText: 'loanpro-sample.csv' })
      .first();
    await expect(row).toBeVisible({ timeout: 15_000 });

    // The grid re-renders when the background refetch settles, which can swallow
    // the first click on the row action, so retry the click until the URL changes.
    await expect(async () => {
      await row.locator('button[aria-label="View report"]').click();
      await expect(page).toHaveURL(/\/dashboard\/product\/import\/batches\/[0-9a-f-]+$/, {
        timeout: 2_000,
      });
    }).toPass({ timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Import report' })).toBeVisible();

    await expectStat(page, 'Total rows', importSummary.totalRows);
    await expectStat(page, 'Created', importSummary.inserted);
    await expectStat(page, 'Updated', importSummary.updated);
    await expectStat(page, 'Unchanged', importSummary.unchanged);
    await expectStat(page, 'Rejected', importSummary.rejected);
    await expectStat(page, 'Skipped empty', importSummary.skippedEmpty);

    const issues = page.getByTestId('import-issues');
    await expect(
      issues.getByText(
        `Rows to review (${importSummary.rejected + importSummary.updated + importSummary.skippedEmpty})`
      )
    ).toBeVisible();
    await expect(issues.locator('tbody tr').filter({ hasText: 'Rejected row' })).toHaveCount(
      importSummary.rejected
    );

    const line7 = issues
      .locator('tbody tr')
      .filter({ has: page.getByRole('cell', { name: '7', exact: true }) });
    await expect(line7).toContainText("price is not a valid number: 'free'");

    const created = page.getByTestId('import-created');
    await expect(created.getByText(`Created rows (${importSummary.inserted})`)).toBeVisible();
    await expect(created.locator('tbody tr')).toHaveCount(importSummary.inserted);

    await page.getByRole('link', { name: 'Back to history' }).click();
    await expect(page).toHaveURL(/\/dashboard\/product\/import\/batches$/);
    await expect(page.getByRole('heading', { name: 'Import history' })).toBeVisible();
  });
});
