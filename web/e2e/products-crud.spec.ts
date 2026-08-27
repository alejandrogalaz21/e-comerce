import { test, expect } from '@playwright/test';

import type { Page } from '@playwright/test';

const runId = Date.now();
const sku = `E2E-${runId}`;
const productName = `E2E Product ${runId}`;
const updatedName = `E2E Product ${runId} Updated`;

test.describe.configure({ mode: 'serial' });

function rowBySku(page: Page, value: string) {
  return page.getByRole('row').filter({ hasText: value });
}

async function openRowActionsMenu(page: Page, value: string) {
  const row = rowBySku(page, value);
  await expect(row).toHaveCount(1);
  await row.getByRole('menuitem', { name: 'more' }).click();
}

test.describe('products CRUD', () => {
  test('validation: empty form shows required errors and does not navigate', async ({ page }) => {
    await page.goto('/dashboard/product/new');

    await page.getByRole('button', { name: 'Create product' }).click();

    await expect(page.getByText('Name is required!')).toBeVisible();
    await expect(page.getByText('SKU is required!')).toBeVisible();
    await expect(page).toHaveURL(/\/dashboard\/product\/new$/);
  });

  test('create: fills the form and shows the new row in the list', async ({ page }) => {
    await page.goto('/dashboard/product/new');

    await page.locator('input[name="name"]').fill(productName);
    await page.locator('input[name="sku"]').fill(sku);
    await page.locator('textarea[name="description"]').first().fill('Created by Playwright e2e run');
    await page.locator('input[name="category"]').fill('E2E');
    await page.locator('input[name="price"]').fill('49.99');
    await page.locator('input[name="stock"]').fill('25');
    await page.locator('input[name="weightKg"]').fill('1.5');

    await page.getByRole('button', { name: 'Create product' }).click();

    await expect(page).toHaveURL(/\/dashboard\/product$/);
    await expect(rowBySku(page, sku)).toHaveCount(1);
    await expect(rowBySku(page, sku)).toContainText(productName);
  });

  test('edit: renames the product from the row actions menu', async ({ page }) => {
    await page.goto('/dashboard/product');

    await openRowActionsMenu(page, sku);
    await page.getByRole('menuitem', { name: 'Edit' }).click();

    await expect(page).toHaveURL(/\/dashboard\/product\/.+\/edit$/);
    await expect(page.locator('input[name="sku"]')).toHaveValue(sku);

    await page.locator('input[name="name"]').fill(updatedName);
    await page.getByRole('button', { name: 'Save changes' }).click();

    await expect(page).toHaveURL(/\/dashboard\/product$/);
    await expect(rowBySku(page, sku)).toContainText(updatedName);
  });

  test('shop: renders the product grid with products from the database', async ({ page }) => {
    await page.goto('/product');

    await expect(page.getByRole('heading', { name: 'Shop' })).toBeVisible();
    await expect(page.locator('a[href*="/product/"]').first()).toBeVisible();
    await expect(page.getByRole('link', { name: updatedName })).toBeVisible();
  });

  test('delete: removes the product through the confirm dialog', async ({ page }) => {
    await page.goto('/dashboard/product');

    await openRowActionsMenu(page, sku);
    await page.getByRole('menuitem', { name: 'Delete' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('Are you sure want to delete');
    await dialog.getByRole('button', { name: 'Delete' }).click();

    await expect(rowBySku(page, sku)).toHaveCount(0);
  });
});
